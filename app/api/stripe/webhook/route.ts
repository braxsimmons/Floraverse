import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { ensureStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { adjustBalance } from "@/lib/currency";
import { COIN_PACKS, GEM_PACKS, PLUS_PLANS } from "@/lib/config";
import { trackEvent } from "@/lib/analytics";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const stripe = ensureStripe();
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err: any) {
    return NextResponse.json({ error: `Bad signature: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const sku = session.metadata?.sku;
        if (!userId || !sku) break;

        await prisma.transaction.updateMany({
          where: { stripeSessionId: session.id },
          data: {
            status: "SUCCEEDED",
            amountCents: session.amount_total ?? 0,
            stripePaymentIntent: typeof session.payment_intent === "string" ? session.payment_intent : undefined,
          },
        });

        const coinPack = COIN_PACKS.find((p) => p.sku === sku);
        if (coinPack) {
          await adjustBalance(userId, "COINS", coinPack.coins, `STRIPE:${sku}`, { sessionId: session.id });
          await trackEvent(userId, "purchase_coins", { sku, coins: coinPack.coins });
        }
        const gemPack = GEM_PACKS.find((p) => p.sku === sku);
        if (gemPack) {
          await adjustBalance(userId, "GEMS", gemPack.gems, `STRIPE:${sku}`, { sessionId: session.id });
          await trackEvent(userId, "purchase_gems", { sku, gems: gemPack.gems });
        }

        // Subscriptions intentionally not handled — Floraverse is free-to-play.
        break;
      }

      default:
        break;
    }
  } catch (err: any) {
    console.error("[stripe webhook]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
