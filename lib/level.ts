import { ECONOMY } from "@/lib/config";

export function levelForXp(xp: number): { level: number; xpInLevel: number; xpToNext: number } {
  let level = 1;
  let cumulative = 0;
  while (true) {
    const need = ECONOMY.level.xpForLevel(level);
    if (cumulative + need > xp) {
      return { level, xpInLevel: xp - cumulative, xpToNext: need };
    }
    cumulative += need;
    level += 1;
    if (level > 999) return { level, xpInLevel: 0, xpToNext: ECONOMY.level.xpForLevel(level) };
  }
}
