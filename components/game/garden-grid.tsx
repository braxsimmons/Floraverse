"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { cn, formatNumber } from "@/lib/utils";
import { Loader2, Scissors, Heart, Zap, Crown } from "lucide-react";
import { PlantArt } from "@/components/game/plant-art";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/toast";
import { RarityBadge } from "@/components/game/rarity-badge";
import { performCare, harvestPlant, revivePlant, speedUpCare } from "@/server/actions/care";
import { ECONOMY } from "@/lib/config";
import { speedUpCost, formatMs } from "@/lib/plant-engine";
import type { GardenSlotView } from "@/app/app/garden/garden-client";

const ACTION_KEYS = ["WATER", "MIST", "TALK", "SING", "PRUNE", "WEED", "FERTILIZE"] as const;
type ActionKey = (typeof ACTION_KEYS)[number];

export function GardenGrid({
  width,
  height,
  slots,
  readOnly,
  wallet,
  fertilizerCount,
  onSelectEmpty,
}: {
  width: number;
  height: number;
  slots: GardenSlotView[];
  readOnly?: boolean;
  wallet?: { petals: number; coins: number; gems: number };
  fertilizerCount?: number;
  onSelectEmpty?: (x: number, y: number) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = slots.find((s) => s.id === activeId) ?? null;
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const cellMap = new Map<string, GardenSlotView>();
  for (const s of slots) cellMap.set(`${s.x},${s.y}`, s);

  const cells: GardenSlotView[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      cells.push(
        cellMap.get(`${x},${y}`) ?? {
          id: `empty-${x}-${y}`,
          x,
          y,
          type: "EMPTY",
          decorationId: null,
          plant: null,
        },
      );
    }
  }

  const action = async (fn: () => Promise<unknown>, success?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      if (success) toast.success(success);
      router.refresh();
    } catch (e: any) {
      toast.error(prettyError(e?.message ?? "Something went wrong"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div
        className="grid gap-1.5 sm:gap-2.5 mx-auto p-2 sm:p-3 rounded-3xl bg-card/40 border shadow-cozy"
        style={{ gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`, maxWidth: 720 }}
      >
        {cells.map((cell) => (
          <motion.button
            key={cell.id}
            type="button"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: (cell.x + cell.y) * 0.01 }}
            onClick={() => {
              if (cell.plant) setActiveId(cell.id);
              else if (!readOnly && onSelectEmpty) onSelectEmpty(cell.x, cell.y);
            }}
            className={cn(
              "aspect-square rounded-2xl bg-card/70 border border-white/40 backdrop-blur-sm grid place-items-center transition-all relative",
              "hover:shadow-cozy hover:-translate-y-0.5 active:scale-95",
              cell.type === "EMPTY" && !readOnly && "border-dashed border-primary/20 hover:bg-card",
              readOnly && cell.type === "EMPTY" && "opacity-40 cursor-default",
            )}
          >
            {cell.plant ? (
              <>
                <PlantArt
                  imageSeed={cell.plant.imageSeed}
                  stage={cell.plant.stage}
                  wilted={cell.plant.wilted}
                  size={70}
                />
                {cell.plant.harvestable && (
                  <span className="absolute top-1 right-1 text-xs bg-bloom-gold rounded-full px-1.5 py-0.5 shadow-soft animate-sparkle">✨</span>
                )}
                {cell.plant.wilted && (
                  <span className="absolute top-1 right-1 text-xs bg-bloom-rose rounded-full px-1.5 py-0.5 shadow-soft">!</span>
                )}
              </>
            ) : cell.decorationId ? (
              <div className="text-3xl">🪴</div>
            ) : (
              <span className="text-xs text-muted-foreground opacity-40">+</span>
            )}
          </motion.button>
        ))}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActiveId(null)}>
        <DialogContent className="max-w-md sm:max-w-lg p-0 overflow-hidden">
          {active?.plant && (
            <div className="max-h-[85vh] overflow-y-auto">
              <div className="bg-gradient-to-br from-bloom-mint/40 via-card to-bloom-peach/30 p-5">
                <DialogHeader>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <DialogTitle className="truncate">{active.plant.name}</DialogTitle>
                      {active.plant.scientific && (
                        <DialogDescription className="italic text-xs">{active.plant.scientific}</DialogDescription>
                      )}
                    </div>
                    <RarityBadge rarity={active.plant.rarity} />
                  </div>
                </DialogHeader>

                <div className="flex items-center gap-4 mt-3">
                  <PlantArt
                    imageSeed={active.plant.imageSeed}
                    stage={active.plant.stage}
                    wilted={active.plant.wilted}
                    size={110}
                  />
                  <div className="flex-1 space-y-2 text-sm">
                    <Bar label="Growth" value={Math.round(active.plant.progress * 100)} />
                    <Bar label="Health" value={active.plant.health} />
                    <p className="text-xs text-muted-foreground">
                      {active.plant.harvestable
                        ? "🌟 Ready to harvest"
                        : active.plant.wilted
                        ? "Needs water — wilted"
                        : `Next stage in ${formatMs(active.plant.nextStageMs)}`}
                    </p>
                  </div>
                </div>
              </div>

              {!readOnly && (
                <div className="p-5 space-y-3">
                  {active.plant.harvestable && (
                    <Button
                      variant="gold"
                      className="w-full h-12"
                      disabled={busy}
                      onClick={() =>
                        action(
                          () => harvestPlant({ userPlantId: active.plant!.id }),
                          `Harvested! +${active.plant!.petalsPerHarvest} 🌸`,
                        )
                      }
                    >
                      <Scissors className="h-4 w-4" /> Harvest · +{active.plant.petalsPerHarvest} 🌸
                    </Button>
                  )}

                  {active.plant.wilted && (
                    <Button
                      variant="soft"
                      className="w-full h-12"
                      disabled={busy}
                      onClick={() =>
                        action(
                          () => revivePlant({ userPlantId: active.plant!.id }),
                          "Revived!",
                        )
                      }
                    >
                      <Heart className="h-4 w-4" /> Revive (30 🌸)
                    </Button>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ACTION_KEYS.map((key) => {
                      const cfg = ECONOMY.care.actions[key];
                      const state = active.plant!.care[key];
                      const remaining = state.ready ? 0 : Math.max(0, state.nextAtMs - now);
                      const ready = remaining === 0;
                      const cost = speedUpCost(remaining);
                      const needFert = key === "FERTILIZE" && (fertilizerCount ?? 0) === 0;
                      return (
                        <CareTile
                          key={key}
                          icon={cfg.icon}
                          label={cfg.label}
                          xp={cfg.xp}
                          petals={cfg.petals}
                          ready={ready && !needFert}
                          remaining={remaining}
                          cost={cost}
                          gems={ECONOMY.speedUp.instantUnlockGems}
                          wallet={wallet}
                          extra={needFert ? "Need fertilizer" : undefined}
                          onAct={() =>
                            action(
                              () => performCare({ userPlantId: active.plant!.id, action: key }),
                              `${cfg.label}!`,
                            )
                          }
                          onSpeedUp={() =>
                            action(
                              () => speedUpCare({ userPlantId: active.plant!.id, action: key }),
                              "Sped up",
                            )
                          }
                          onInstant={() =>
                            action(
                              () => speedUpCare({ userPlantId: active.plant!.id, action: key, useGems: true }),
                              "Instant!",
                            )
                          }
                          busy={busy}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-0.5">
        <span>{label}</span>
        <span className="font-medium tabular-nums">{value}%</span>
      </div>
      <Progress value={Math.max(0, Math.min(100, value))} />
    </div>
  );
}

function CareTile({
  icon, label, xp, petals, ready, remaining, cost, gems,
  wallet, extra, onAct, onSpeedUp, onInstant, busy,
}: {
  icon: string;
  label: string;
  xp: number;
  petals: number;
  ready: boolean;
  remaining: number;
  cost: number;
  gems: number;
  wallet?: { petals: number; coins: number; gems: number };
  extra?: string;
  onAct: () => void;
  onSpeedUp: () => void;
  onInstant: () => void;
  busy: boolean;
}) {
  const enoughCoins = !wallet || wallet.coins >= cost;
  const enoughGems = !wallet || wallet.gems >= gems;

  return (
    <div className="pretty-card p-3 flex flex-col gap-2 text-center">
      <div className="text-2xl">{icon}</div>
      <div>
        <p className="text-sm font-semibold leading-tight">{label}</p>
        <p className="text-[10px] text-muted-foreground">+{xp} XP{petals ? ` · +${petals} 🌸` : ""}</p>
      </div>
      {extra ? (
        <Button size="sm" variant="outline" disabled className="w-full">{extra}</Button>
      ) : ready ? (
        <Button size="sm" disabled={busy} onClick={onAct} className="w-full">
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Do it"}
        </Button>
      ) : (
        <div className="space-y-1">
          <p className="text-[11px] text-muted-foreground tabular-nums">{formatMs(remaining)}</p>
          <Button
            size="sm"
            variant="soft"
            disabled={busy || !enoughCoins}
            onClick={onSpeedUp}
            className="w-full text-[11px]"
            title={enoughCoins ? "" : "Not enough coins"}
          >
            <Zap className="h-3 w-3" /> {cost} 🪙
          </Button>
          <Button
            size="sm"
            variant="gold"
            disabled={busy || !enoughGems}
            onClick={onInstant}
            className="w-full text-[11px]"
            title={enoughGems ? "" : "Not enough gems"}
          >
            <Crown className="h-3 w-3" /> {gems} 💎
          </Button>
        </div>
      )}
    </div>
  );
}

function prettyError(msg: string) {
  const map: Record<string, string> = {
    COOLDOWN: "Not yet — give it time",
    NOT_READY: "Not ready to harvest yet",
    WILTED_REVIVE_FIRST: "Water it first to recover",
    INSUFFICIENT_FUNDS: "Not enough — try a different action",
    NEEDS_FERTILIZER: "You need fertilizer (find it in the shop)",
    RATE_LIMITED: "Slow down a moment 💚",
    ALREADY_READY: "Already ready",
  };
  return map[msg] ?? msg;
}
