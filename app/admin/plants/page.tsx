import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TogglePlantActive } from "./toggle";

export default async function AdminPlantsPage() {
  const plants = await prisma.plantSpecies.findMany({ orderBy: [{ unlockLevel: "asc" }, { name: "asc" }] });
  return (
    <Card>
      <CardHeader><CardTitle>Plants</CardTitle></CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr><th className="py-2">Name</th><th>Rarity</th><th>Lvl</th><th>Growth</th><th>Petals</th><th>XP</th><th>Premium</th></tr>
          </thead>
          <tbody>
            {plants.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="py-2 font-medium">{p.name}</td>
                <td><Badge variant="secondary">{p.rarity}</Badge></td>
                <td>{p.unlockLevel}</td>
                <td>{Math.round(p.baseGrowthMs / 3600000)}h</td>
                <td>{p.petalsPerHarvest}</td>
                <td>{p.xpPerHarvest}</td>
                <td><TogglePlantActive sku={p.sku} initialActive={true} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
