import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { COIN_PACKS, GEM_PACKS } from "@/lib/config";
import { CheckoutButton } from "./checkout-buttons";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Crown } from "lucide-react";

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-bloom-lavender/30 via-card to-bloom-rose/30">
        <CardHeader>
          <CardTitle className="display flex items-center gap-2">
            <Crown className="h-5 w-5" /> Gems
          </CardTitle>
          <CardDescription>Skip cooldowns instantly · unlock new biomes · grab rare seeds.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {GEM_PACKS.map((g) => (
            <div key={g.sku} className="pretty-card p-4 text-center">
              <div className="text-3xl mb-1">💎</div>
              <p className="font-semibold">{g.name}</p>
              <p className="text-2xl display">{g.gems}</p>
              {g.bonus && <Badge variant="lavender" className="mt-1">{g.bonus}</Badge>}
              <p className="text-sm text-muted-foreground mt-2">${(g.priceCents / 100).toFixed(2)}</p>
              <CheckoutButton sku={g.sku} mode="payment" priceId={g.priceId} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" /> Coins
          </CardTitle>
          <CardDescription>Speed up plant care, buy decor, send gifts.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {COIN_PACKS.map((c) => (
            <div key={c.sku} className="pretty-card p-4 text-center">
              <div className="text-3xl mb-1">🪙</div>
              <p className="font-semibold">{c.name}</p>
              <p className="text-2xl display">{c.coins}</p>
              {c.bonus && <Badge variant="gold" className="mt-1">{c.bonus}</Badge>}
              <p className="text-sm text-muted-foreground mt-2">${(c.priceCents / 100).toFixed(2)}</p>
              <CheckoutButton sku={c.sku} mode="payment" priceId={c.priceId} />
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Floraverse is free to play forever. Currency is optional and never required.
      </p>
    </div>
  );
}
