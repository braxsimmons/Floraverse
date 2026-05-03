import { Badge } from "@/components/ui/badge";

const VARIANTS: Record<string, "secondary" | "mint" | "lavender" | "gold" | "rose"> = {
  COMMON: "secondary",
  UNCOMMON: "mint",
  RARE: "lavender",
  EPIC: "gold",
  LEGENDARY: "rose",
};

export function RarityBadge({ rarity }: { rarity: string }) {
  return (
    <Badge variant={VARIANTS[rarity] ?? "secondary"} className="capitalize">
      {rarity.toLowerCase()}
    </Badge>
  );
}
