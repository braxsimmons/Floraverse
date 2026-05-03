"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Gift, Clock } from "lucide-react";
import { dailyClaim, timedClaim } from "@/server/actions/rewards";
import { toast } from "@/components/ui/toast";

export function DailyClaimButton({ claimed, streak }: { claimed: boolean; streak: number }) {
  const [loading, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      disabled={claimed || loading}
      className="w-full"
      onClick={() =>
        start(async () => {
          try {
            const r = await dailyClaim();
            toast.success(`+${r.petals} 🌸  +${r.xp} XP${r.coins ? ` +${r.coins} 🪙` : ""}`);
            router.refresh();
          } catch (e: any) {
            toast.error(e?.message ?? "Could not claim");
          }
        })
      }
    >
      <Gift className="h-4 w-4" />
      {claimed ? "Claimed today" : `Claim · ${50 + Math.min(streak, 14) * 10} 🌸`}
    </Button>
  );
}

export function TimedClaimButton({ ready, nextAt }: { ready: boolean; nextAt: Date | null }) {
  const [loading, start] = useTransition();
  const router = useRouter();
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const remaining = nextAt ? Math.max(0, new Date(nextAt).getTime() - now) : 0;
  const label = ready ? "Claim · 25 🌸" : `Ready in ${formatCountdown(remaining)}`;
  return (
    <Button
      variant="soft"
      disabled={!ready || loading}
      className="w-full"
      onClick={() =>
        start(async () => {
          try {
            const r = await timedClaim();
            toast.success(`+${r.petals} 🌸  +${r.xp} XP`);
            router.refresh();
          } catch (e: any) {
            toast.error(e?.message ?? "Could not claim");
          }
        })
      }
    >
      <Clock className="h-4 w-4" />
      {label}
    </Button>
  );
}

function formatCountdown(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}
