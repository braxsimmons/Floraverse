import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ensureStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { APP } from "@/lib/config";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stripe = ensureStripe();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { stripeCustomerId: true },
  });
  if (!user.stripeCustomerId) return NextResponse.json({ error: "No customer" }, { status: 400 });

  const portal = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${APP.url}/app/billing`,
  });
  return NextResponse.json({ url: portal.url });
}
