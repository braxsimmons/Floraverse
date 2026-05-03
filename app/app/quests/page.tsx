import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ensureDailyQuests, ensureWeeklyQuests } from "@/lib/quests";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuestCard } from "./quest-card";

export default async function QuestsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [daily, weekly] = await Promise.all([
    ensureDailyQuests(session.user.id),
    ensureWeeklyQuests(session.user.id),
  ]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="display">Quests</CardTitle>
          <CardDescription>Small things, every day. Bigger things, every week.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="daily">
            <TabsList>
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
            </TabsList>
            <TabsContent value="daily" className="grid sm:grid-cols-2 gap-3">
              {daily.length === 0 && <p className="text-sm text-muted-foreground">No daily quests today.</p>}
              {daily.map((q) => (
                <QuestCard
                  key={q.id}
                  id={q.id}
                  title={q.quest.title}
                  description={q.quest.description}
                  progress={q.progress}
                  goal={q.goal}
                  completed={!!q.completedAt}
                  claimed={!!q.claimedAt}
                  rewardPetals={q.quest.rewardPetals}
                  rewardCoins={q.quest.rewardCoins}
                  rewardXp={q.quest.rewardXp}
                />
              ))}
            </TabsContent>
            <TabsContent value="weekly" className="grid sm:grid-cols-2 gap-3">
              {weekly.length === 0 && <p className="text-sm text-muted-foreground">No weekly quests yet.</p>}
              {weekly.map((q) => (
                <QuestCard
                  key={q.id}
                  id={q.id}
                  title={q.quest.title}
                  description={q.quest.description}
                  progress={q.progress}
                  goal={q.goal}
                  completed={!!q.completedAt}
                  claimed={!!q.claimedAt}
                  rewardPetals={q.quest.rewardPetals}
                  rewardCoins={q.quest.rewardCoins}
                  rewardXp={q.quest.rewardXp}
                />
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
