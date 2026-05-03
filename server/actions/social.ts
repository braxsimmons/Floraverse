"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { noteSchema, usernameSchema } from "@/lib/validation";
import { moderateNote } from "@/lib/moderation";
import { progressQuests } from "@/lib/quests";
import { trackEvent } from "@/lib/analytics";
import { notify } from "@/lib/notifications";
import { rateLimit } from "@/lib/rate-limit";

async function getMe() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  return session.user.id;
}

export async function searchUsers(query: string) {
  const me = await getMe();
  const q = query.trim().slice(0, 30);
  if (!q) return [];
  return await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: me } },
        { bannedAt: null },
        {
          OR: [
            { username: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
          ],
        },
      ],
    },
    select: { id: true, username: true, name: true, image: true, level: true },
    take: 20,
  });
}

export async function sendFriendRequest(targetId: string) {
  const me = await getMe();
  if (targetId === me) throw new Error("CANNOT_FRIEND_SELF");

  const blocked = await prisma.block.findFirst({
    where: { OR: [{ userId: targetId, blockedId: me }, { userId: me, blockedId: targetId }] },
  });
  if (blocked) throw new Error("BLOCKED");

  const [a, b] = me < targetId ? [me, targetId] : [targetId, me];
  const existing = await prisma.friendship.findUnique({
    where: { userAId_userBId: { userAId: a, userBId: b } },
  });
  if (existing) {
    if (existing.status === "ACCEPTED") return existing;
    if (existing.status === "PENDING") return existing;
  }

  const fr = await prisma.friendship.upsert({
    where: { userAId_userBId: { userAId: a, userBId: b } },
    create: { userAId: a, userBId: b, status: "PENDING" },
    update: { status: "PENDING" },
  });

  await notify(targetId, {
    kind: "FRIEND_REQUEST",
    title: "New friend request",
    link: "/app/friends",
  });
  await trackEvent(me, "friend_request_sent", { targetId });
  revalidatePath("/app/friends");
  return fr;
}

export async function respondFriendRequest(friendshipId: string, accept: boolean) {
  const me = await getMe();
  const fr = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (!fr) throw new Error("NOT_FOUND");
  // Recipient is whichever side did not initiate. Initiator stored as userAId arbitrarily after sort, so we accept regardless.
  if (fr.userAId !== me && fr.userBId !== me) throw new Error("FORBIDDEN");
  if (fr.status !== "PENDING") throw new Error("NOT_PENDING");

  const updated = await prisma.friendship.update({
    where: { id: fr.id },
    data: { status: accept ? "ACCEPTED" : "DECLINED" },
  });
  if (accept) {
    const otherId = fr.userAId === me ? fr.userBId : fr.userAId;
    await notify(otherId, { kind: "FRIEND_ACCEPTED", title: "Friend request accepted" });
  }
  revalidatePath("/app/friends");
  return updated;
}

export async function listFriends() {
  const me = await getMe();
  const rows = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ userAId: me }, { userBId: me }],
    },
    include: {
      userA: { select: { id: true, username: true, name: true, image: true, level: true } },
      userB: { select: { id: true, username: true, name: true, image: true, level: true } },
    },
  });
  return rows.map((r) => ({ friendship: r, friend: r.userAId === me ? r.userB : r.userA }));
}

export async function listFriendRequests() {
  const me = await getMe();
  return await prisma.friendship.findMany({
    where: {
      status: "PENDING",
      OR: [{ userAId: me }, { userBId: me }],
    },
    include: {
      userA: { select: { id: true, username: true, name: true, image: true } },
      userB: { select: { id: true, username: true, name: true, image: true } },
    },
  });
}

