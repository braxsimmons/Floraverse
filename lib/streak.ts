import { prisma } from "@/lib/db";
import { ECONOMY } from "@/lib/config";
import { adjustBalance, awardXp } from "@/lib/currency";
import { isSameLocalDay, startOfDay } from "@/lib/utils";

/**
 * Run on every authenticated session bootstrap.
 * Increments streak on first visit of a new local day; resets if a day was missed.
 */
export async function tickStreak(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { streakCount: true, lastStreakAt: true },
  });

  const now = new Date();
  const today = startOfDay(now);

  if (!user.lastStreakAt) {
    return await prisma.user.update({
      where: { id: userId },
      data: { streakCount: 1, lastStreakAt: now },
      select: { streakCount: true },
    });
  }

  if (isSameLocalDay(user.lastStreakAt, now)) {
    return { streakCount: user.streakCount };
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const continued = isSameLocalDay(user.lastStreakAt, yesterday);
  const nextCount = continued ? user.streakCount + 1 : 1;

  await prisma.user.update({
    where: { id: userId },
    data: { streakCount: nextCount, lastStreakAt: now },
  });

  return { streakCount: nextCount };
}

/**
 * Claim daily reward (once per local day, server-validated).
 */
export async function claimDailyReward(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { lastDailyClaimAt: true, streakCount: true },
  });
  const now = new Date();
  if (user.lastDailyClaimAt && isSameLocalDay(user.lastDailyClaimAt, now)) {
    throw new Error("ALREADY_CLAIMED_TODAY");
  }

  const streakBonusPetals = Math.min(
    user.streakCount,
    ECONOMY.dailyStreakBonus.capDays,
  ) * ECONOMY.dailyStreakBonus.petalsPerDay;

  const milestoneCoins =
    ECONOMY.dailyStreakBonus.milestoneCoinsAt.includes(user.streakCount) ? 5 : 0;

  const totalPetals = ECONOMY.dailyReward.petals + streakBonusPetals;
  const totalCoins = ECONOMY.dailyReward.coins + milestoneCoins;
  const totalXp = ECONOMY.dailyReward.xp;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { lastDailyClaimAt: now },
    });
    await adjustBalance(userId, "PETALS", totalPetals, "DAILY_CLAIM", { streak: user.streakCount }, tx);
    if (totalCoins) await adjustBalance(userId, "COINS", totalCoins, "DAILY_CLAIM_BONUS", undefined, tx);
    await awardXp(userId, totalXp, "DAILY_CLAIM", tx);
    await tx.notification.create({
      data: {
        userId,
        kind: "SYSTEM",
        title: "Daily reward claimed",
        body: `+${totalPetals} petals · +${totalXp} XP`,
      },
    });
  });

  return { petals: totalPetals, coins: totalCoins, xp: totalXp };
}

/**
 * Claim timed reward (every N hours).
 */
export async function claimTimedReward(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { lastTimedClaimAt: true },
  });
  const now = new Date();
  const cooldownMs = ECONOMY.timedRewardHours * 60 * 60 * 1000;
  if (user.lastTimedClaimAt && now.getTime() - user.lastTimedClaimAt.getTime() < cooldownMs) {
    throw new Error("COOLDOWN_ACTIVE");
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { lastTimedClaimAt: now } });
    await adjustBalance(userId, "PETALS", ECONOMY.timedReward.petals, "TIMED_CLAIM", undefined, tx);
    await awardXp(userId, ECONOMY.timedReward.xp, "TIMED_CLAIM", tx);
  });

  return ECONOMY.timedReward;
}

export function nextTimedRewardAt(lastTimedClaimAt: Date | null): Date | null {
  if (!lastTimedClaimAt) return null;
  return new Date(lastTimedClaimAt.getTime() + ECONOMY.timedRewardHours * 60 * 60 * 1000);
}
