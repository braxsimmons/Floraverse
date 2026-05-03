import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { signupSchema } from "@/lib/validation";
import { prisma } from "@/lib/db";
import { ECONOMY, isAdminEmail } from "@/lib/config";
import { trackEvent } from "@/lib/analytics";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }
    const { email, password, username, name } = parsed.data;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) {
      return NextResponse.json(
        { error: existing.email === email ? "Email already in use" : "Username taken" },
        { status: 409 },
      );
    }

    const hashed = await bcrypt.hash(password, 10);
    const role = isAdminEmail(email) ? "ADMIN" : "USER";
    const user = await prisma.user.create({
      data: {
        email,
        username,
        name,
        role,
        hashedPassword: hashed,
        petals: ECONOMY.startingPetals,
        bloomCoins: ECONOMY.startingCoins,
        onboardedAt: new Date(),
        profile: { create: {} },
        garden: { create: { name: `${name?.split(" ")[0] ?? username}'s Garden` } },
      },
    });

    const starter = await prisma.shopItem.findUnique({ where: { sku: "shop_seed_marigold" } });
    if (starter) {
      await prisma.inventoryItem.create({
        data: { userId: user.id, shopItemId: starter.id, quantity: 2 },
      });
    }
    await trackEvent(user.id, "signup");
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
