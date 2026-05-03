"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { careActionSchema } from "@/lib/validation";
import { ECONOMY } from "@/lib/config";
import { adjustBalance, awardXp } from "@/lib/currency";
import { computeGrowth } from "@/lib/plant-engine";
import { progressQuests } from "@/lib/quests";
import { trackEvent } from "@/lib/analytics";
import { rateLimit } from "@/lib/rate-limit";
import { notify } from "@/lib/notifications";

async function getMe() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  return session.user.id;
}

async function loadOwnedPlant(userId: string, userPlantId: string) {
  const plant = await prisma.userPlant.findUnique({
    where: { id: userPlantId },
    include: { species: true },
  });
  if (!plant || plant.userId !== userId) throw new Error("NOT_FOUND");
  return plant;
}

export async function waterPlant(input: unknown) {
  const userId = await getMe();
  const { userPlantId } = careActionSchema.parse(input);

  const limit = rateLimit(`water:${userId}`, { capacity: 30, refillPerSec: 0.2 });
  if (!limit.ok) throw new Error("RATE_LIMITED");

  const plant = await loadOwnedPlant(userId, userPlantId);
  const now = Date.now();
  const sinceWater = now - plant.lastWateredAt.getTime();
  if (!plant.isWilted && sinceWater < ECONOMY.care.waterCooldownMs) {
    throw new Error("COOLDOWN");
  }

  const { effectiveAccum, wilted } = computeGrowth(plant);
  if (wilted) throw new Error("WILTED_REVIVE_FIRST");

  await prisma.$transaction(async (tx) => {
    await tx.userPlant.update({
      where: { id: plant.id },
      data: {
        lastWateredAt: new Date(),
        growthMsAccumulated: Math.min(plant.species.baseGrowthMs, effectiveAccum),
        health: Math.min(100, plant.health + 5),
      },
    });
    await tx.careAction.create({
      data: {
        userId,
        userPlantId: plant.id,
        type: "WATER",
        xpGained: ECONOMY.care.waterXp,
        petalsGained: ECONOMY.care.waterPetals,
      },
    });
    if (ECONOMY.care.waterPetals)
      await adjustBalance(userId, "PETALS", ECONOMY.care.waterPetals, "CARE:WATER", { plantId: plant.id }, tx);
    await awardXp(userId, ECONOMY.care.waterXp, "CARE:WATER", tx);
  });

  await progressQuests(userId, "WATER_PLANTS", 1);
  await trackEvent(userId, "plant_water", { plantId: plant.id });
  revalidatePath("/app/garden");
  return { ok: true };
}

export async function fertilizePlant(input: unknown) {
  const userId = await getMe();
  const { userPlantId } = careActionSchema.parse(input);
  const plant = await loadOwnedPlant(userId, userPlantId);

  const now = Date.now();
  if (
    plant.lastFertilizedAt &&
    now - plant.lastFertilizedAt.getTime() < ECONOMY.care.fertilizeCooldownMs
  ) {
    throw new Error("COOLDOWN");
  }

  // Requires a fertilizer consumable
  const item = await prisma.shopItem.findUnique({ where: { sku: "shop_con_fertilizer" } });
  if (!item) throw new Error("NO_ITEM");
  const inv = await prisma.inventoryItem.findUnique({
    where: { userId_shopItemId: { userId, shopItemId: item.id } },
  });
  if (!inv || inv.quantity < 1) throw new Error("NEEDS_FERTILIZER");

  const { effectiveAccum } = computeGrowth(plant);

  await prisma.$transaction(async (tx) => {
    if (inv.quantity === 1) await tx.inventoryItem.delete({ where: { id: inv.id } });
    else await tx.inventoryItem.update({ where: { id: inv.id }, data: { quantity: { decrement: 1 } } });

    await tx.userPlant.update({
      where: { id: plant.id },
      data: {
        lastFertilizedAt: new Date(),
        growthMsAccumulated: Math.min(
          plant.species.baseGrowthMs,
          effectiveAccum + ECONOMY.care.fertilizeBoostMs,
        ),
      },
    });
    await tx.careAction.create({
      data: { userId, userPlantId: plant.id, type: "FERTILIZE", xpGained: ECONOMY.care.fertilizeXp },
    });
    await awardXp(userId, ECONOMY.care.fertilizeXp, "CARE:FERTILIZE", tx);
  });

  await trackEvent(userId, "plant_fertilize", { plantId: plant.id });
  revalidatePath("/app/garden");
  return { ok: true };
}

export async function harvestPlant(input: unknown) {
  const userId = await getMe();
  const { userPlantId } = careActionSchema.parse(input);
  const plant = await loadOwnedPlant(userId, userPlantId);
  if (plant.harvestedAt) throw new Error("ALREADY_HARVESTED");

  const { harvestable } = computeGrowth(plant);
  if (!harvestable) throw new Error("NOT_READY");

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { subscriptionTier: true },
  });
  const multiplier = user.subscriptionTier === "PLUS" ? ECONOMY.plus.petalMultiplier : 1;
  const petals = Math.floor(plant.species.petalsPerHarvest * multiplier);
  const xp = plant.species.xpPerHarvest;

  await prisma.$transaction(async (tx) => {
    await tx.userPlant.update({
      where: { id: plant.id },
      data: { harvestedAt: new Date() },
    });
    // Free up the slot
    await tx.gardenSlot.updateMany({
      where: { userPlantId: plant.id },
      data: { type: "EMPTY", userPlantId: null },
    });
    await tx.careAction.create({
      data: { userId, userPlantId: plant.id, type: "HARVEST", xpGained: xp, petalsGained: petals },
    });
    await adjustBalance(userId, "PETALS", petals, "CARE:HARVEST", { plantId: plant.id }, tx);
    await awardXp(userId, xp, "CARE:HARVEST", tx);
    await notify(userId, {
      kind: "PLANT_BLOOMED",
      title: `${plant.species.name} harvested`,
      body: `+${petals} petals · +${xp} XP`,
    }, tx);
  });

  await progressQuests(userId, "HARVEST_PLANTS", 1);
  await trackEvent(userId, "plant_harvest", { plantId: plant.id, petals, xp });
  revalidatePath("/app/garden");
  return { petals, xp };
}

export async function revivePlant(input: unknown) {
  const userId = await getMe();
  const { userPlantId } = careActionSchema.parse(input);
  const plant = await loadOwnedPlant(userId, userPlantId);

  const cost = ECONOMY.plant.reviveCostPetals;
  await prisma.$transaction(async (tx) => {
    await adjustBalance(userId, "PETALS", -cost, "CARE:REVIVE", { plantId: plant.id }, tx);
    await tx.userPlant.update({
      where: { id: plant.id },
      data: {
        isWilted: false,
        health: 100,
        lastWateredAt: new Date(),
      },
    });
    await tx.careAction.create({
      data: { userId, userPlantId: plant.id, type: "REVIVE", xpGained: 0, petalsGained: 0 },
    });
  });

  revalidatePath("/app/garden");
  return { ok: true };
}
