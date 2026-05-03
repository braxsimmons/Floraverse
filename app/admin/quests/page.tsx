import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminQuestsPage() {
  const quests = await prisma.quest.findMany({ orderBy: { kind: "asc" } });
  return (
    <Card>
      <CardHeader><CardTitle>Quests</CardTitle></CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr><th className="py-2">Title</th><th>Kind</th><th>Action</th><th>Goal</th><th>Reward</th></tr>
          </thead>
          <tbody>
            {quests.map((q) => (
              <tr key={q.id} className="border-t">
                <td className="py-2 font-medium">{q.title}</td>
                <td><Badge variant="secondary">{q.kind}</Badge></td>
                <td>{q.actionKey}</td>
                <td>{q.goal}</td>
                <td className="text-xs text-muted-foreground">+{q.rewardPetals} 🌸 / +{q.rewardCoins} 🪙 / +{q.rewardXp} XP</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
