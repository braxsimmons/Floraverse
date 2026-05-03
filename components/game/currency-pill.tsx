import { cn, formatNumber } from "@/lib/utils";

export function CurrencyPill({
  kind,
  amount,
  className,
}: {
  kind: "petals" | "coins" | "xp";
  amount: number;
  className?: string;
}) {
  const styles =
    kind === "petals"
      ? "bg-bloom-rose"
      : kind === "coins"
      ? "bg-bloom-gold"
      : "bg-bloom-mint";
  const icon = kind === "petals" ? "🌸" : kind === "coins" ? "🪙" : "✨";
  return (
    <span className={cn("pill", styles, className)}>
      <span aria-hidden>{icon}</span>
      <span className="font-semibold tabular-nums">{formatNumber(amount)}</span>
    </span>
  );
}
