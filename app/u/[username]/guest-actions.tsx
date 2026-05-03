"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { leaveNote, reactToGarden } from "@/server/actions/social";
import { toast } from "@/components/ui/toast";
import { Heart, Sparkles, Sun, Droplet, Star } from "lucide-react";

export function GuestActions({ gardenId, recipientUsername }: { gardenId: string; recipientUsername: string }) {
  const [text, setText] = useState("");
  const [busy, start] = useTransition();
  const router = useRouter();

  const reactions = [
    { kind: "HEART" as const, icon: Heart, label: "Heart" },
    { kind: "SPARKLE" as const, icon: Sparkles, label: "Sparkle" },
    { kind: "SUN" as const, icon: Sun, label: "Sun" },
    { kind: "WATER" as const, icon: Droplet, label: "Water" },
    { kind: "STAR" as const, icon: Star, label: "Star" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {reactions.map((r) => {
          const Icon = r.icon;
          return (
            <Button
              key={r.kind}
              variant="soft"
              size="sm"
              disabled={busy}
              onClick={() =>
                start(async () => {
                  try {
                    await reactToGarden(gardenId, r.kind);
                    toast.success(`${r.label}!`);
                    router.refresh();
                  } catch (e: any) {
                    toast.error(e?.message ?? "Could not react");
                  }
                })
              }
            >
              <Icon className="h-4 w-4" /> {r.label}
            </Button>
          );
        })}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          start(async () => {
            try {
              await leaveNote({ content: text.trim(), recipientUsername });
              toast.success("Note left");
              setText("");
              router.refresh();
            } catch (err: any) {
              const m = err?.message ?? "";
              if (m.startsWith("MODERATION:")) {
                toast.error("Try a kinder, shorter note (no links).");
              } else {
                toast.error(m || "Could not send");
              }
            }
          });
        }}
      >
        <Input
          maxLength={280}
          placeholder="Say something kind…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
        />
        <Button type="submit" disabled={busy}>Send</Button>
      </form>
    </div>
  );
}
