import { CurrencyKind, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";
import { levelForXp } from "@/lib/level";

type Tx = Prisma.TransactionClient | PrismaClient;

export async function adjustBalance(
  userId: string,
  currency: CurrencyKind,
  delta: number,
  reason: string,
  metadata?: Record<string, unknown>,
  client: Tx = prisma,
) {
  if (delta === 0) return;
  if (currency === "USD") throw new Error("USD adjustments handled via Transactions table");

  // Spend guard: never allow balance to go negative
  if (delta < 0) {
    const user = await client.user.findUnique({
      where: { id: userId },
      select: { petals: true, bloomCoins: true, gems: true },
    });
    if (!user) throw new Error("User not found");
    const balance =
      currency === "PETALS" ? user.petals :
      currency === "COINS"  ? user.bloomCoins :
      currency === "GEMS"   ? user.gems : 0;
    if (balance + delta < 0) throw new Error("INSUFFICIENT_FUNDS");
  }

  const data =
    currency === "PETALS" ? { petals: { increment: delta } } :
    currency === "COINS"  ? { bloomCoins: { increment: delta } } :
                            { gems: { increment: delta } };

  await client.user.update({ where: { id: userId }, data });
  await client.currencyLedger.create({
    data: {
      userId,
      currency,
      delta,
      reason,
      metadata: metadata as any,
    },
  });
}

export async function awardXp(
  userId: string,
  xp: number,
  reason: string,
  client: Tx = prisma,
) {
  if (xp <= 0) return { leveledUp: false, newLevel: undefined as number | undefined };
  const before = await client.user.findUniqueOrThrow({
    where: { id: userId },
    select: { xp: true, level: true },
  });
  const newXp = before.xp + xp;
  const { level } = levelForXp(newXp);
  await client.user.update({
    where: { id: userId },
    data: { xp: newXp, level },
  });
  await client.currencyLedger.create({
    data: { userId, currency: "PETALS", delta: 0, reason: `XP:${reason}`, metadata: { xp } },
  });
  return { leveledUp: level > before.level, newLevel: level };
}
