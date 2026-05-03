import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { GardenClient } from "./garden-client";

export default async function GardenPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [garden, seeds] = await Promise.all([
    prisma.garden.findUnique({
      where: { userId: session.user.id },
      include: { slots: { include: { userPlant: { include: { species: true } } } } },
    }),
    prisma.inventoryItem.findMany({
      where: { userId: session.user.id, shopItem: { kind: "SEED" } },
      include: { shopItem: { include: { } } },
    }),
  ]);

  if (!garden) redirect("/app");

  // Plain serializable shape
  const slots = garden.slots.map((s) => ({
    id: s.id,
    x: s.x,
    y: s.y,
    type: s.type,
    decorationId: s.decorationId,
    userPlant: s.userPlant
      ? {
          ...s.userPlant,
          species: s.userPlant.species,
        }
      : null,
  }));

  const seedInventory = seeds.map((i) => ({
    id: i.shopItemId,
    name: i.shopItem.name,
    sku: i.shopItem.sku,
    rarity: i.shopItem.rarity,
    quantity: i.quantity,
  }));

  return (
    <GardenClient
      garden={{ id: garden.id, name: garden.name, width: garden.width, height: garden.height }}
      slots={slots as any}
      seeds={seedInventory}
    />
  );
}
