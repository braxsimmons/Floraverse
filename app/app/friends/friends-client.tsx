"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, Check, X } from "lucide-react";
import { searchUsers, sendFriendRequest, respondFriendRequest } from "@/server/actions/social";
import { toast } from "@/components/ui/toast";

type FriendItem = { id: string; user: { id: string; name: string | null; username: string | null; level: number; image: string | null } };

export function FriendsClient({
  friends,
  requests,
  myId,
}: {
  friends: FriendItem[];
  requests: { id: string; from: { id: string; name: string | null; username: string | null; image: string | null }; outgoing: boolean }[];
  myId: string;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ id: string; name: string | null; username: string | null; level: number; image: string | null }[]>([]);
  const [busy, start] = useTransition();
  const router = useRouter();

  const incoming = requests.filter((r) => !r.outgoing);
  const outgoing = requests.filter((r) => r.outgoing);

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Input
          placeholder="Search by username or name…"
          value={q}
          onChange={async (e) => {
            const v = e.target.value;
            setQ(v);
            if (v.length >= 2) {
              try {
                setResults(await searchUsers(v));
              } catch {}
            } else setResults([]);
          }}
        />
        <Button variant="soft"><Search className="h-4 w-4" /></Button>
      </div>
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((u) => (
            <div key={u.id} className="pretty-card p-3 flex items-center gap-3">
              <Avatar><AvatarImage src={u.image ?? undefined} /><AvatarFallback>{(u.name ?? "?").slice(0, 1)}</AvatarFallback></Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{u.name ?? u.username}</p>
                <p className="text-xs text-muted-foreground truncate">@{u.username} · Lvl {u.level}</p>
              </div>
              <Button
                size="sm"
                variant="soft"
                disabled={busy}
                onClick={() =>
                  start(async () => {
                    try {
                      await sendFriendRequest(u.id);
                      toast.success("Request sent");
                      router.refresh();
                    } catch (e: any) {
                      toast.error(e?.message ?? "Could not send");
                    }
                  })
                }
              >
                <UserPlus className="h-4 w-4" /> Add
              </Button>
            </div>
          ))}
        </div>
      )}

      {incoming.length > 0 && (
        <section>
          <h3 className="font-semibold mb-2">Incoming requests</h3>
          <div className="space-y-2">
            {incoming.map((r) => (
              <div key={r.id} className="pretty-card p-3 flex items-center gap-3">
                <Avatar><AvatarImage src={r.from.image ?? undefined} /><AvatarFallback>{(r.from.name ?? "?").slice(0, 1)}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{r.from.name ?? r.from.username}</p>
                  <p className="text-xs text-muted-foreground truncate">@{r.from.username}</p>
                </div>
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    start(async () => {
                      await respondFriendRequest(r.id, true);
                      toast.success("Accepted");
                      router.refresh();
                    })
                  }
                >
                  <Check className="h-4 w-4" /> Accept
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() =>
                    start(async () => {
                      await respondFriendRequest(r.id, false);
                      router.refresh();
                    })
                  }
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="font-semibold mb-2">Friends ({friends.length})</h3>
        {friends.length === 0 && <p className="text-sm text-muted-foreground">No friends yet — search above!</p>}
        <div className="grid sm:grid-cols-2 gap-3">
          {friends.map((f) => (
            <div key={f.id} className="pretty-card p-3 flex items-center gap-3">
              <Avatar><AvatarImage src={f.user.image ?? undefined} /><AvatarFallback>{(f.user.name ?? "?").slice(0, 1)}</AvatarFallback></Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{f.user.name ?? f.user.username}</p>
                <p className="text-xs text-muted-foreground truncate">Lvl {f.user.level}</p>
              </div>
              {f.user.username && (
                <Button asChild size="sm" variant="soft">
                  <Link href={`/u/${f.user.username}`}>Visit</Link>
                </Button>
              )}
            </div>
          ))}
        </div>
        {outgoing.length > 0 && (
          <div className="mt-4 text-xs text-muted-foreground">
            {outgoing.length} outgoing request{outgoing.length === 1 ? "" : "s"}
          </div>
        )}
      </section>
    </div>
  );
}
