import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { COIN_PACKS, PLUS_PLANS } from "@/lib/config";
import { CheckoutButton, ManagePortalButton } from "./checkout-buttons";
import { Badge } from "@/components/ui/badge";
import { Crown, Sparkles } from "lucide-react";

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { subscriptionTier: true, stripeCustomerId: true, subscriptionEndsAt: true },
  });

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-bloom-gold/30 via-card to-bloom-peach/40">
        <CardHeader>
          <CardTitle className="display flex items-center gap-2">
            <Crown className="h-5 w-5" /> Floraverse Plus
          </CardTitle>
          <CardDescription>
            {user.subscriptionTier === "PLUS"
              ? `You're a Plus member${user.subscriptionEndsAt ? ` · renews ${user.subscriptionEndsAt.toLocaleDateString()}` : ""}.`
              : "Upgrade to unlock premium plants, streak protection, and more."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          {PLUS_PLANS.map((p) => (
            <div key={p.sku} className="pretty-card p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="text-sm text-muted-foreground">${(p.priceCents / 100).toFixed(2)} / {p.interval}</p>
              </div>
              {user.subscriptionTier === "PLUS" ? (
                <Badge variant="gold">Active</Badge>
              ) : (
                <CheckoutButton sku={p.sku} mode="subscription" priceId={p.priceId} />
              )}
            </div>
          ))}
          {user.subscriptionTier === "PLUS" && user.stripeCustomerId && (
            <div className="sm:col-span-2">
              <ManagePortalButton />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" /> Bloom Coin packs
          </CardTitle>
          <CardDescription>Premium currency for rare seeds, decor, and themes.</CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-3">
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
    </div>
  );
}