export async function visitGarden(username: string) {
  const me = await getMe();
  const validUsername = usernameSchema.parse(username);
  const host = await prisma.user.findUnique({
    where: { username: validUsername },
    include: { garden: true },
  });
  if (!host || !host.garden) throw new Error("NOT_FOUND");
  if (host.bannedAt) throw new Error("UNAVAILABLE");
  if (!host.garden.isPublic && host.id !== me) throw new Error("PRIVATE");

  if (host.id !== me) {
    const limit = rateLimit(`visit:${me}:${host.id}`, { capacity: 1, refillPerSec: 1 / 3600 });
    if (limit.ok) {
      await prisma.$transaction([
        prisma.gardenVisit.create({
          data: { gardenId: host.garden.id, visitorId: me, hostId: host.id },
        }),
        prisma.garden.update({
          where: { id: host.garden.id },
          data: { totalVisits: { increment: 1 } },
        }),
      ]);
      await progressQuests(me, "VISIT_GARDENS", 1);
      await notify(host.id, {
        kind: "GARDEN_VISIT",
        title: "Someone visited your garden",
      });
      await trackEvent(me, "garden_visit", { hostId: host.id });
    }
  }

  return await prisma.garden.findUniqueOrThrow({
    where: { id: host.garden.id },
    include: {
      slots: { include: { userPlant: { include: { species: true } } } },
      notes: {
        where: { status: "VISIBLE" },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { author: { select: { id: true, username: true, name: true, image: true } } },
      },
      reactions: true,
    },
  });
}

export async function leaveNote(input: unknown) {
  const me = await getMe();
  const { content, recipientUsername } = noteSchema.parse(input);

  const limit = rateLimit(`note:${me}`, { capacity: 5, refillPerSec: 5 / 3600 });
  if (!limit.ok) throw new Error("RATE_LIMITED");

  const mod = moderateNote(content);
  if (!mod.ok) throw new Error(`MODERATION:${mod.reason}`);

  const recipient = await prisma.user.findUnique({
    where: { username: recipientUsername },
    include: { garden: true },
  });
  if (!recipient || !recipient.garden) throw new Error("NOT_FOUND");

  const blocked = await prisma.block.findFirst({
    where: { userId: recipient.id, blockedId: me },
  });
  if (blocked) throw new Error("BLOCKED");

  await prisma.gardenNote.create({
    data: {
      gardenId: recipient.garden.id,
      authorId: me,
      recipientId: recipient.id,
      content: mod.cleaned,
    },
  });
  await notify(recipient.id, {
    kind: "GARDEN_NOTE",
    title: "Someone left you a note",
    body: mod.cleaned.slice(0, 80),
  });
  await progressQuests(me, "LEAVE_NOTES", 1);
  await trackEvent(me, "note_leave", { recipientId: recipient.id });
  revalidatePath(`/u/${recipientUsername}`);
}

export async function reactToGarden(gardenId: string, kind: "HEART" | "SPARKLE" | "SUN" | "WATER" | "STAR") {
  const me = await getMe();
  const garden = await prisma.garden.findUnique({ where: { id: gardenId } });
  if (!garden) throw new Error("NOT_FOUND");

  await prisma.$transaction(async (tx) => {
    await tx.gardenReaction.upsert({
      where: { gardenId_userId_kind: { gardenId, userId: me, kind } },
      create: { gardenId, userId: me, kind },
      update: {},
    });
    await tx.garden.update({ where: { id: gardenId }, data: { totalLikes: { increment: 1 } } });
  });
  if (garden.userId !== me) {
    await notify(garden.userId, { kind: "GARDEN_REACTION", title: "Someone reacted to your garden" });
  }
  await progressQuests(me, "REACT_GARDEN", 1);
  await trackEvent(me, "garden_react", { gardenId, kind });
}

export async function reportContent(input: { reason: string; details?: string; targetUserId?: string; noteId?: string }) {
  const me = await getMe();
  const data: any = { reporterId: me, reason: input.reason.slice(0, 60) };
  if (input.targetUserId) data.targetUserId = input.targetUserId;
  if (input.noteId) data.noteId = input.noteId;
  if (input.details) data.details = input.details.slice(0, 800);

  await prisma.report.create({ data });
  if (input.noteId) {
    await prisma.gardenNote.update({
      where: { id: input.noteId },
      data: { status: "REPORTED" },
    });
  }
  await trackEvent(me, "report", { reason: input.reason });
}

export async function blockUser(targetId: string) {
  const me = await getMe();
  if (targetId === me) throw new Error("CANNOT_BLOCK_SELF");
  await prisma.block.upsert({
    where: { userId_blockedId: { userId: me, blockedId: targetId } },
    create: { userId: me, blockedId: targetId },
    update: {},
  });
  // Auto-decline any friendship
  const [a, b] = me < targetId ? [me, targetId] : [targetId, me];
  await prisma.friendship.updateMany({
    where: { userAId: a, userBId: b },
    data: { status: "BLOCKED" },
  });
  revalidatePath("/app/friends");
}
