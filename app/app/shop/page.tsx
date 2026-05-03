import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShopItemCard } from "./shop-item-card";
import { COIN_PACKS, PLUS_PLANS } from "@/lib/config";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";

export default async function ShopPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [items, user] = await Promise.all([
    prisma.shopItem.findMany({
      where: { isActive: true, kind: { not: "COIN_PACK" } },
      orderBy: [{ isFeatured: "desc" }, { unlockLevel: "asc" }, { price: "asc" }],
    }),
    prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { level: true, subscriptionTier: true },
    }),
  ]);

  const groups = {
    seeds: items.filter((i) => i.kind === "SEED"),
    decorations: items.filter((i) => i.kind === "DECORATION"),
    themes: items.filter((i) => i.kind === "THEME"),
    consumables: items.filter((i) => i.kind === "CONSUMABLE"),
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-bloom-gold/30 via-card to-bloom-peach/40">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="display flex items-center gap-2">
              <Crown className="h-5 w-5" /> Bloom Coins
            </CardTitle>
            <CardDescription>Unlock premium plants & decor</CardDescription>
          </div>
          <Button asChild variant="gold">
            <Link href="/app/billing">Get coins</Link>
          </Button>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="display">Shop</CardTitle>
          <CardDescription>Spend petals on seeds & gifts. Coins on rare drops.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="seeds">
            <TabsList>
              <TabsTrigger value="seeds">Seeds</TabsTrigger>
              <TabsTrigger value="decorations">Decor</TabsTrigger>
              <TabsTrigger value="themes">Themes</TabsTrigger>
              <TabsTrigger value="consumables">Items</TabsTrigger>
            </TabsList>
            {(["seeds", "decorations", "themes", "consumables"] as const).map((k) => (
              <TabsContent key={k} value={k} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {groups[k].length === 0 && <p className="text-sm text-muted-foreground">Nothing here yet.</p>}
                {groups[k].map((item) => (
                  <ShopItemCard
                    key={item.id}
                    item={{
                      id: item.id,
                      sku: item.sku,
                      name: item.name,
                      description: item.description,
                      kind: item.kind,
                      rarity: item.rarity,
                      priceCurrency: item.priceCurrency,
                      price: item.price,
                      isPremium: item.isPremium,
                      unlockLevel: item.unlockLevel,
                    }}
                    locked={user.level < item.unlockLevel || (item.isPremium && user.subscriptionTier !== "PLUS")}
                    lockReason={
                      user.level < item.unlockLevel
                        ? `Unlocks at level ${item.unlockLevel}`
                        : item.isPremium
                        ? "Plus only"
                        : undefined
                    }
                  />
                ))}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
