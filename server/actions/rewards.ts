"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { claimDailyReward, claimTimedReward, tickStreak } from "@/lib/streak";
import { trackEvent } from "@/lib/analytics";

async function getMe() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  return session.user.id;
}

export async function dailyClaim() {
  const me = await getMe();
  const result = await claimDailyReward(me);
  await trackEvent(me, "daily_claim", result);
  revalidatePath("/app");
  return result;
}

export async function timedClaim() {
  const me = await getMe();
  const result = await claimTimedReward(me);
  await trackEvent(me, "timed_claim", result);
  revalidatePath("/app");
  return result;
}

export async function bootSession() {
  const me = await getMe();
  return await tickStreak(me);
}
