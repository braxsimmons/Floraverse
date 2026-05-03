"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, requireMod } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { adjustBalance } from "@/lib/currency";
import { trackEvent } from "@/lib/analytics";

export async function toggleBan(userId: string) {
  const me = await requireMod();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { bannedAt: true } });
  await prisma.user.update({
    where: { id: userId },
    data: { bannedAt: user.bannedAt ? null : new Date() },
  });
  await trackEvent(me.id, "admin_toggle_ban", { userId });
  revalidatePath("/admin/users");
}

export async function grantCurrency(userId: string, currency: "PETALS" | "COINS", delta: number) {
  const me = await requireAdmin();
  await adjustBalance(userId, currency, Math.trunc(delta), `ADMIN_GRANT:${me.id}`);
  revalidatePath("/admin/users");
}

export async function setSpeciesActive(sku: string, active: boolean) {
  await requireAdmin();
  // Schema doesn't have isActive on PlantSpecies; use unlockLevel hack? Better: keep state via AdminSetting list.
  await prisma.adminSetting.upsert({
    where: { key: `species.disabled.${sku}` },
    create: { key: `species.disabled.${sku}`, value: !active },
    update: { value: !active },
  });
}

const setShopItemSchema = z.object({
  id: z.string().min(1),
  price: z.number().int().min(0).max(1_000_000).optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export async function setShopItem(input: unknown) {
  await requireAdmin();
  const data = setShopItemSchema.parse(input);
  await prisma.shopItem.update({
    where: { id: data.id },
    data: {
      ...(data.price !== undefined && { price: data.price }),
      ...(data.isFeatured !== undefined && { isFeatured: data.isFeatured }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });
  revalidatePath("/admin/shop");
  revalidatePath("/app/shop");
}

export async function resolveReport(id: string, status: "RESOLVED" | "DISMISSED") {
  await requireMod();
  await prisma.report.update({
    where: { id },
    data: { status, resolvedAt: new Date() },
  });
  revalidatePath("/admin/reports");
}
