import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "./profile-form";
import { levelForXp } from "@/lib/level";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const me = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    include: { profile: true, garden: true, achievements: { include: { achievement: true } } },
  });
  const xpInfo = levelForXp(me.xp);
  const xpPct = Math.floor(xpInfo.xpInLevel / Math.max(1, xpInfo.xpToNext) * 100);

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-bloom-mint/30 via-card to-bloom-lavender/30">
        <CardHeader>
          <CardTitle className="display text-2xl">{me.name ?? me.username}</CardTitle>
          <CardDescription>@{me.username} · Level {me.level}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={xpPct} />
          <div className="text-sm text-muted-foreground">
            {xpInfo.xpInLevel}/{xpInfo.xpToNext} XP · {me.streakCount} day streak
          </div>
          <div className="flex flex-wrap gap-2">
            {me.subscriptionTier === "PLUS" && <Badge variant="gold">Floraverse Plus</Badge>}
            <Badge variant="rose">{me.petals} 🌸</Badge>
            <Badge variant="gold">{me.bloomCoins} 🪙</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your details</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm
            initial={{
              bio: me.profile?.bio ?? "",
              pronouns: me.profile?.pronouns ?? "",
              location: me.profile?.location ?? "",
              gardenName: me.garden?.name ?? "",
              gardenIsPublic: me.garden?.isPublic ?? true,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Achievements</CardTitle>
          <CardDescription>Earned: {me.achievements.filter((a) => a.earnedAt).length}</CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          {me.achievements.length === 0 && (
            <p className="text-sm text-muted-foreground col-span-2">No achievements yet — keep growing!</p>
          )}
          {me.achievements.map((a) => (
            <div key={a.id} className="pretty-card p-3 flex items-center gap-3">
              <div className="text-2xl">🏅</div>
              <div className="min-w-0">
                <p className="font-medium truncate">{a.achievement.title}</p>
                <p className="text-xs text-muted-foreground truncate">{a.achievement.description}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/app/billing">Billing</Link></Button>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <Button type="submit" variant="ghost">Sign out</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
