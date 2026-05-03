import type { PlantSpecies, PlantStage, UserPlant } from "@prisma/client";
import { ECONOMY } from "@/lib/config";

export type PlantWithSpecies = UserPlant & { species: PlantSpecies };

/**
 * Compute live progress for a plant based on real elapsed time since last
 * checkpoint, accumulated growth, and species growth duration.
 */
export function computeGrowth(plant: PlantWithSpecies, now = new Date()) {
  const sinceWater = now.getTime() - plant.lastWateredAt.getTime();
  const grace = ECONOMY.plant.wiltGraceMs;
  const wilted = sinceWater > grace || plant.isWilted;

  // Effective accumulated growth: stored + (time since last update if not wilted, not harvested)
  let effectiveAccum = plant.growthMsAccumulated;
  if (!wilted && !plant.harvestedAt) {
    effectiveAccum += Math.max(0, now.getTime() - plant.updatedAt.getTime());
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

export function stageFromProgress(progress: number, harvestedAt: Date | null): PlantStage {
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
