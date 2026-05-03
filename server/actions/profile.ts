"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const profileSchema = z.object({
  bio: z.string().max(280).optional(),
  pronouns: z.string().max(40).optional(),
  location: z.string().max(40).optional(),
  gardenName: z.string().min(1).max(40).optional(),
  gardenIsPublic: z.boolean().optional(),
});

async function getMe() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  return session.user.id;
}

export async function updateProfile(input: unknown) {
  const me = await getMe();
  const data = profileSchema.parse(input);

  await prisma.profile.upsert({
    where: { userId: me },
    create: {
      userId: me,
      bio: data.bio,
      pronouns: data.pronouns,
      location: data.location,
    },
    update: {
      bio: data.bio,
      pronouns: data.pronouns,
      location: data.location,
    },
  });

  if (data.gardenName !== undefined || data.gardenIsPublic !== undefined) {
    await prisma.garden.update({
      where: { userId: me },
      data: {
        ...(data.gardenName !== undefined && { name: data.gardenName }),
        ...(data.gardenIsPublic !== undefined && { isPublic: data.gardenIsPublic }),
      },
    });
  }

  revalidatePath("/app/profile");
}
