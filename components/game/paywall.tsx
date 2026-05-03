"use client";

import Link from "next/link";
import { Crown } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function Paywall({
  open,
  onOpenChange,
  reason,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-bloom-lavender">
            <Crown className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">Need a few gems</DialogTitle>
          <DialogDescription className="text-center">{reason}</DialogDescription>
        </DialogHeader>
        <ul className="text-sm space-y-1.5 px-1">
          <li>💎 Skip any cooldown instantly</li>
          <li>💎 Unlock new biomes (Forest, Coastal, Desert…)</li>
          <li>💎 Buy rare seeds and seasonal items</li>
        </ul>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Maybe later
          </Button>
          <Button asChild variant="gold">
            <Link href="/app/billing">Get gems</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
