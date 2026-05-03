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

  // Daily reward (claim once per local day)
  dailyReward: { petals: 50, coins: 1, xp: 10 },
  dailyStreakBonus: { petalsPerDay: 10, capDays: 14, milestoneCoinsAt: [3, 7, 14, 30] },

  // Timed reward (every X hours)
  timedRewardHours: 4,
  timedReward: { petals: 25, xp: 5 },

  // Floraverse Plus subscription perks
  plus: {
    extraSlots: 18,            // adds beyond default 6x6 = 36
    streakProtection: true,    // missing a day doesn't reset
    autoCarePerks: true,       // wilt is much slower
    petalMultiplier: 1.5,
    coinsPerMonth: 100,
  },

  // Care actions
  care: {
    waterCooldownMs: 1000 * 60 * 60 * 2,        // 2h between waters
    fertilizeCooldownMs: 1000 * 60 * 60 * 12,   // 12h
    waterXp: 5,
    waterPetals: 2,
    fertilizeXp: 12,
    fertilizePetals: 0,
    fertilizeBoostMs: 1000 * 60 * 60 * 4,        // shaves 4h off growth
    talkXp: 1,
    harvestBaseXp: 20,
  },

  // Plant lifecycle
  plant: {
    wiltGraceMs: 1000 * 60 * 60 * 36,            // 36h without water -> wilted
    healthLossPerHourWilted: 1.5,
    reviveCostPetals: 30,
    stageThresholds: [0.0, 0.2, 0.55, 0.85, 1.0], // SEED, SPROUT, GROWING, BLOOMING, (HARVESTABLE)
  },

  // XP curve: xp needed for level n -> 50 * n^1.5
  level: { xpForLevel: (n: number) => Math.floor(50 * Math.pow(n, 1.5)) },
};

export const COLORS = {
  // Reflects --bloom-* CSS vars in globals.css.
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
};

export const COIN_PACKS = [
  { sku: "coins_small", name: "Pocketful", coins: 100, priceCents: 299, priceId: STRIPE_PRICES.coinsSmall },
  { sku: "coins_medium", name: "Bouquet", coins: 350, priceCents: 899, priceId: STRIPE_PRICES.coinsMedium, bonus: "+50 bonus" },
  { sku: "coins_large", name: "Greenhouse", coins: 1000, priceCents: 1999, priceId: STRIPE_PRICES.coinsLarge, bonus: "+200 bonus" },
];

export const PLUS_PLANS = [
  { sku: "plus_monthly", name: "Floraverse Plus", interval: "month", priceCents: 499, priceId: STRIPE_PRICES.plusMonthly },
  { sku: "plus_yearly", name: "Floraverse Plus", interval: "year", priceCents: 4999, priceId: STRIPE_PRICES.plusYearly },
];

export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}
