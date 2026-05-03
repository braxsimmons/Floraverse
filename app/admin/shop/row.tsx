"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setShopItem } from "@/server/actions/admin";
import { toast } from "@/components/ui/toast";

export function ShopRow({
  item,
}: {
  item: { id: string; name: string; kind: string; rarity: string; priceCurrency: string; price: number; isFeatured: boolean; isActive: boolean };
}) {
  const [s, setS] = useState(item);
  const [busy, start] = useTransition();
  const update = (patch: Partial<typeof item>) =>
    start(async () => {
      try {
        await setShopItem({ id: item.id, ...patch });
        setS({ ...s, ...patch } as typeof item);
      } catch (e: any) {
        toast.error(e?.message ?? "Failed");
      }
    });
  return (
    <tr className="border-t">
      <td className="py-2 font-medium">{s.name}</td>
      <td><Badge variant="secondary">{s.kind}</Badge></td>
      <td>{s.rarity}</td>
      <td>
        <Input
          type="number"
          className="h-8 w-24"
          defaultValue={s.price}
          onBlur={(e) => update({ price: Number(e.target.value) })}
        />
        <span className="ml-1 text-xs text-muted-foreground">{s.priceCurrency}</span>
      </td>
      <td>
        <Button size="sm" variant={s.isFeatured ? "soft" : "outline"} disabled={busy} onClick={() => update({ isFeatured: !s.isFeatured })}>
          {s.isFeatured ? "Featured" : "Feature"}
        </Button>
      </td>
      <td>
        <Button size="sm" variant={s.isActive ? "soft" : "outline"} disabled={busy} onClick={() => update({ isActive: !s.isActive })}>
          {s.isActive ? "Active" : "Hidden"}
        </Button>
      </td>
    </tr>
  );
}
