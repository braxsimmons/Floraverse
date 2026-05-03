"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { adjustBalance } from "@/lib/currency";
import { progressQuests } from "@/lib/quests";
import { trackEvent } from "@/lib/analytics";

const purchaseSchema = z.object({
  shopItemId: z.string().min(1),
  quantity: z.number().int().min(1).max(20).default(1),
});

async function getMe() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  return session.user.id;
}

export async function listShop() {
  return await prisma.shopItem.findMany({
    where: { isActive: true, kind: { not: "COIN_PACK" } },
    orderBy: [{ isFeatured: "desc" }, { unlockLevel: "asc" }, { price: "asc" }],
  });
}

export async function purchaseShopItem(input: unknown) {
  const userId = await getMe();
  const { shopItemId, quantity } = purchaseSchema.parse(input);
  const item = await prisma.shopItem.findUnique({ where: { id: shopItemId } });
  if (!item || !item.isActive) throw new Error("NOT_AVAILABLE");
  if (item.priceCurrency === "USD") throw new Error("USE_STRIPE_CHECKOUT");

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { level: true, petals: true, bloomCoins: true, gems: true },
  });
  if (user.level < item.unlockLevel) throw new Error("LEVEL_LOCKED");

  const total = item.price * quantity;
  const balance =
    item.priceCurrency === "PETALS" ? user.petals :
    item.priceCurrency === "COINS"  ? user.bloomCoins :
    item.priceCurrency === "GEMS"   ? user.gems : 0;
  if (balance < total) throw new Error("INSUFFICIENT_FUNDS");

  await prisma.$transaction(async (tx) => {
    await adjustBalance(userId, item.priceCurrency, -total, `SHOP_PURCHASE:${item.sku}`, { quantity }, tx);
    await tx.inventoryItem.upsert({
      where: { userId_shopItemId: { userId, shopItemId: item.id } },
      create: { userId, shopItemId: item.id, quantity },
      update: { quantity: { increment: quantity } },
    });
  });

  await progressQuests(userId, "BUY_ITEM", quantity);
  await trackEvent(userId, "shop_purchase", { sku: item.sku, qty: quantity, total, currency: item.priceCurrency });
  revalidatePath("/app/shop");
  revalidatePath("/app/garden");
  return { ok: true };
}

export async function getMyInventory() {
  const userId = await getMe();
  return await prisma.inventoryItem.findMany({
    where: { userId },
    include: { shopItem: true },
    orderBy: { acquiredAt: "desc" },
  });
}
