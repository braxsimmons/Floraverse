import { cn, formatNumber } from "@/lib/utils";

export function CurrencyPill({
  kind,
  amount,
  className,
}: {
  kind: "petals" | "coins" | "gems" | "xp";
  amount: number;
  className?: string;
}) {
  const styles =
    kind === "petals" ? "bg-bloom-rose" :
    kind === "coins"  ? "bg-bloom-gold" :
    kind === "gems"   ? "bg-bloom-lavender" :
                        "bg-bloom-mint";
  const icon =
    kind === "petals" ? "🌸" :
    kind === "coins"  ? "🪙" :
    kind === "gems"   ? "💎" :
                        "✨";
  return (
    <span className={cn("pill px-2 py-0.5 sm:px-2.5 sm:py-1 text-[11px] sm:text-xs", styles, className)}>
      <span aria-hidden>{icon}</span>
      <span className="font-semibold tabular-nums">{formatNumber(amount)}</span>
    </span>
  );
}
