import { prisma } from "@/lib/db";

export async function trackEvent(
  userId: string | null,
  event: string,
  metadata?: Record<string, unknown>,
) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: userId ?? undefined,
        event,
        metadata: metadata ? (metadata as any) : undefined,
      },
    });
  } catch {
    // never let analytics break a request
  }
}
