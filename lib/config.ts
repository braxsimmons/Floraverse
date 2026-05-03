// Central game + product configuration.
// Tweak these to rebalance the economy without touching code.

export const APP = {
  name: "Floraverse",
  tagline: "Your cozy little garden, tended together.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
};

export const ECONOMY = {
  startingPetals: 150,
  startingCoins: 10,
  startingGems: 2,

  // Daily reward (claim once per local day)
  dailyReward: { petals: 50, coins: 1, xp: 10 },
  dailyStreakBonus: { petalsPerDay: 10, capDays: 14, milestoneCoinsAt: [3, 7, 14, 30] },

  // Timed reward (every X hours)
  timedRewardHours: 4,
  timedReward: { petals: 25, xp: 5 },

  // Floraverse Plus subscription perks
  plus: {
    extraSlots: 18,
    streakProtection: true,
    autoCarePerks: true,
    petalMultiplier: 1.5,
    coinsPerMonth: 100,
    gemsPerMonth: 10,
  },

  // Per-action care config: cooldown, rewards
  // Each care action has its own timer the user can wait or speed up.
  care: {
    actions: {
      WATER:     { label: "Water",     icon: "💧", cooldownMs: 1000 * 60 * 60 * 2,   xp: 5,  petals: 2,  growthBoostMs: 0 },
      MIST:      { label: "Mist",      icon: "🌫️", cooldownMs: 1000 * 60 * 30,        xp: 2,  petals: 1,  growthBoostMs: 0 },
      TALK:      { label: "Talk",      icon: "💬", cooldownMs: 1000 * 60 * 60 * 1,   xp: 3,  petals: 1,  growthBoostMs: 0 },
      SING:      { label: "Sing",      icon: "🎵", cooldownMs: 1000 * 60 * 60 * 3,   xp: 6,  petals: 3,  growthBoostMs: 1000 * 60 * 30 },
      PRUNE:     { label: "Prune",     icon: "✂️",  cooldownMs: 1000 * 60 * 60 * 8,   xp: 8,  petals: 5,  growthBoostMs: 0 },
      WEED:      { label: "Weed",      icon: "🌿", cooldownMs: 1000 * 60 * 60 * 6,   xp: 6,  petals: 4,  growthBoostMs: 0 },
      FERTILIZE: { label: "Fertilize", icon: "✨", cooldownMs: 1000 * 60 * 60 * 12,  xp: 12, petals: 0,  growthBoostMs: 1000 * 60 * 60 * 4, requiresItemSku: "shop_con_fertilizer" },
    } as const,
    // For HARVEST and REVIVE, stay in the existing care actions.
    harvestBaseXp: 20,
  },

  // Speed-up: spend coins to skip a cooldown.
  // cost = ceil( remainingMs / msPerCoin ) clamped between min/max.
  speedUp: {
    msPerCoin: 1000 * 60 * 5,    // 5 minutes per coin
    minCoins: 1,
    maxCoinsPerSkip: 25,
    instantUnlockGems: 1,        // alternative: always 1 gem to instant
  },

  // Plant lifecycle
  plant: {
    wiltGraceMs: 1000 * 60 * 60 * 36,
    healthLossPerHourWilted: 1.5,
    reviveCostPetals: 30,
    stageThresholds: [0.0, 0.2, 0.55, 0.85, 1.0],
  },

  // XP curve
  level: { xpForLevel: (n: number) => Math.floor(50 * Math.pow(n, 1.5)) },

  // Rewarded ads — admin-configurable.
  ads: {
    enabled: true,
    cooldownMs: 1000 * 60 * 5,         // 5 min between ads
    dailyCap: 12,                      // max watches per local day
    rewardCoins: 5,                    // base reward
    rewardPetals: 25,
    provider: "TEST" as "TEST" | "ADMOB" | "ADSENSE" | "UNITY",
  },
};

// Climate / biome unlock list
export type BiomeKey = "meadow" | "desert" | "tropical" | "alpine" | "coastal" | "forest";

