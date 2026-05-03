"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Droplets, Scissors, Leaf, Heart, Sparkles, Loader2 } from "lucide-react";
import { PlantArt } from "@/components/game/plant-art";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/toast";
import { waterPlant, harvestPlant, fertilizePlant, revivePlant } from "@/server/actions/care";
import { computeGrowth, formatMs } from "@/lib/plant-engine";
import { RarityBadge } from "@/components/game/rarity-badge";

type SlotData = {
  id: string;
  x: number;
  y: number;
  type: "PLANT" | "DECORATION" | "EMPTY";
  decorationId: string | null;
  userPlant: any | null;
};

export function GardenGrid({
  width,
  height,
  slots,
  readOnly,
  onSelectEmpty,
}: {
  width: number;
  height: number;
  slots: SlotData[];
  readOnly?: boolean;
  onSelectEmpty?: (x: number, y: number) => void;
}) {
  const [active, setActive] = useState<SlotData | null>(null);
  const [busy, setBusy] = useState(false);

  const cellMap = new Map<string, SlotData>();
  for (const s of slots) cellMap.set(`${s.x},${s.y}`, s);

  const cells: SlotData[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      cells.push(
        cellMap.get(`${x},${y}`) ?? {
          id: `empty-${x}-${y}`,
          x,
          y,
          type: "EMPTY",
          decorationId: null,
          userPlant: null,
        },
      );
    }
  }

  const action = async (fn: () => Promise<unknown>, success: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      toast.success(success);
      setActive(null);
    } catch (e: any) {
      toast.error(prettyError(e?.message ?? "Something went wrong"));
    } finally {
      setBusy(false);
    }
  };

  const live = active?.userPlant
    ? computeGrowth({ ...active.userPlant, species: active.userPlant.species })
    : null;

  return (
    <>
      <div
        className="grid gap-2 sm:gap-3 mx-auto p-3 rounded-3xl bg-gradient-to-br from-bloom-mint/40 via-card to-bloom-peach/30 border shadow-cozy"
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
              if (cell.userPlant) setActive(cell);
              else if (!readOnly && onSelectEmpty) onSelectEmpty(cell.x, cell.y);
            }}
            className={cn(
              "aspect-square rounded-2xl bg-card/70 border border-white/40 backdrop-blur-sm grid place-items-center transition-all",
              "hover:shadow-cozy hover:-translate-y-0.5",
              cell.type === "EMPTY" && !readOnly && "border-dashed border-primary/20 hover:bg-card",
              readOnly && cell.type === "EMPTY" && "opacity-50 cursor-default",
            )}
          >
            {cell.userPlant ? (
              <PlantArt
                imageSeed={cell.userPlant.species.imageSeed}
                stage={computeGrowth({ ...cell.userPlant, species: cell.userPlant.species }).stage}
                wilted={computeGrowth({ ...cell.userPlant, species: cell.userPlant.species }).wilted}
                size={70}
              />
            ) : cell.decorationId ? (
              <div className="text-3xl">🪴</div>
            ) : (
              <span className="text-xs text-muted-foreground">+</span>
            )}
          </motion.button>
        ))}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          {active?.userPlant && live && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle>{active.userPlant.species.name}</DialogTitle>
                    <DialogDescription>{active.userPlant.species.description}</DialogDescription>
                  </div>
                  <RarityBadge rarity={active.userPlant.species.rarity} />
                </div>
              </DialogHeader>

              <div className="flex items-center gap-4">
                <PlantArt
                  imageSeed={active.userPlant.species.imageSeed}
                  stage={live.stage}
                  wilted={live.wilted}
                  size={120}
                />
                <div className="flex-1 space-y-2 text-sm">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span>Growth</span>
                      <span className="font-medium">{Math.round(live.progress * 100)}%</span>
                    </div>
                    <Progress value={Math.round(live.progress * 100)} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span>Health</span>
                      <span className="font-medium">{live.health}/100</span>
                    </div>
                    <Progress value={live.health} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {live.harvestable
                      ? "Ready to harvest 🌟"
                      : live.wilted
                      ? "Wilted — revive to continue growing"
                      : `Next stage in ${formatMs(estimateNextStageMs(active.userPlant))}`}
                  </p>
                </div>
              </div>

              {!readOnly && (
                <div className="grid grid-cols-2 gap-2">
                  {live.wilted ? (
                    <Button
                      onClick={() => action(() => revivePlant({ userPlantId: active.userPlant!.id }), "Revived!")}
                      variant="soft"
                      disabled={busy}
                    >
                      <Heart className="h-4 w-4" /> Revive (30 🌸)
                    </Button>
                  ) : (
                    <Button
                      onClick={() => action(() => waterPlant({ userPlantId: active.userPlant!.id }), "Watered")}
                      disabled={busy}
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Droplets className="h-4 w-4" />}
                      Water
                    </Button>
                  )}

                  <Button
                    variant="soft"
                    disabled={busy || live.wilted}
                    onClick={() => action(() => fertilizePlant({ userPlantId: active.userPlant!.id }), "Fertilized")}
                  >
                    <Sparkles className="h-4 w-4" /> Fertilize
                  </Button>

                  {live.harvestable && (
                    <Button
                      variant="gold"
                      className="col-span-2"
                      disabled={busy}
                      onClick={() => action(() => harvestPlant({ userPlantId: active.userPlant!.id }), "Harvested!")}
                    >
                      <Scissors className="h-4 w-4" /> Harvest
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function estimateNextStageMs(plant: any) {
  const live = computeGrowth({ ...plant, species: plant.species });
  const total = plant.species.baseGrowthMs;
  const thresholds = [0.2, 0.55, 0.85, 1];
  for (const t of thresholds) {
    if (t > live.progress) {
      return Math.max(0, t * total - live.effectiveAccum);
    }
  }
  return 0;
}

function prettyError(msg: string) {
  const map: Record<string, string> = {
    COOLDOWN: "Already watered recently",
    NOT_READY: "Not ready to harvest yet",
    WILTED_REVIVE_FIRST: "Revive this plant first",
    INSUFFICIENT_FUNDS: "Not enough petals",
    NEEDS_FERTILIZER: "You need fertilizer (find it in the shop)",
    RATE_LIMITED: "Slow down a moment 💚",
  };
  return map[msg] ?? msg;
}
