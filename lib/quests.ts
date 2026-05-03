import { Prisma, QuestActionKey, QuestKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import { adjustBalance, awardXp } from "@/lib/currency";
import { startOfDay, endOfDay, startOfWeek } from "@/lib/utils";

const DAILY_COUNT = 3;
const WEEKLY_COUNT = 2;

export async function ensureDailyQuests(userId: string) {
  const dayStart = startOfDay();
  const dayEnd = endOfDay();
  const existing = await prisma.userQuestProgress.findMany({
    where: {
      userId,
      assignedAt: { gte: dayStart, lte: dayEnd },
      quest: { kind: "DAILY" },
    },
    include: { quest: true },
  });
  if (existing.length >= DAILY_COUNT) return existing;

  const pool = await prisma.quest.findMany({ where: { kind: "DAILY", isActive: true } });
  if (!pool.length) return existing;

  const picked = weightedSample(pool, DAILY_COUNT - existing.length, (q) => q.weight);
  const created = await prisma.$transaction(
    picked.map((q) =>
      prisma.userQuestProgress.create({
        data: {
          userId,
          questId: q.id,
          progress: 0,
          goal: q.goal,
          assignedAt: dayStart,
          expiresAt: dayEnd,
        },
        include: { quest: true },
      }),
    ),
  );
  return [...existing, ...created];
}

export async function ensureWeeklyQuests(userId: string) {
  const weekStart = startOfWeek();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const existing = await prisma.userQuestProgress.findMany({
    where: {
      userId,
      assignedAt: { gte: weekStart, lte: weekEnd },
      quest: { kind: "WEEKLY" },
    },
    include: { quest: true },
  });
  if (existing.length >= WEEKLY_COUNT) return existing;

  const pool = await prisma.quest.findMany({ where: { kind: "WEEKLY", isActive: true } });
  if (!pool.length) return existing;

  const picked = weightedSample(pool, WEEKLY_COUNT - existing.length, (q) => q.weight);
  const created = await prisma.$transaction(
    picked.map((q) =>
      prisma.userQuestProgress.create({
        data: {
          userId,
          questId: q.id,
          progress: 0,
          goal: q.goal,
          assignedAt: weekStart,
          expiresAt: weekEnd,
        },
        include: { quest: true },
      }),
    ),
  );
  return [...existing, ...created];
}

/**
 * Increment any active quest progress for a given action.
 * Auto-marks complete (but does not auto-claim).
 */
export async function progressQuests(
  userId: string,
  actionKey: QuestActionKey,
  amount = 1,
  client: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const now = new Date();
  const active = await client.userQuestProgress.findMany({
    where: {
      userId,
      claimedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      quest: { actionKey },
    },
    include: { quest: true },
  });

  for (const p of active) {
    const next = Math.min(p.goal, p.progress + amount);
    const completed = next >= p.goal && !p.completedAt;
    await client.userQuestProgress.update({
      where: { id: p.id },
      data: {
        progress: next,
        completedAt: completed ? now : p.completedAt,
      },
    });
  }
}

export async function claimQuest(userId: string, progressId: string) {
  const p = await prisma.userQuestProgress.findUnique({
    where: { id: progressId },
    include: { quest: true },
  });
  if (!p || p.userId !== userId) throw new Error("NOT_FOUND");
  if (p.claimedAt) throw new Error("ALREADY_CLAIMED");
  if (!p.completedAt && p.progress < p.goal) throw new Error("NOT_COMPLETE");

  await prisma.$transaction(async (tx) => {
    await tx.userQuestProgress.update({
      where: { id: p.id },
      data: { claimedAt: new Date(), completedAt: p.completedAt ?? new Date() },
    });
    if (p.quest.rewardPetals)
      await adjustBalance(userId, "PETALS", p.quest.rewardPetals, `QUEST:${p.quest.slug}`, undefined, tx);
    if (p.quest.rewardCoins)
      await adjustBalance(userId, "COINS", p.quest.rewardCoins, `QUEST:${p.quest.slug}`, undefined, tx);
    if (p.quest.rewardXp) await awardXp(userId, p.quest.rewardXp, `QUEST:${p.quest.slug}`, tx);
    if (p.quest.rewardItemSku) {
      const item = await tx.shopItem.findUnique({ where: { sku: p.quest.rewardItemSku } });
      if (item) {
        await tx.inventoryItem.upsert({
          where: { userId_shopItemId: { userId, shopItemId: item.id } },
          create: { userId, shopItemId: item.id, quantity: 1 },
          update: { quantity: { increment: 1 } },
        });
      }
    }
    await tx.notification.create({
      data: {
        userId,
        kind: "QUEST_COMPLETE",
        title: "Quest claimed",
        body: `+${p.quest.rewardPetals} petals · +${p.quest.rewardXp} XP`,
      },
    });
  });
}

function weightedSample<T>(items: T[], n: number, weight: (t: T) => number): T[] {
  const pool = [...items];
  const picked: T[] = [];
  for (let i = 0; i < n && pool.length; i++) {
    const total = pool.reduce((s, x) => s + Math.max(1, weight(x)), 0);
    let r = Math.random() * total;
    let idx = 0;
    for (let j = 0; j < pool.length; j++) {
      r -= Math.max(1, weight(pool[j]));
      if (r <= 0) {
        idx = j;
        break;
      }
    }
    picked.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return picked;
}
