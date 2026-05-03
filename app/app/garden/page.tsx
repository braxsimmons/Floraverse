import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { toPlantView } from "@/lib/plant-engine";
import { GardenClient } from "./garden-client";

export const dynamic = "force-dynamic";

export default async function GardenPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [garden, seeds, fertCount, user] = await Promise.all([
    prisma.garden.findUnique({
      where: { userId: session.user.id },
      include: { slots: { include: { userPlant: { include: { species: true } } } } },
    }),
    prisma.inventoryItem.findMany({
      where: { userId: session.user.id, shopItem: { kind: "SEED" } },
      include: { shopItem: true },
    }),
    prisma.inventoryItem.findFirst({
      where: { userId: session.user.id, shopItem: { sku: "shop_con_fertilizer" } },
    }),
    prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { petals: true, bloomCoins: true, gems: true },
    }),
  ]);
  if (!garden) redirect("/app");

  const now = new Date();
  const slots = garden.slots.map((s) => ({
    id: s.id,
    x: s.x,
    y: s.y,
    type: s.type,
    decorationId: s.decorationId,
    plant: s.userPlant ? toPlantView({ ...s.userPlant, species: s.userPlant.species }, now) : null,
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
      garden={{ id: garden.id, name: garden.name, biome: garden.biome, width: garden.width, height: garden.height }}
      slots={slots}
      seeds={seedInventory}
      fertilizerCount={fertCount?.quantity ?? 0}
      wallet={{ petals: user.petals, coins: user.bloomCoins, gems: user.gems }}
    />
  );
}
