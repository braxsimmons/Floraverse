"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toggleBan, grantCurrency } from "@/server/actions/admin";
import { toast } from "@/components/ui/toast";

export function UserActions({ userId, banned }: { userId: string; banned: boolean }) {
  const [busy, start] = useTransition();
  const router = useRouter();
  return (
    <div className="flex gap-2 justify-end">
      <Button
        size="sm"
        variant="soft"
        disabled={busy}
        onClick={() =>
          start(async () => {
            const amount = Number(prompt("Grant petals (negative to subtract):", "100"));
            if (!Number.isFinite(amount) || amount === 0) return;
            try {
              await grantCurrency(userId, "PETALS", amount);
              toast.success("Updated");
              router.refresh();
            } catch (e: any) {
              toast.error(e?.message ?? "Failed");
            }
          })
        }
      >
        Adjust 🌸
      </Button>
      <Button
        size="sm"
        variant={banned ? "outline" : "destructive"}
        disabled={busy}
        onClick={() =>
          start(async () => {
            try {
              await toggleBan(userId);
              router.refresh();
            } catch (e: any) {
              toast.error(e?.message ?? "Failed");
            }
          })
        }
      >
        {banned ? "Unban" : "Ban"}
      </Button>
    </div>
  );
}
