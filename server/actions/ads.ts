"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ECONOMY } from "@/lib/config";
import { adjustBalance } from "@/lib/currency";
import { trackEvent } from "@/lib/analytics";
import { startOfDay, endOfDay } from "@/lib/utils";

async function getMe() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  return session.user.id;
}

export async function adAvailability() {
  const me = await getMe();
  const settings = await loadAdSettings();
  if (!settings.enabled) return { enabled: false, ready: false, remainingMs: 0, watchedToday: 0, dailyCap: 0, reward: { coins: 0, petals: 0 } };

  const today = startOfDay();
  const todayEnd = endOfDay();
  const [todayCount, last] = await Promise.all([
    prisma.adRewardClaim.count({
      where: { userId: me, createdAt: { gte: today, lte: todayEnd } },
    }),
    prisma.adRewardClaim.findFirst({
      where: { userId: me },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const cooldownRemaining = last
    ? Math.max(0, settings.cooldownMs - (Date.now() - last.createdAt.getTime()))
    : 0;

  const capReached = todayCount >= settings.dailyCap;
  return {
    enabled: true,
    ready: cooldownRemaining === 0 && !capReached,
    remainingMs: cooldownRemaining,
    watchedToday: todayCount,
    dailyCap: settings.dailyCap,
    reward: { coins: settings.rewardCoins, petals: settings.rewardPetals },
  };
}

export async function claimAdReward(_token?: string) {
  const me = await getMe();
  const settings = await loadAdSettings();
  if (!settings.enabled) throw new Error("ADS_DISABLED");

  // Cooldown + daily cap re-check
  const today = startOfDay();
  const todayEnd = endOfDay();
  const [todayCount, last] = await Promise.all([
    prisma.adRewardClaim.count({
      where: { userId: me, createdAt: { gte: today, lte: todayEnd } },
    }),
    prisma.adRewardClaim.findFirst({
      where: { userId: me },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  if (todayCount >= settings.dailyCap) throw new Error("DAILY_CAP");
  if (last && Date.now() - last.createdAt.getTime() < settings.cooldownMs) {
    throw new Error("COOLDOWN");
  }

  // Real provider verification (AdMob/AdSense SSV) belongs here.
  // For TEST provider we accept the claim.
  await prisma.$transaction(async (tx) => {
    await tx.adRewardClaim.create({
      data: {
        userId: me,
        provider: settings.provider as any,
        rewardCoins: settings.rewardCoins,
        rewardPetals: settings.rewardPetals,
        verified: settings.provider === "TEST",
      },
    });
    if (settings.rewardCoins) await adjustBalance(me, "COINS", settings.rewardCoins, "AD_REWARD", undefined, tx);
    if (settings.rewardPetals) await adjustBalance(me, "PETALS", settings.rewardPetals, "AD_REWARD", undefined, tx);
  });

  await trackEvent(me, "ad_reward_claim", { coins: settings.rewardCoins, petals: settings.rewardPetals });
  revalidatePath("/app");
  return { coins: settings.rewardCoins, petals: settings.rewardPetals };
}

async function loadAdSettings() {
  const row = await prisma.adminSetting.findUnique({ where: { key: "ads.config" } });
  const overrides = (row?.value as Partial<typeof ECONOMY.ads>) ?? {};
  return { ...ECONOMY.ads, ...overrides };
}
