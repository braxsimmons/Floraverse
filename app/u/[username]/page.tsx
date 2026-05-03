import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { visitGarden } from "@/server/actions/social";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GardenGrid } from "@/components/game/garden-grid";
import { GuestActions } from "./guest-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, Sparkles, Star, Sun, Droplet } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

export default async function PublicGarden({ params }: { params: { username: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=/u/${params.username}`);

  let garden;
  try {
    garden = await visitGarden(params.username);
  } catch {
    notFound();
  }

  return (
    <div className="container max-w-4xl py-6 space-y-4">
      <Card className="bg-gradient-to-br from-bloom-mint/30 via-card to-bloom-lavender/30">
        <CardHeader className="flex-row items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback>{params.username.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="display text-2xl">{garden.name}</CardTitle>
            <CardDescription>by @{params.username} · {garden.totalVisits} visits · {garden.totalLikes} reactions</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <GardenGrid
            width={garden.width}
            height={garden.height}
            slots={garden.slots as any}
            readOnly
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Leave kindness</CardTitle>
          <CardDescription>One short, positive note. URLs are not allowed.</CardDescription>
        </CardHeader>
        <CardContent>
          <GuestActions
            gardenId={garden.id}
            recipientUsername={params.username}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {garden.notes.length === 0 && (
            <p className="text-sm text-muted-foreground">No notes yet — be the first to say hi.</p>
          )}
          {garden.notes.map((n: any) => (
            <div key={n.id} className="pretty-card p-3 text-sm">
              <p>{n.content}</p>
              <p className="text-xs text-muted-foreground mt-1">
                @{n.author.username} · {formatRelativeTime(n.createdAt)}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
