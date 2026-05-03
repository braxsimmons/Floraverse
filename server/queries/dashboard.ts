import "server-only";
import { prisma } from "@/lib/db";
import { computeGrowth, toPlantView } from "@/lib/plant-engine";
import { ECONOMY } from "@/lib/config";
import { isSameLocalDay } from "@/lib/utils";
import { nextTimedRewardAt } from "@/lib/streak";
import { levelForXp } from "@/lib/level";

export async function loadDashboard(userId: string) {
  const [user, garden, notifications, recent] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.garden.findUnique({
      where: { userId },
      include: { slots: { include: { userPlant: { include: { species: true } } } } },
    }),
    prisma.notification.findMany({
      where: { userId, readAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const now = new Date();
  const plants = (garden?.slots ?? [])
    .filter((s) => s.userPlant)
    .map((s) => {
      const p = s.userPlant!;
      const view = toPlantView({ ...p, species: p.species }, now);
      return { ...view, x: s.x, y: s.y };
    });

  const dailyClaimed = user.lastDailyClaimAt
    ? isSameLocalDay(user.lastDailyClaimAt, now)
    : false;
  const timedReadyAt = nextTimedRewardAt(user.lastTimedClaimAt);
  const timedReady = !timedReadyAt || timedReadyAt.getTime() <= now.getTime();

  const xpInfo = levelForXp(user.xp);

  return {
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      petals: user.petals,
      coins: user.bloomCoins,
      gems: user.gems,
      level: user.level,
      xp: user.xp,
      xpInLevel: xpInfo.xpInLevel,
      xpToNext: xpInfo.xpToNext,
      streakCount: user.streakCount,
      unlockedBiomes: user.unlockedBiomes,
    },
    rewards: {
      dailyClaimed,
      timedReady,
      timedReadyAt,
    },
    garden,
    plants,
    notifications,
    recent,
  };
}
