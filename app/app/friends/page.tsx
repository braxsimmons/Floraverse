import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listFriends, listFriendRequests } from "@/server/actions/social";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FriendsClient } from "./friends-client";

export default async function FriendsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [friends, requests] = await Promise.all([listFriends(), listFriendRequests()]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="display">Friends</CardTitle>
          <CardDescription>Find friends, visit their gardens, leave kindness.</CardDescription>
        </CardHeader>
        <CardContent>
          <FriendsClient
            friends={friends.map((f) => ({
              id: f.friendship.id,
              user: {
                id: f.friend.id,
                name: f.friend.name,
                username: f.friend.username,
                level: f.friend.level,
                image: f.friend.image,
              },
            }))}
            requests={requests.map((r) => ({
              id: r.id,
              from: r.userAId === session.user!.id ? r.userB : r.userA,
              outgoing: r.userAId === session.user!.id,
            }))}
            myId={session.user.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
