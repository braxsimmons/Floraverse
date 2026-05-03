"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setSpeciesActive } from "@/server/actions/admin";
import { toast } from "@/components/ui/toast";

export function TogglePlantActive({ sku, initialActive }: { sku: string; initialActive: boolean }) {
  const [active, setActive] = useState(initialActive);
  const [busy, start] = useTransition();
  return (
    <Button
      size="sm"
      variant={active ? "soft" : "outline"}
      disabled={busy}
      onClick={() =>
        start(async () => {
          try {
            const next = !active;
            await setSpeciesActive(sku, next);
            setActive(next);
            toast.success(next ? "Active" : "Hidden");
          } catch (e: any) {
            toast.error(e?.message ?? "Failed");
          }
        })
      }
    >
      {active ? "Active" : "Hidden"}
    </Button>
  );
}
