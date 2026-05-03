"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

export function CheckoutButton({
  sku,
  mode = "payment",
  priceId,
}: {
  sku: string;
  mode?: "subscription" | "payment";
  priceId: string;
}) {
  const [busy, start] = useTransition();
  return (
    <Button
      variant="gold"
      className="w-full mt-3"
      disabled={busy}
      onClick={() =>
        start(async () => {
          if (!priceId) {
            toast.error("Stripe price not configured. Set STRIPE_PRICE_* in .env.");
            return;
          }
          try {
            const res = await fetch("/api/stripe/checkout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sku, mode, priceId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? "Could not start checkout");
            window.location.href = data.url;
          } catch (e: any) {
            toast.error(e?.message ?? "Could not start checkout");
          }
        })
      }
    >
      {busy ? "Opening…" : "Buy"}
    </Button>
  );
}

export function ManagePortalButton() {
  const [busy, start] = useTransition();
  return (
    <Button
      variant="outline"
      className="w-full"
      disabled={busy}
      onClick={() =>
        start(async () => {
          try {
            const res = await fetch("/api/stripe/portal", { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? "Could not open portal");
            window.location.href = data.url;
          } catch (e: any) {
            toast.error(e?.message ?? "Could not open portal");
          }
        })
      }
    >
      Manage subscription
    </Button>
  );
}
