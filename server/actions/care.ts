"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ECONOMY, type CareKey } from "@/lib/config";
import { adjustBalance, awardXp } from "@/lib/currency";
import { computeGrowth, lastActionAt, speedUpCost } from "@/lib/plant-engine";
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

const careSchema = z.object({
  userPlantId: z.string().min(1),
  action: z.enum(["WATER", "MIST", "TALK", "SING", "PRUNE", "WEED", "FERTILIZE"]),
});

const ACTION_FIELD: Record<CareKey, keyof Awaited<ReturnType<typeof loadOwnedPlant>>> = {
  WATER: "lastWateredAt",
  MIST: "lastMistedAt",
  TALK: "lastTalkedAt",
  SING: "lastSungAt",
  PRUNE: "lastPrunedAt",
  WEED: "lastWeededAt",
  FERTILIZE: "lastFertilizedAt",
};

const FIELD_UPDATE: Record<CareKey, "lastWateredAt" | "lastMistedAt" | "lastTalkedAt" | "lastSungAt" | "lastPrunedAt" | "lastWeededAt" | "lastFertilizedAt"> = {
  WATER: "lastWateredAt",
  MIST: "lastMistedAt",
  TALK: "lastTalkedAt",
  SING: "lastSungAt",
  PRUNE: "lastPrunedAt",
  WEED: "lastWeededAt",
  FERTILIZE: "lastFertilizedAt",
};

const QUEST_KEY: Partial<Record<CareKey, "WATER_PLANTS">> = {
  WATER: "WATER_PLANTS",
};

export async function performCare(input: unknown) {
  const me = await getMe();
  const { userPlantId, action } = careSchema.parse(input);

  const limit = rateLimit(`care:${me}`, { capacity: 60, refillPerSec: 1 });
  if (!limit.ok) throw new Error("RATE_LIMITED");

  const plant = await loadOwnedPlant(me, userPlantId);
  const cfg = ECONOMY.care.actions[action];
  if (!cfg) throw new Error("UNKNOWN_ACTION");

  const last = lastActionAt(plant, action);
  const now = new Date();
  if (last && now.getTime() - last.getTime() < cfg.cooldownMs) {
    throw new Error("COOLDOWN");
  }

  const { wilted, effectiveAccum } = computeGrowth(plant);
  // Watering counts even if wilted — it's the recovery action; other actions blocked when wilted.
  if (wilted && action !== "WATER") throw new Error("WILTED_REVIVE_FIRST");

  // Fertilize requires a consumable
  if ("requiresItemSku" in cfg && cfg.requiresItemSku) {
    const item = await prisma.shopItem.findUnique({ where: { sku: cfg.requiresItemSku } });
    if (!item) throw new Error("NO_ITEM");
    const inv = await prisma.inventoryItem.findUnique({
      where: { userId_shopItemId: { userId: me, shopItemId: item.id } },
    });
    if (!inv || inv.quantity < 1) throw new Error("NEEDS_FERTILIZER");
    await prisma.$transaction(async (tx) => {
      if (inv.quantity === 1) await tx.inventoryItem.delete({ where: { id: inv.id } });
      else await tx.inventoryItem.update({ where: { id: inv.id }, data: { quantity: { decrement: 1 } } });
    });
  }

  // Apply
  const newAccum = Math.min(plant.species.baseGrowthMs, effectiveAccum + (cfg.growthBoostMs ?? 0));

  await prisma.$transaction(async (tx) => {
    const updateData: Record<string, unknown> = {
      [FIELD_UPDATE[action]]: now,
      growthMsAccumulated: newAccum,
    };
    if (action === "WATER") {
      updateData.health = Math.min(100, plant.health + 5);
      updateData.isWilted = false;
    }
    await tx.userPlant.update({ where: { id: plant.id }, data: updateData });

    await tx.careAction.create({
      data: {
        userId: me,
        userPlantId: plant.id,
        type: action as any,
        xpGained: cfg.xp,
        petalsGained: cfg.petals,
      },
    });
    if (cfg.petals) await adjustBalance(me, "PETALS", cfg.petals, `CARE:${action}`, { plantId: plant.id }, tx);
    await awardXp(me, cfg.xp, `CARE:${action}`, tx);
  });

  const qk = QUEST_KEY[action];
  if (qk) await progressQuests(me, qk, 1);

  await trackEvent(me, `care_${action.toLowerCase()}`, { plantId: plant.id });
  revalidatePath("/app/garden");
  revalidatePath("/app");
  return { ok: true };
}

