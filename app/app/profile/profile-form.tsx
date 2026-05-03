"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateProfile } from "@/server/actions/profile";
import { toast } from "@/components/ui/toast";

export function ProfileForm({
  initial,
}: {
  initial: { bio: string; pronouns: string; location: string; gardenName: string; gardenIsPublic: boolean };
}) {
  const [state, setState] = useState(initial);
  const [busy, start] = useTransition();
  const router = useRouter();

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          try {
            await updateProfile(state);
            toast.success("Saved");
            router.refresh();
          } catch (err: any) {
            toast.error(err?.message ?? "Could not save");
          }
        });
      }}
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Garden name</Label>
          <Input value={state.gardenName} onChange={(e) => setState({ ...state, gardenName: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Pronouns</Label>
          <Input value={state.pronouns} onChange={(e) => setState({ ...state, pronouns: e.target.value })} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Location</Label>
        <Input value={state.location} onChange={(e) => setState({ ...state, location: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Bio</Label>
        <Textarea value={state.bio} onChange={(e) => setState({ ...state, bio: e.target.value })} maxLength={280} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={state.gardenIsPublic}
          onChange={(e) => setState({ ...state, gardenIsPublic: e.target.checked })}
        />
        Garden is public (friends can visit)
      </label>
      <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
    </form>
  );
}
