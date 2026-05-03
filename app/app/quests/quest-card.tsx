"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { claim } from "@/server/actions/quests";
import { toast } from "@/components/ui/toast";

export function QuestCard(props: {
  id: string;
  title: string;
  description: string;
  progress: number;
  goal: number;
  completed: boolean;
  claimed: boolean;
  rewardPetals: number;
  rewardCoins: number;
  rewardXp: number;
}) {
  const [busy, start] = useTransition();
  const router = useRouter();
  const pct = Math.min(100, Math.round((props.progress / props.goal) * 100));

  return (
    <div className="pretty-card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{props.title}</h3>
          <p className="text-sm text-muted-foreground">{props.description}</p>
        </div>
        <div className="flex gap-1">
          {props.rewardPetals > 0 && <Badge variant="rose">+{props.rewardPetals} 🌸</Badge>}
          {props.rewardCoins > 0 && <Badge variant="gold">+{props.rewardCoins} 🪙</Badge>}
          {props.rewardXp > 0 && <Badge variant="mint">+{props.rewardXp} XP</Badge>}
        </div>
      </div>
      <div>
        <Progress value={pct} />
        <p className="text-xs text-muted-foreground mt-1">{props.progress}/{props.goal}</p>
      </div>
      {props.claimed ? (
        <Button disabled variant="soft" className="w-full">Claimed</Button>
      ) : (
        <Button
          disabled={!props.completed || busy}
          onClick={() =>
            start(async () => {
              try {
                await claim({ progressId: props.id });
                toast.success("Reward claimed");
                router.refresh();
              } catch (e: any) {
                toast.error(e?.message ?? "Could not claim");
              }
            })
          }
        >
          {props.completed ? "Claim" : "In progress"}
        </Button>
      )}
    </div>
  );
}
