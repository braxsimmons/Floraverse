import type { PlantSpecies, PlantStage, UserPlant } from "@prisma/client";
import { ECONOMY, type CareKey } from "@/lib/config";

export type PlantWithSpecies = UserPlant & { species: PlantSpecies };

/**
 * Compute live progress for a plant based on real elapsed time since last
 * checkpoint, accumulated growth, and species growth duration.
 */
export function computeGrowth(plant: PlantWithSpecies, now = new Date()) {
  const sinceWater = now.getTime() - new Date(plant.lastWateredAt).getTime();
  const grace = ECONOMY.plant.wiltGraceMs;
  const wilted = sinceWater > grace || plant.isWilted;

  // Effective accumulated growth: stored + (time since last update if not wilted, not harvested)
  let effectiveAccum = plant.growthMsAccumulated;
  if (!wilted && !plant.harvestedAt) {
    effectiveAccum += Math.max(0, now.getTime() - new Date(plant.updatedAt).getTime());
  }

  const total = Math.max(1, plant.species.baseGrowthMs);
  const progress = Math.max(0, Math.min(1, effectiveAccum / total));

  const stage = stageFromProgress(progress, plant.harvestedAt);
  const harvestable = !plant.harvestedAt && progress >= 1 && !wilted;

  // Wilt-driven health decay
  let health = plant.health;
  if (wilted) {
    const wiltedMs = Math.max(0, sinceWater - grace);
    const lostHealth = (wiltedMs / (1000 * 60 * 60)) * ECONOMY.plant.healthLossPerHourWilted;
    health = Math.max(0, Math.floor(plant.health - lostHealth));
  }

  return { progress, stage, harvestable, wilted, health, effectiveAccum };
}

export function stageFromProgress(progress: number, harvestedAt: Date | string | null): PlantStage {
  if (harvestedAt) return "BLOOMING";
  const t = ECONOMY.plant.stageThresholds;
  if (progress >= t[3]) return "BLOOMING";
  if (progress >= t[2]) return "GROWING";
  if (progress >= t[1]) return "SPROUT";
  return "SEED";
}

export function msUntilNextStage(plant: PlantWithSpecies, now = new Date()) {
  const { effectiveAccum } = computeGrowth(plant, now);
  const total = Math.max(1, plant.species.baseGrowthMs);
  const t = ECONOMY.plant.stageThresholds;
  for (const cutoff of t) {
    const target = cutoff * total;
    if (target > effectiveAccum) return Math.ceil(target - effectiveAccum);
  }
  return 0;
}

export function lastActionAt(plant: PlantWithSpecies, key: CareKey): Date | null {
  switch (key) {
    case "WATER": return plant.lastWateredAt ? new Date(plant.lastWateredAt) : null;
    case "MIST": return plant.lastMistedAt ? new Date(plant.lastMistedAt) : null;
    case "TALK": return plant.lastTalkedAt ? new Date(plant.lastTalkedAt) : null;
    case "SING": return plant.lastSungAt ? new Date(plant.lastSungAt) : null;
    case "PRUNE": return plant.lastPrunedAt ? new Date(plant.lastPrunedAt) : null;
    case "WEED": return plant.lastWeededAt ? new Date(plant.lastWeededAt) : null;
    case "FERTILIZE": return plant.lastFertilizedAt ? new Date(plant.lastFertilizedAt) : null;
  }
}

export function careAvailability(plant: PlantWithSpecies, now = new Date()) {
  const out: Record<string, { ready: boolean; nextAtMs: number; cooldownMs: number; remainingMs: number }> = {};
  for (const [key, cfg] of Object.entries(ECONOMY.care.actions)) {
    const last = lastActionAt(plant, key as CareKey);
    if (!last) {
      out[key] = { ready: true, nextAtMs: now.getTime(), cooldownMs: cfg.cooldownMs, remainingMs: 0 };
      continue;
    }
    const next = last.getTime() + cfg.cooldownMs;
    const remaining = Math.max(0, next - now.getTime());
    out[key] = { ready: remaining === 0, nextAtMs: next, cooldownMs: cfg.cooldownMs, remainingMs: remaining };
  }
  return out;
}

export function speedUpCost(remainingMs: number) {
  if (remainingMs <= 0) return 0;
  const raw = Math.ceil(remainingMs / ECONOMY.speedUp.msPerCoin);
  return Math.min(ECONOMY.speedUp.maxCoinsPerSkip, Math.max(ECONOMY.speedUp.minCoins, raw));
}

export function formatMs(ms: number): string {
  if (ms <= 0) return "ready";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

/**
 * Plain serializable shape for client components. Crosses the RSC boundary safely.
 */
export type PlantView = ReturnType<typeof toPlantView>;

export function toPlantView(plant: PlantWithSpecies, now = new Date()) {
  const live = computeGrowth(plant, now);
  const avail = careAvailability(plant, now);
  return {
    id: plant.id,
    speciesId: plant.species.id,
    speciesSku: plant.species.sku,
    name: plant.species.name,
    scientific: plant.species.scientific,
    description: plant.species.description,
    rarity: plant.species.rarity,
    biome: plant.species.biome,
    imageSeed: plant.species.imageSeed,
    petalsPerHarvest: plant.species.petalsPerHarvest,
    xpPerHarvest: plant.species.xpPerHarvest,
    baseGrowthMs: plant.species.baseGrowthMs,

    progress: live.progress,
    stage: live.stage,
    harvestable: live.harvestable,
    wilted: live.wilted,
    health: live.health,

    nextStageMs: msUntilNextStage(plant, now),
    care: avail,            // { WATER: { ready, remainingMs, ... }, ... }
    nowMs: now.getTime(),
  };
}
