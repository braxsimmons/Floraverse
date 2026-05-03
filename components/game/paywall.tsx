"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
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
          <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-bloom-gold">
            <Sparkles className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">Floraverse Plus</DialogTitle>
          <DialogDescription className="text-center">{reason}</DialogDescription>
        </DialogHeader>
        <ul className="text-sm space-y-1.5 px-1">
          <li>✦ Streak protection — never lose your streak</li>
          <li>✦ Bigger garden — more slots</li>
          <li>✦ Premium plants & seasonal items</li>
          <li>✦ 1.5× petal harvests</li>
          <li>✦ 100 Bloom Coins / month</li>
        </ul>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Maybe later
          </Button>
          <Button asChild variant="gold">
            <Link href="/app/billing">See plans</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
