"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ensureDailyQuests, ensureWeeklyQuests, claimQuest } from "@/lib/quests";

async function getMe() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  return session.user.id;
}

export async function loadQuests() {
  const me = await getMe();
  const [daily, weekly] = await Promise.all([
    ensureDailyQuests(me),
    ensureWeeklyQuests(me),
  ]);
  return { daily, weekly };
}

export async function claim(input: unknown) {
  const me = await getMe();
  const { progressId } = z.object({ progressId: z.string().min(1) }).parse(input);
  await claimQuest(me, progressId);
  revalidatePath("/app/quests");
  revalidatePath("/app");
}
