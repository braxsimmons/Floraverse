import { Prisma, NotificationKind } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function notify(
  userId: string,
  args: { kind: NotificationKind; title: string; body?: string; link?: string; metadata?: any },
  client: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return client.notification.create({
    data: {
      userId,
      kind: args.kind,
      title: args.title,
      body: args.body,
      link: args.link,
      metadata: args.metadata,
    },
  });
}