const speedUpSchema = z.object({
  userPlantId: z.string().min(1),
  action: z.enum(["WATER", "MIST", "TALK", "SING", "PRUNE", "WEED", "FERTILIZE"]),
  useGems: z.boolean().optional(),
});

export async function speedUpCare(input: unknown) {
  const me = await getMe();
  const { userPlantId, action, useGems } = speedUpSchema.parse(input);
  const plant = await loadOwnedPlant(me, userPlantId);

  const cfg = ECONOMY.care.actions[action];
  if (!cfg) throw new Error("UNKNOWN_ACTION");
  const last = lastActionAt(plant, action);
  const now = new Date();
  if (!last) throw new Error("NO_COOLDOWN");
  const remaining = (last.getTime() + cfg.cooldownMs) - now.getTime();
  if (remaining <= 0) throw new Error("ALREADY_READY");

  if (useGems) {
    await adjustBalance(me, "GEMS", -ECONOMY.speedUp.instantUnlockGems, `SPEEDUP_GEMS:${action}`, { plantId: plant.id });
  } else {
    const cost = speedUpCost(remaining);
    await adjustBalance(me, "COINS", -cost, `SPEEDUP:${action}`, { plantId: plant.id, remaining });
  }

  // Backdate the last-action timestamp by the full cooldown so it's "ready now"
  const newLast = new Date(now.getTime() - cfg.cooldownMs);
  await prisma.userPlant.update({
    where: { id: plant.id },
    data: { [FIELD_UPDATE[action]]: newLast },
  });

  await prisma.careAction.create({
    data: { userId: me, userPlantId: plant.id, type: "SPEEDUP", xpGained: 0, petalsGained: 0 },
  });

  await trackEvent(me, "care_speedup", { action, useGems: !!useGems, remaining });
  revalidatePath("/app/garden");
  revalidatePath("/app");
  return { ok: true };
}

const idSchema = z.object({ userPlantId: z.string().min(1) });

export async function harvestPlant(input: unknown) {
  const me = await getMe();
  const { userPlantId } = idSchema.parse(input);
  const plant = await loadOwnedPlant(me, userPlantId);
  if (plant.harvestedAt) throw new Error("ALREADY_HARVESTED");

  const { harvestable } = computeGrowth(plant);
  if (!harvestable) throw new Error("NOT_READY");

  const petals = plant.species.petalsPerHarvest;
  const xp = plant.species.xpPerHarvest;

  await prisma.$transaction(async (tx) => {
    await tx.userPlant.update({ where: { id: plant.id }, data: { harvestedAt: new Date() } });
    await tx.gardenSlot.updateMany({
      where: { userPlantId: plant.id },
      data: { type: "EMPTY", userPlantId: null },
    });
    await tx.careAction.create({
      data: { userId: me, userPlantId: plant.id, type: "HARVEST", xpGained: xp, petalsGained: petals },
    });
    await adjustBalance(me, "PETALS", petals, "CARE:HARVEST", { plantId: plant.id }, tx);
    await awardXp(me, xp, "CARE:HARVEST", tx);
    await notify(me, {
      kind: "PLANT_BLOOMED",
      title: `${plant.species.name} harvested`,
      body: `+${petals} petals · +${xp} XP`,
    }, tx);
  });

  await progressQuests(me, "HARVEST_PLANTS", 1);
  await trackEvent(me, "plant_harvest", { plantId: plant.id, petals, xp });
  revalidatePath("/app/garden");
  revalidatePath("/app");
  return { petals, xp };
}

export async function revivePlant(input: unknown) {
  const me = await getMe();
  const { userPlantId } = idSchema.parse(input);
  const plant = await loadOwnedPlant(me, userPlantId);
  const cost = ECONOMY.plant.reviveCostPetals;
  await prisma.$transaction(async (tx) => {
    await adjustBalance(me, "PETALS", -cost, "CARE:REVIVE", { plantId: plant.id }, tx);
    await tx.userPlant.update({
      where: { id: plant.id },
      data: { isWilted: false, health: 100, lastWateredAt: new Date() },
    });
    await tx.careAction.create({
      data: { userId: me, userPlantId: plant.id, type: "REVIVE", xpGained: 0, petalsGained: 0 },
    });
  });
  revalidatePath("/app/garden");
  return { ok: true };
}

// Legacy named exports (older client code paths still call these)
export async function waterPlant(input: unknown) {
  return performCare({ ...((input ?? {}) as object), action: "WATER" });
}
export async function fertilizePlant(input: unknown) {
  return performCare({ ...((input ?? {}) as object), action: "FERTILIZE" });
}
