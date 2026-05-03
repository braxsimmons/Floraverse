import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShopRow } from "./row";

export default async function AdminShopPage() {
  const items = await prisma.shopItem.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <Card>
      <CardHeader><CardTitle>Shop items</CardTitle></CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="py-2">Name</th><th>Kind</th><th>Rarity</th><th>Price</th><th>Featured</th><th>Active</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => <ShopRow key={i.id} item={{ id: i.id, name: i.name, kind: i.kind, rarity: i.rarity, priceCurrency: i.priceCurrency, price: i.price, isFeatured: i.isFeatured, isActive: i.isActive }} />)}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
