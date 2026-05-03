"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { GardenGrid } from "@/components/game/garden-grid";
import { plantSeed } from "@/server/actions/garden";
import { toast } from "@/components/ui/toast";
import { ShoppingBag, Sparkles } from "lucide-react";
import { RarityBadge } from "@/components/game/rarity-badge";
import { biomeMeta } from "@/lib/config";
import type { PlantView } from "@/lib/plant-engine";

export type GardenSlotView = {
  id: string;
  x: number;
  y: number;
  type: "PLANT" | "DECORATION" | "EMPTY";
  decorationId: string | null;
  plant: PlantView | null;
};

export function GardenClient({
  garden,
  slots,
  seeds,
  fertilizerCount,
  wallet,
}: {
  garden: { id: string; name: string; biome: string; width: number; height: number };
  slots: GardenSlotView[];
  seeds: { id: string; name: string; sku: string; rarity: string; quantity: number }[];
  fertilizerCount: number;
  wallet: { petals: number; coins: number; gems: number };
}) {
  const [pickerOpen, setPickerOpen] = useState<{ x: number; y: number } | null>(null);
  const [busy, start] = useTransition();
  const router = useRouter();
  const meta = biomeMeta(garden.biome);

  return (
    <div className="space-y-4">
      <Card className={`bg-gradient-to-br ${meta.bg}`}>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{meta.emoji}</span>
              <CardTitle className="display truncate">{garden.name}</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">{meta.name} · tap a plant to care for it · tap a plot to plant</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href="/app/shop"><ShoppingBag className="h-4 w-4" /> <span className="hidden sm:inline">Shop seeds</span></Link>
          </Button>
        </CardHeader>
        <CardContent>
          <GardenGrid
            width={garden.width}
            height={garden.height}
            slots={slots}
            wallet={wallet}
            fertilizerCount={fertilizerCount}
            onSelectEmpty={(x, y) => setPickerOpen({ x, y })}
          />
        </CardContent>
      </Card>

      <Dialog open={!!pickerOpen} onOpenChange={(o) => !o && setPickerOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Plant a seed</DialogTitle>
            <DialogDescription>Choose from your inventory.</DialogDescription>
          </DialogHeader>
          {seeds.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">You don't have any seeds yet.</p>
              <Button asChild variant="default" className="w-full">
                <Link href="/app/shop">Visit the shop</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[60vh] overflow-y-auto">
              {seeds.map((s) => (
                <button
                  key={s.id}
                  className="pretty-card p-3 text-left hover:shadow-cozy transition disabled:opacity-50 active:scale-[0.97]"
                  disabled={busy}
                  onClick={() =>
                    start(async () => {
                      try {
                        await plantSeed({ shopItemId: s.id, x: pickerOpen!.x, y: pickerOpen!.y });
                        toast.success(`Planted ${s.name}`);
                        setPickerOpen(null);
                        router.refresh();
                      } catch (e: any) {
                        toast.error(e?.message ?? "Could not plant");
                      }
                    })
                  }
                >
                  <div className="text-3xl mb-1">🌱</div>
                  <p className="font-medium text-sm">{s.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <RarityBadge rarity={s.rarity} />
                    <span className="text-xs text-muted-foreground">×{s.quantity}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
