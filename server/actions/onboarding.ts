"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { signupSchema } from "@/lib/validation";
import { prisma } from "@/lib/db";
import { signIn } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";
import { ECONOMY } from "@/lib/config";

export async function signupAction(formData: FormData) {
  const raw = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    username: String(formData.get("username") ?? ""),
    name: String(formData.get("name") ?? "") || undefined,
  };
  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { email, password, username, name } = parsed.data;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) {
    return { error: existing.email === email ? "Email already in use" : "Username taken" };
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      username,
      name,
      hashedPassword: hashed,
      petals: ECONOMY.startingPetals,
      bloomCoins: ECONOMY.startingCoins,
      onboardedAt: new Date(),
      profile: { create: {} },
      garden: { create: { name: `${name?.split(" ")[0] ?? username}'s Garden` } },
    },
  });

  // Starter pack: 2 marigold seeds
  const starter = await prisma.shopItem.findUnique({ where: { sku: "shop_seed_marigold" } });
  if (starter) {
    await prisma.inventoryItem.create({
      data: { userId: user.id, shopItemId: starter.id, quantity: 2 },
    });
  }
  await trackEvent(user.id, "signup");

  await signIn("credentials", { email, password, redirect: false });
  redirect("/app");
}
