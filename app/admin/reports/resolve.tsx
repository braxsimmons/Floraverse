"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { resolveReport } from "@/server/actions/admin";
import { toast } from "@/components/ui/toast";

export function ResolveReport({ id }: { id: string }) {
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
            await resolveReport(id, "DISMISSED");
            router.refresh();
          })
        }
      >
        Dismiss
      </Button>
      <Button
        size="sm"
        disabled={busy}
        onClick={() =>
          start(async () => {
            await resolveReport(id, "RESOLVED");
            toast.success("Marked resolved");
            router.refresh();
          })
        }
      >
        Resolve
      </Button>
    </div>
  );
}
