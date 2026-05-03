import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { loadDashboard } from "@/server/queries/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, Gift, Clock, Sparkles, Sprout } from "lucide-react";
import { DailyClaimButton, TimedClaimButton } from "./reward-buttons";
import { PlantArt } from "@/components/game/plant-art";
import { formatRelativeTime } from "@/lib/utils";
import { AdRewardCard } from "@/components/game/ad-reward-card";
import { adAvailability } from "@/server/actions/ads";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const [data, ads] = await Promise.all([loadDashboard(session.user.id), adAvailability()]);

  const xpPct = Math.floor(((data.user.xpInLevel) / Math.max(1, data.user.xpToNext)) * 100);
  const upcoming = data.plants
    .filter((p) => !p.harvestable && !p.wilted)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 4);
  const ready = data.plants.filter((p) => p.harvestable);

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="sm:col-span-2 bg-gradient-to-br from-bloom-mint/30 via-card to-bloom-peach/30">
          <CardHeader>
            <CardDescription>Hi, {data.user.name ?? "friend"} 👋</CardDescription>
            <CardTitle className="text-3xl display">Level {data.user.level}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{data.user.xpInLevel} / {data.user.xpToNext} XP</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-bloom-rose" /> {data.user.streakCount} day streak</span>
              <Badge variant="lavender" className="ml-auto">{data.user.gems} 💎</Badge>
            </div>
            <Progress value={xpPct} />
            <div className="flex flex-wrap gap-2 pt-2">
              <Button asChild><Link href="/app/garden"><Sprout className="h-4 w-4" /> Tend garden</Link></Button>
              <Button asChild variant="outline"><Link href="/app/quests">Today's quests</Link></Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" /> Daily reward
            </CardTitle>
            <CardDescription>
              {data.rewards.dailyClaimed ? "Claimed for today" : "A little something for showing up."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <DailyClaimButton claimed={data.rewards.dailyClaimed} streak={data.user.streakCount} />
            <div className="text-sm flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" /> Timed reward
            </div>
            <TimedClaimButton ready={data.rewards.timedReady} nextAt={data.rewards.timedReadyAt} />
          </CardContent>
        </Card>
      </div>

      {ads.enabled && (
        <AdRewardCard
          initial={{
            ready: ads.ready,
            remainingMs: ads.remainingMs,
            watchedToday: ads.watchedToday,
            dailyCap: ads.dailyCap,
            reward: ads.reward,
          }}
        />
      )}

      {ready.length > 0 && (
        <Card className="bg-gradient-to-br from-bloom-gold/30 via-card to-bloom-peach/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" /> Ready to harvest
            </CardTitle>
            <CardDescription>{ready.length} plant{ready.length === 1 ? "" : "s"} are ready.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {ready.map((p) => (
                <div key={p.id} className="pretty-card p-3 min-w-[140px] flex flex-col items-center">
                  <PlantArt imageSeed={p.imageSeed} stage="BLOOMING" size={70} />
                  <p className="text-sm font-medium mt-1">{p.name}</p>
                  <Badge variant="gold" className="mt-1">Ready</Badge>
                </div>
              ))}
            </div>
            <Button asChild className="mt-3"><Link href="/app/garden">Open garden</Link></Button>
          </CardContent>
        </Card>
      )}

      {upcoming.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Growing now</CardTitle>
            <CardDescription>The closest blooms to ready.</CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {upcoming.map((p) => (
              <div key={p.id} className="pretty-card p-3 flex items-center gap-3">
                <PlantArt imageSeed={p.imageSeed} stage={p.stage as any} size={56} wilted={p.wilted} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{p.name}</p>
                  <Progress value={Math.round(p.progress * 100)} className="mt-1" />
                  <p className="text-xs text-muted-foreground mt-1">{Math.round(p.progress * 100)}%</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recent.length === 0 && (
              <p className="text-sm text-muted-foreground">No activity yet — your garden awaits.</p>
            )}
            {data.recent.map((a) => (
              <div key={a.id} className="text-sm flex items-center justify-between gap-3 border-b last:border-b-0 py-1.5">
                <span className="capitalize">{a.event.replace(/_/g, " ")}</span>
                <span className="text-xs text-muted-foreground">{formatRelativeTime(a.createdAt)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.notifications.length === 0 && (
              <p className="text-sm text-muted-foreground">All caught up.</p>
            )}
            {data.notifications.map((n) => (
              <div key={n.id} className="text-sm">
                <p className="font-medium">{n.title}</p>
                {n.body && <p className="text-muted-foreground">{n.body}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
