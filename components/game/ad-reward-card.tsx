"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Loader2 } from "lucide-react";
import { claimAdReward } from "@/server/actions/ads";
import { toast } from "@/components/ui/toast";

export function AdRewardCard({
  initial,
}: {
  initial: { ready: boolean; remainingMs: number; watchedToday: number; dailyCap: number; reward: { coins: number; petals: number } };
}) {
  const router = useRouter();
  const [now, setNow] = useState<number>(Date.now());
  const [busy, start] = useTransition();
  const [stage, setStage] = useState<"idle" | "watching">("idle");
  const [until, setUntil] = useState<number>(Date.now() + initial.remainingMs);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    setUntil(Date.now() + initial.remainingMs);
  }, [initial.remainingMs]);

  const remaining = Math.max(0, until - now);
  const ready = remaining === 0 && initial.watchedToday < initial.dailyCap;
  const capReached = initial.watchedToday >= initial.dailyCap;

  if (capReached && remaining === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Watched today: {initial.watchedToday}/{initial.dailyCap}</CardTitle>
          <CardDescription>Daily limit reached. Come back tomorrow for free coins.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-bloom-gold/30 via-card to-bloom-peach/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">🎬 Free coins</CardTitle>
        <CardDescription className="text-xs">
          Watch a quick ad → +{initial.reward.coins} 🪙 +{initial.reward.petals} 🌸
          {" · "}{initial.watchedToday}/{initial.dailyCap} today
        </CardDescription>
      </CardHeader>
      <CardContent>
        {stage === "watching" ? (
          <div className="rounded-xl bg-card p-4 text-center space-y-2 border">
            <div className="text-3xl">📺</div>
            <p className="text-sm text-muted-foreground">Pretending to play an ad…</p>
            <Button
              size="sm"
              variant="gold"
              disabled={busy}
              onClick={() =>
                start(async () => {
                  try {
                    const r = await claimAdReward();
                    toast.success(`+${r.coins} 🪙 · +${r.petals} 🌸`);
                    setStage("idle");
                    router.refresh();
                  } catch (e: any) {
                    toast.error(e?.message ?? "Could not claim");
                    setStage("idle");
                  }
                })
              }
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "I watched it — give me my reward"}
            </Button>
          </div>
        ) : (
          <Button
            disabled={!ready || busy}
            className="w-full"
            variant="gold"
            onClick={() => setStage("watching")}
          >
            <Play className="h-4 w-4" />
            {ready ? "Watch ad" : `Next in ${formatMs(remaining)}`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}
