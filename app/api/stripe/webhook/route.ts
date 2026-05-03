import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { ensureStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { adjustBalance } from "@/lib/currency";
import { COIN_PACKS, PLUS_PLANS } from "@/lib/config";
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

        const plus = PLUS_PLANS.find((p) => p.sku === sku);
        if (plus && session.mode === "subscription" && session.subscription) {
          const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          await prisma.user.update({
            where: { id: userId },
            data: {
              subscriptionTier: "PLUS",
              stripeSubscriptionId: sub.id,
              subscriptionEndsAt: new Date(sub.current_period_end * 1000),
            },
          });
          await prisma.subscription.upsert({
            where: { stripeSubscriptionId: sub.id },
            create: {
              userId,
              stripeSubscriptionId: sub.id,
              stripePriceId: sub.items.data[0]?.price.id ?? "",
              status: sub.status,
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
            },
            update: {
              status: sub.status,
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
              cancelAtPeriodEnd: sub.cancel_at_period_end,
            },
          });
          await trackEvent(userId, "subscribe_plus", { sku });
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userIdMeta = (sub.metadata?.userId as string | undefined) ?? null;
        const userByCustomer = userIdMeta
          ? null
          : await prisma.user.findFirst({ where: { stripeCustomerId: sub.customer as string } });
        const userId = userIdMeta ?? userByCustomer?.id;
        if (!userId) break;
        await prisma.subscription.upsert({
          where: { stripeSubscriptionId: sub.id },
          create: {
            userId,
            stripeSubscriptionId: sub.id,
            stripePriceId: sub.items.data[0]?.price.id ?? "",
            status: sub.status,
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          },
          update: {
            status: sub.status,
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          },
        });
        await prisma.user.update({
          where: { id: userId },
          data: {
            subscriptionTier: sub.status === "active" || sub.status === "trialing" ? "PLUS" : "FREE",
            subscriptionEndsAt: new Date(sub.current_period_end * 1000),
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const user = await prisma.user.findFirst({
          where: { stripeSubscriptionId: sub.id },
        });
        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              subscriptionTier: "FREE",
              stripeSubscriptionId: null,
              subscriptionEndsAt: new Date(sub.current_period_end * 1000),
            },
          });
        }
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
