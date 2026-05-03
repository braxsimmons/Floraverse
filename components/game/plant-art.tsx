"use client";

import { cn } from "@/lib/utils";

const PALETTES: Record<string, [string, string, string]> = {
  marigold: ["#F8C57B", "#F39C3F", "#7AB17A"],
  daisy: ["#FFFFFF", "#FFD66B", "#7AB17A"],
  basil: ["#9CCB7A", "#5DA663", "#3F7A4D"],
  clover: ["#9DD7A8", "#52A86A", "#3F7A4D"],
  succulent: ["#A8D5B0", "#739F7B", "#5C7C66"],
  pansy: ["#C28BD2", "#7B5CB1", "#7AB17A"],
  chamomile: ["#FFF7DA", "#E7C763", "#7AB17A"],
  fern: ["#7CB286", "#4F8B5A", "#3A6E47"],
  sunflower: ["#FFCC4D", "#E89A1A", "#5DA663"],
  lavender: ["#C9B7E8", "#8C73C7", "#5DA663"],
  rose: ["#F2A0AB", "#D45C72", "#5DA663"],
  tulip: ["#F4A4B8", "#D8546D", "#5DA663"],
  hydrangea: ["#A6C7F2", "#6F9DDB", "#5DA663"],
  orchid: ["#F1B7DC", "#A861A6", "#A88E76"],
  bonsai: ["#7CB286", "#4F8B5A", "#8C6A4B"],
  birdofparadise: ["#F39C3F", "#C7522F", "#5DA663"],
  peony: ["#F7C4D2", "#E58CA9", "#5DA663"],
  blueglow: ["#9CC9FF", "#6FA0F5", "#7AB17A"],
  starbloom: ["#F2D8FF", "#A26FE6", "#7AB17A"],
  celestial: ["#FFE2A6", "#FF9DBF", "#A26FE6"],
};

const STAGE_PROGRESS: Record<string, number> = {
  SEED: 0.05,
  SPROUT: 0.3,
  GROWING: 0.6,
  BLOOMING: 1,
  WITHERED: 1,
};

export function PlantArt({
  imageSeed,
  stage,
  size = 80,
  wilted,
  className,
}: {
  imageSeed: string;
  stage: keyof typeof STAGE_PROGRESS;
  size?: number;
  wilted?: boolean;
  className?: string;
}) {
  const [bloom, accent, leaf] = PALETTES[imageSeed] ?? PALETTES.marigold;
  const t = STAGE_PROGRESS[stage] ?? 0;

  const stemH = 6 + 30 * t;
  const flowerSize = 12 + 26 * t;
  const showFlower = stage === "BLOOMING";
  const showBud = stage === "GROWING";
  const showSprout = stage === "SPROUT";

  return (
    <div
      className={cn("relative grid place-items-end", className, wilted && "opacity-60 grayscale")}
      style={{ width: size, height: size }}
    >
      {/* Pot */}
      <svg viewBox="0 0 100 100" width={size} height={size} className="absolute inset-0">
        <defs>
          <linearGradient id={`pot-${imageSeed}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#D1A781" />
            <stop offset="1" stopColor="#A57B53" />
          </linearGradient>
          <radialGradient id={`bloom-${imageSeed}`} r="0.6">
            <stop offset="0" stopColor={bloom} />
            <stop offset="1" stopColor={accent} />
          </radialGradient>
        </defs>
        {/* Soil */}
        <ellipse cx="50" cy="78" rx="28" ry="6" fill="#5A3E27" />
        {/* Pot body */}
        <path d="M22 80 L26 96 L74 96 L78 80 Z" fill={`url(#pot-${imageSeed})`} />
        <ellipse cx="50" cy="80" rx="28" ry="5" fill="#8B5E3B" />

        {/* Stem */}
        <rect
          x="48.5"
          y={78 - stemH}
          width="3"
          height={stemH}
          rx="1.5"
          fill={leaf}
          className={!wilted ? "animate-sway origin-bottom" : ""}
        />

        {/* Leaves on stem */}
        {t > 0.3 && (
          <>
            <ellipse cx="44" cy={78 - stemH * 0.6} rx="6" ry="3" fill={leaf} transform={`rotate(-25 44 ${78 - stemH * 0.6})`} />
            <ellipse cx="56" cy={78 - stemH * 0.4} rx="6" ry="3" fill={leaf} transform={`rotate(25 56 ${78 - stemH * 0.4})`} />
          </>
        )}

        {/* Sprout */}
        {showSprout && (
          <ellipse cx="50" cy={78 - stemH - 2} rx="6" ry="3" fill={leaf} />
        )}

        {/* Bud */}
        {showBud && (
          <circle cx="50" cy={78 - stemH - 4} r={flowerSize / 3} fill={accent} />
        )}

        {/* Flower */}
        {showFlower && (
          <g transform={`translate(50 ${78 - stemH - flowerSize / 2})`}>
            {Array.from({ length: 8 }).map((_, i) => {
              const a = (i / 8) * Math.PI * 2;
              return (
                <ellipse
                  key={i}
                  cx={Math.cos(a) * flowerSize * 0.35}
                  cy={Math.sin(a) * flowerSize * 0.35}
                  rx={flowerSize * 0.32}
                  ry={flowerSize * 0.18}
                  fill={`url(#bloom-${imageSeed})`}
                  transform={`rotate(${(a * 180) / Math.PI})`}
                />
              );
            })}
            <circle r={flowerSize * 0.22} fill={accent} />
          </g>
        )}
      </svg>
    </div>
  );
}
