"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Crown } from "lucide-react";
import { purchaseShopItem } from "@/server/actions/shop";
import { toast } from "@/components/ui/toast";
import { Paywall } from "@/components/game/paywall";
import { RarityBadge } from "@/components/game/rarity-badge";

export function ShopItemCard({
  item,
  locked,
  lockReason,
}: {
  item: {
    id: string;
    sku: string;
    name: string;
    description: string;
    kind: string;
    rarity: string;
    priceCurrency: "PETALS" | "COINS" | "USD";
    price: number;
    isPremium: boolean;
    unlockLevel: number;
  };
  locked?: boolean;
  lockReason?: string;
}) {
  const [busy, start] = useTransition();
  const [paywall, setPaywall] = useState(false);
  const router = useRouter();

  const currencyIcon = item.priceCurrency === "PETALS" ? "🌸" : item.priceCurrency === "COINS" ? "🪙" : "$";

  return (
    <div className="pretty-card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{item.name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
        </div>
        <RarityBadge rarity={item.rarity} />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <span>{currencyIcon}</span>
          <span>{item.price}</span>
        </div>
        {item.isPremium && <Badge variant="gold"><Crown className="h-3 w-3 mr-1" /> Plus</Badge>}
      </div>

      {locked ? (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            if (item.isPremium) setPaywall(true);
            else toast.message(lockReason ?? "Locked");
          }}
        >
          <Lock className="h-4 w-4" /> {lockReason ?? "Locked"}
        </Button>
      ) : (
        <Button
          className="w-full"
          disabled={busy}
          onClick={() =>
            start(async () => {
              try {
                await purchaseShopItem({ shopItemId: item.id, quantity: 1 });
                toast.success(`Purchased ${item.name}`);
                router.refresh();
              } catch (e: any) {
                const msg = e?.message ?? "Could not buy";
                if (msg === "INSUFFICIENT_FUNDS") toast.error("Not enough funds");
                else if (msg === "PLUS_REQUIRED") setPaywall(true);
                else toast.error(msg);
              }
            })
          }
        >
          Buy
        </Button>
      )}

      <Paywall open={paywall} onOpenChange={setPaywall} reason="This item is part of Floraverse Plus." />
    </div>
  );
}
