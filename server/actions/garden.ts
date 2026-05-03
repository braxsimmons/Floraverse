"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { plantSeedSchema, placeDecorSchema, moveSlotSchema } from "@/lib/validation";
import { progressQuests } from "@/lib/quests";
import { trackEvent } from "@/lib/analytics";
import { ECONOMY } from "@/lib/config";

async function getMe() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  return session.user.id;
}

export async function ensureGarden(userId: string) {
  const existing = await prisma.garden.findUnique({ where: { userId } });
  if (existing) return existing;
  return await prisma.garden.create({
    data: { userId, name: "My Garden" },
  });
}

export async function getMyGarden() {
  const userId = await getMe();
  const garden = await ensureGarden(userId);
  return await prisma.garden.findUniqueOrThrow({
    where: { id: garden.id },
    include: {
      slots: {
        include: {
          userPlant: { include: { species: true } },
        },
      },
    },
  });
}

export async function plantSeed(input: unknown) {
  const userId = await getMe();
  const { shopItemId, x, y } = plantSeedSchema.parse(input);

  const inv = await prisma.inventoryItem.findUnique({
    where: { userId_shopItemId: { userId, shopItemId } },
    include: { shopItem: true },
  });
  if (!inv || inv.quantity < 1) throw new Error("NO_SEEDS");
  if (inv.shopItem.kind !== "SEED" || !inv.shopItem.speciesId)
    throw new Error("ITEM_NOT_SEED");

  const garden = await ensureGarden(userId);
  if (x >= garden.width || y >= garden.height) throw new Error("OUT_OF_BOUNDS");

  const occupied = await prisma.gardenSlot.findUnique({
    where: { gardenId_x_y: { gardenId: garden.id, x, y } },
  });
  if (occupied && occupied.type !== "EMPTY") throw new Error("SLOT_OCCUPIED");

  const userPlant = await prisma.$transaction(async (tx) => {
    // Decrement inventory
    if (inv.quantity === 1) {
      await tx.inventoryItem.delete({ where: { id: inv.id } });
    } else {
      await tx.inventoryItem.update({
        where: { id: inv.id },
        data: { quantity: { decrement: 1 } },
      });
    }
    // Create UserPlant
    const up = await tx.userPlant.create({
      data: {
        userId,
        speciesId: inv.shopItem.speciesId!,
      },
    });
    // Place in slot
    if (occupied) {
      await tx.gardenSlot.update({
        where: { id: occupied.id },
        data: { type: "PLANT", userPlantId: up.id, decorationId: null },
      });
    } else {
      await tx.gardenSlot.create({
        data: { gardenId: garden.id, x, y, type: "PLANT", userPlantId: up.id },
      });
    }
    return up;
  });

  await progressQuests(userId, "PLANT_SEEDS", 1);
  await trackEvent(userId, "plant_seed", { shopItemId, x, y });
  revalidatePath("/app/garden");
  return userPlant.id;
}

export async function placeDecoration(input: unknown) {
  const userId = await getMe();
  const { shopItemId, x, y } = placeDecorSchema.parse(input);

  const inv = await prisma.inventoryItem.findUnique({
    where: { userId_shopItemId: { userId, shopItemId } },
    include: { shopItem: true },
  });
  if (!inv || inv.quantity < 1) throw new Error("NOT_OWNED");
  if (inv.shopItem.kind !== "DECORATION") throw new Error("NOT_DECORATION");

  const garden = await ensureGarden(userId);
  const occupied = await prisma.gardenSlot.findUnique({
    where: { gardenId_x_y: { gardenId: garden.id, x, y } },
  });
  if (occupied && occupied.type !== "EMPTY") throw new Error("SLOT_OCCUPIED");

  if (occupied) {
    await prisma.gardenSlot.update({
      where: { id: occupied.id },
      data: { type: "DECORATION", decorationId: inv.shopItem.sku, userPlantId: null },
    });
  } else {
    await prisma.gardenSlot.create({
      data: { gardenId: garden.id, x, y, type: "DECORATION", decorationId: inv.shopItem.sku },
    });
  }
  revalidatePath("/app/garden");
}

export async function moveSlot(input: unknown) {
  const userId = await getMe();
  const { fromX, fromY, toX, toY } = moveSlotSchema.parse(input);
  const garden = await ensureGarden(userId);

  const from = await prisma.gardenSlot.findUnique({
    where: { gardenId_x_y: { gardenId: garden.id, x: fromX, y: fromY } },
  });
  if (!from) throw new Error("EMPTY_SOURCE");

  const to = await prisma.gardenSlot.findUnique({
    where: { gardenId_x_y: { gardenId: garden.id, x: toX, y: toY } },
  });
  if (to && to.type !== "EMPTY") throw new Error("SLOT_OCCUPIED");

  await prisma.$transaction(async (tx) => {
    if (to) {
      await tx.gardenSlot.delete({ where: { id: to.id } });
    }
    await tx.gardenSlot.update({
      where: { id: from.id },
      data: { x: toX, y: toY },
    });
  });
  revalidatePath("/app/garden");
}

export async function clearSlot(input: { x: number; y: number }) {
  const userId = await getMe();
  const garden = await ensureGarden(userId);
  const slot = await prisma.gardenSlot.findUnique({
    where: { gardenId_x_y: { gardenId: garden.id, x: input.x, y: input.y } },
  });
  if (!slot) return;

  // Decorations get returned to inventory; plants stay (use harvest flow instead)
  if (slot.type === "DECORATION" && slot.decorationId) {
    const item = await prisma.shopItem.findUnique({ where: { sku: slot.decorationId } });
    if (item) {
      await prisma.inventoryItem.upsert({
        where: { userId_shopItemId: { userId, shopItemId: item.id } },
        create: { userId, shopItemId: item.id, quantity: 1 },
        update: { quantity: { increment: 1 } },
      });
    }
    await prisma.gardenSlot.delete({ where: { id: slot.id } });
    revalidatePath("/app/garden");
  }
}

export async function expandGarden() {
  const userId = await getMe();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { subscriptionTier: true },
  });
  if (user.subscriptionTier !== "PLUS") throw new Error("PLUS_REQUIRED");
  const garden = await ensureGarden(userId);
  if (garden.width >= 8) return garden;
  const updated = await prisma.garden.update({
    where: { id: garden.id },
    data: { width: garden.width + 1, height: garden.height + 1 },
  });
  revalidatePath("/app/garden");
  return updated;
}