export const BIOMES: Array<{
  key: BiomeKey;
  name: string;
  emoji: string;
  blurb: string;
  unlockLevel: number;
  unlockGems: number;
  bg: string;
  hue: string;
}> = [
  { key: "meadow",   name: "Meadow",        emoji: "🌼", blurb: "Sunny grass and wildflowers. Where everyone starts.", unlockLevel: 1,  unlockGems: 0,  bg: "from-bloom-mint/40 via-card to-bloom-peach/30", hue: "mint" },
  { key: "forest",   name: "Forest Glade",  emoji: "🌲", blurb: "Mossy quiet under a canopy. Ferns and dappled light.",  unlockLevel: 5,  unlockGems: 5,  bg: "from-bloom-sage/40 via-card to-bloom-mint/30", hue: "sage" },
  { key: "coastal",  name: "Sea Garden",    emoji: "🌊", blurb: "Salt-sprayed succulents and grasses by tide pools.",   unlockLevel: 8,  unlockGems: 8,  bg: "from-sky-200/40 via-card to-bloom-mint/30", hue: "sky" },
  { key: "desert",   name: "Sun Garden",    emoji: "🌵", blurb: "Cacti, agave, and resilient sun-lovers.",              unlockLevel: 12, unlockGems: 12, bg: "from-bloom-peach/40 via-card to-bloom-gold/30", hue: "peach" },
  { key: "tropical", name: "Hothouse",      emoji: "🌴", blurb: "Humid jungle ferns and bright orchids.",                unlockLevel: 16, unlockGems: 18, bg: "from-emerald-200/40 via-card to-bloom-mint/30", hue: "emerald" },
  { key: "alpine",   name: "Alpine Garden", emoji: "🏔️", blurb: "Hardy little blooms above the treeline.",             unlockLevel: 20, unlockGems: 24, bg: "from-bloom-lavender/40 via-card to-sky-100/40", hue: "lavender" },
];

export function biomeMeta(key: string) {
  return BIOMES.find((b) => b.key === (key as BiomeKey)) ?? BIOMES[0];
}

export const COLORS = {
  rose: "#F8C9C7",
  peach: "#FFD9B3",
  mint: "#BFE6CC",
  sage: "#9DBFA0",
  lavender: "#D7CCEE",
  gold: "#F4D38B",
};

export const STRIPE_PRICES = {
  plusMonthly: process.env.STRIPE_PRICE_PLUS_MONTHLY ?? "",
  plusYearly: process.env.STRIPE_PRICE_PLUS_YEARLY ?? "",
  coinsSmall: process.env.STRIPE_PRICE_COINS_SMALL ?? "",
  coinsMedium: process.env.STRIPE_PRICE_COINS_MEDIUM ?? "",
  coinsLarge: process.env.STRIPE_PRICE_COINS_LARGE ?? "",
  gemsSmall: process.env.STRIPE_PRICE_GEMS_SMALL ?? "",
  gemsMedium: process.env.STRIPE_PRICE_GEMS_MEDIUM ?? "",
  gemsLarge: process.env.STRIPE_PRICE_GEMS_LARGE ?? "",
};

export const COIN_PACKS = [
  { sku: "coins_small",  name: "Pocketful",   coins: 100,  priceCents: 299,  priceId: STRIPE_PRICES.coinsSmall },
  { sku: "coins_medium", name: "Bouquet",     coins: 350,  priceCents: 899,  priceId: STRIPE_PRICES.coinsMedium, bonus: "+50 bonus" },
  { sku: "coins_large",  name: "Greenhouse",  coins: 1000, priceCents: 1999, priceId: STRIPE_PRICES.coinsLarge,  bonus: "+200 bonus" },
];

export const GEM_PACKS = [
  { sku: "gems_small",  name: "Sprinkle",  gems: 10,  priceCents: 199,  priceId: STRIPE_PRICES.gemsSmall },
  { sku: "gems_medium", name: "Handful",   gems: 50,  priceCents: 799,  priceId: STRIPE_PRICES.gemsMedium, bonus: "+10 bonus" },
  { sku: "gems_large",  name: "Treasury",  gems: 150, priceCents: 1999, priceId: STRIPE_PRICES.gemsLarge,  bonus: "+40 bonus" },
];

// Subscriptions are intentionally disabled — Floraverse is free-to-play.
// Stripe is used only for one-time coin/gem packs and shop items.
export const PLUS_PLANS: Array<{ sku: string; name: string; interval: string; priceCents: number; priceId: string }> = [];

export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export type CareKey = keyof typeof ECONOMY.care.actions;
