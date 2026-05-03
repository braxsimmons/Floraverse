import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ensureStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { APP, COIN_PACKS, PLUS_PLANS } from "@/lib/config";

const schema = z.object({
  sku: z.string().min(1),
  mode: z.enum(["subscription", "payment"]),
  priceId: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const stripe = ensureStripe();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { id: true, email: true, stripeCustomerId: true },
  });

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const c = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    customerId = c.id;
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
  }

  const isCoinPack = COIN_PACKS.some((p) => p.sku === parsed.data.sku);
  const isPlus = PLUS_PLANS.some((p) => p.sku === parsed.data.sku);
  if (!isCoinPack && !isPlus) return NextResponse.json({ error: "Unknown SKU" }, { status: 400 });

  const checkout = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: parsed.data.mode,
    line_items: [{ price: parsed.data.priceId, quantity: 1 }],
    success_url: `${APP.url}/app/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP.url}/app/billing?canceled=1`,
    metadata: { userId: user.id, sku: parsed.data.sku },
    allow_promotion_codes: true,
  });

  await prisma.transaction.create({
    data: {
      userId: user.id,
      kind: parsed.data.mode === "subscription" ? "SUBSCRIPTION" : "ONE_TIME",
      status: "PENDING",
      amountCents: 0,
      stripeSessionId: checkout.id,
      description: parsed.data.sku,
    },
  });

  return NextResponse.json({ url: checkout.url });
}
