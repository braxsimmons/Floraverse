import "dotenv/config";
import { PrismaClient, Rarity } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const HOUR = 1000 * 60 * 60;
const DAY = 24 * HOUR;

const PLANTS: Array<{
  sku: string;
  name: string;
  scientific?: string;
  description: string;
  rarity: Rarity;
  baseGrowthMs: number;
  waterIntervalMs: number;
  imageSeed: string;
  unlockLevel: number;
  petalsPerHarvest: number;
  xpPerHarvest: number;
  isPremium?: boolean;
  isSeasonal?: boolean;
  tags?: string[];
  biome?: string;
}> = [
  // COMMON (8)
  { sku: "p_marigold", name: "Marigold", scientific: "Tagetes erecta", description: "Cheerful golden bloom — easy keeper for new gardeners.", rarity: "COMMON", baseGrowthMs: 6 * HOUR, waterIntervalMs: 8 * HOUR, imageSeed: "marigold", unlockLevel: 1, petalsPerHarvest: 14, xpPerHarvest: 18, tags: ["sunny"] },
  { sku: "p_daisy", name: "Daisy", scientific: "Bellis perennis", description: "Soft white petals around a sunny eye.", rarity: "COMMON", baseGrowthMs: 6 * HOUR, waterIntervalMs: 8 * HOUR, imageSeed: "daisy", unlockLevel: 1, petalsPerHarvest: 12, xpPerHarvest: 16 },
  { sku: "p_basil", name: "Basil", scientific: "Ocimum basilicum", description: "Fragrant herb beloved by kitchen gardens.", rarity: "COMMON", baseGrowthMs: 8 * HOUR, waterIntervalMs: 10 * HOUR, imageSeed: "basil", unlockLevel: 1, petalsPerHarvest: 16, xpPerHarvest: 22, tags: ["herb"] },
  { sku: "p_clover", name: "Sweet Clover", description: "Three for luck — four if you're patient.", rarity: "COMMON", baseGrowthMs: 5 * HOUR, waterIntervalMs: 8 * HOUR, imageSeed: "clover", unlockLevel: 1, petalsPerHarvest: 10, xpPerHarvest: 14 },
  { sku: "p_succulent", name: "Pebble Succulent", description: "Drought-tolerant little gem.", rarity: "COMMON", baseGrowthMs: 12 * HOUR, waterIntervalMs: 36 * HOUR, imageSeed: "succulent", unlockLevel: 1, petalsPerHarvest: 18, xpPerHarvest: 20 },
  { sku: "p_pansy", name: "Pansy", description: "Velvety face in five colors.", rarity: "COMMON", baseGrowthMs: 7 * HOUR, waterIntervalMs: 8 * HOUR, imageSeed: "pansy", unlockLevel: 2, petalsPerHarvest: 14, xpPerHarvest: 18 },
  { sku: "p_chamomile", name: "Chamomile", description: "Brews into a bedtime favourite.", rarity: "COMMON", baseGrowthMs: 9 * HOUR, waterIntervalMs: 12 * HOUR, imageSeed: "chamomile", unlockLevel: 2, petalsPerHarvest: 18, xpPerHarvest: 22, tags: ["herb"] },
  { sku: "p_fern", name: "Lady Fern", description: "Loves shade and quiet corners.", rarity: "COMMON", baseGrowthMs: 10 * HOUR, waterIntervalMs: 12 * HOUR, imageSeed: "fern", unlockLevel: 2, petalsPerHarvest: 16, xpPerHarvest: 20 },

  // UNCOMMON (5)
  { sku: "p_sunflower", name: "Sunflower", scientific: "Helianthus annuus", description: "Tall, sun-tracking, irrepressibly happy.", rarity: "UNCOMMON", baseGrowthMs: 18 * HOUR, waterIntervalMs: 12 * HOUR, imageSeed: "sunflower", unlockLevel: 3, petalsPerHarvest: 36, xpPerHarvest: 45 },
  { sku: "p_lavender", name: "Lavender", scientific: "Lavandula", description: "Calms the air and the visitor.", rarity: "UNCOMMON", baseGrowthMs: 24 * HOUR, waterIntervalMs: 18 * HOUR, imageSeed: "lavender", unlockLevel: 4, petalsPerHarvest: 40, xpPerHarvest: 50, tags: ["calm"] },
  { sku: "p_rose", name: "Garden Rose", description: "Old-fashioned and unsubtle. We love that for her.", rarity: "UNCOMMON", baseGrowthMs: 30 * HOUR, waterIntervalMs: 14 * HOUR, imageSeed: "rose", unlockLevel: 5, petalsPerHarvest: 48, xpPerHarvest: 60 },
  { sku: "p_tulip", name: "Tulip", description: "Cup-shaped charmer of the spring border.", rarity: "UNCOMMON", baseGrowthMs: 20 * HOUR, waterIntervalMs: 12 * HOUR, imageSeed: "tulip", unlockLevel: 4, petalsPerHarvest: 38, xpPerHarvest: 48, isSeasonal: true },
  { sku: "p_hydrangea", name: "Hydrangea", description: "Color depends on your soil's mood.", rarity: "UNCOMMON", baseGrowthMs: 36 * HOUR, waterIntervalMs: 16 * HOUR, imageSeed: "hydrangea", unlockLevel: 6, petalsPerHarvest: 55, xpPerHarvest: 65 },

  // RARE (4)
  { sku: "p_orchid", name: "Moth Orchid", scientific: "Phalaenopsis", description: "Patient, particular, breathtaking.", rarity: "RARE", baseGrowthMs: 2 * DAY, waterIntervalMs: 24 * HOUR, imageSeed: "orchid", unlockLevel: 8, petalsPerHarvest: 110, xpPerHarvest: 140 },
  { sku: "p_bonsai", name: "Pine Bonsai", description: "Small in stature. Vast in patience.", rarity: "RARE", baseGrowthMs: 3 * DAY, waterIntervalMs: 18 * HOUR, imageSeed: "bonsai", unlockLevel: 10, petalsPerHarvest: 140, xpPerHarvest: 180 },
  { sku: "p_birdofparadise", name: "Bird of Paradise", description: "The bloom looks ready for take-off.", rarity: "RARE", baseGrowthMs: 2.5 * DAY, waterIntervalMs: 18 * HOUR, imageSeed: "birdofparadise", unlockLevel: 9, petalsPerHarvest: 125, xpPerHarvest: 160 },
  { sku: "p_peony", name: "Peony", description: "Generous ruffles. Brief season. Worth it.", rarity: "RARE", baseGrowthMs: 2 * DAY, waterIntervalMs: 16 * HOUR, imageSeed: "peony", unlockLevel: 7, petalsPerHarvest: 100, xpPerHarvest: 130 },

  // EPIC (2)
  { sku: "p_blueglow", name: "Blueglow Lily", description: "Faintly luminescent at dusk. Worth the wait.", rarity: "EPIC", baseGrowthMs: 4 * DAY, waterIntervalMs: 24 * HOUR, imageSeed: "blueglow", unlockLevel: 14, petalsPerHarvest: 280, xpPerHarvest: 320, tags: ["night"], biome: "forest" },
  { sku: "p_starbloom", name: "Starbloom", description: "Folds into a five-pointed star at midnight.", rarity: "EPIC", baseGrowthMs: 5 * DAY, waterIntervalMs: 24 * HOUR, imageSeed: "starbloom", unlockLevel: 16, petalsPerHarvest: 320, xpPerHarvest: 400, isPremium: true, biome: "alpine" },

  // LEGENDARY (1)
  { sku: "p_celestial", name: "Celestial Bloom", description: "Said to flower only for tended gardens.", rarity: "LEGENDARY", baseGrowthMs: 7 * DAY, waterIntervalMs: 24 * HOUR, imageSeed: "celestial", unlockLevel: 20, petalsPerHarvest: 700, xpPerHarvest: 900, isPremium: true, tags: ["mythic"], biome: "tropical" },
];

const SHOP_ITEMS = [
  // Seeds (a sample purchasable in the shop, the rest unlock by drop / level)
  { sku: "shop_seed_marigold", name: "Marigold Seed", description: "An easy-going golden bloom.", kind: "SEED" as const, rarity: "COMMON" as const, priceCurrency: "PETALS" as const, price: 25, image: "/assets/plants/marigold-seed.svg", linkSpecies: "p_marigold" },
  { sku: "shop_seed_sunflower", name: "Sunflower Seed", description: "Tall, sunny, smiling.", kind: "SEED" as const, rarity: "UNCOMMON" as const, priceCurrency: "PETALS" as const, price: 80, image: "/assets/plants/sunflower-seed.svg", unlockLevel: 3, linkSpecies: "p_sunflower" },
  { sku: "shop_seed_rose", name: "Rose Cutting", description: "Heritage variety.", kind: "SEED" as const, rarity: "UNCOMMON" as const, priceCurrency: "PETALS" as const, price: 140, image: "/assets/plants/rose-seed.svg", unlockLevel: 5, linkSpecies: "p_rose" },
  { sku: "shop_seed_orchid", name: "Orchid Seedling", description: "Premium pick.", kind: "SEED" as const, rarity: "RARE" as const, priceCurrency: "COINS" as const, price: 8, image: "/assets/plants/orchid-seed.svg", unlockLevel: 8, linkSpecies: "p_orchid" },

  // Decorations
  { sku: "shop_dec_birdbath", name: "Birdbath", description: "Friends visiting your garden may leave a feather.", kind: "DECORATION" as const, rarity: "UNCOMMON" as const, priceCurrency: "PETALS" as const, price: 220, image: "/assets/decorations/birdbath.svg" },
  { sku: "shop_dec_lantern", name: "Paper Lantern", description: "Gentle glow at night.", kind: "DECORATION" as const, rarity: "COMMON" as const, priceCurrency: "PETALS" as const, price: 90, image: "/assets/decorations/lantern.svg" },
  { sku: "shop_dec_fountain", name: "Stone Fountain", description: "A centerpiece for the patient gardener.", kind: "DECORATION" as const, rarity: "RARE" as const, priceCurrency: "COINS" as const, price: 25, image: "/assets/decorations/fountain.svg", isPremium: true },

  // Themes
  { sku: "shop_theme_dusk", name: "Dusk Theme", description: "Warm pinks, deep purples.", kind: "THEME" as const, rarity: "RARE" as const, priceCurrency: "COINS" as const, price: 15, image: "/assets/themes/dusk.svg", isPremium: true, metadata: { themeKey: "dusk" } },

  // Consumables
  { sku: "shop_con_fertilizer", name: "Fertilizer", description: "Shaves growth time off all plants in your garden.", kind: "CONSUMABLE" as const, rarity: "COMMON" as const, priceCurrency: "PETALS" as const, price: 60, image: "/assets/items/fertilizer.svg" },
  { sku: "shop_con_revive", name: "Revive Potion", description: "Brings a wilted plant back to full health.", kind: "CONSUMABLE" as const, rarity: "UNCOMMON" as const, priceCurrency: "PETALS" as const, price: 120, image: "/assets/items/revive.svg" },
];

const QUESTS = [
  { slug: "q_water_3", title: "Tend the garden", description: "Water 3 plants today.", kind: "DAILY" as const, actionKey: "WATER_PLANTS" as const, goal: 3, rewardPetals: 30, rewardXp: 15, weight: 3 },
  { slug: "q_harvest_1", title: "First bloom", description: "Harvest 1 plant.", kind: "DAILY" as const, actionKey: "HARVEST_PLANTS" as const, goal: 1, rewardPetals: 25, rewardXp: 20, weight: 3 },
  { slug: "q_plant_1", title: "Seeds of tomorrow", description: "Plant 1 seed.", kind: "DAILY" as const, actionKey: "PLANT_SEEDS" as const, goal: 1, rewardPetals: 20, rewardXp: 12, weight: 2 },
  { slug: "q_visit_2", title: "Be a good neighbor", description: "Visit 2 friend gardens.", kind: "DAILY" as const, actionKey: "VISIT_GARDENS" as const, goal: 2, rewardPetals: 35, rewardXp: 18, weight: 2 },
  { slug: "q_note_1", title: "Leave kindness", description: "Leave 1 garden note.", kind: "DAILY" as const, actionKey: "LEAVE_NOTES" as const, goal: 1, rewardPetals: 25, rewardXp: 15, weight: 2 },
  { slug: "q_react_3", title: "Spread sparkle", description: "React to 3 friend gardens.", kind: "DAILY" as const, actionKey: "REACT_GARDEN" as const, goal: 3, rewardPetals: 25, rewardXp: 12, weight: 2 },

  // Weekly
  { slug: "q_w_water_25", title: "Devoted gardener", description: "Water 25 plants this week.", kind: "WEEKLY" as const, actionKey: "WATER_PLANTS" as const, goal: 25, rewardPetals: 250, rewardCoins: 5, rewardXp: 120, weight: 3 },
  { slug: "q_w_harvest_10", title: "Harvest week", description: "Harvest 10 plants this week.", kind: "WEEKLY" as const, actionKey: "HARVEST_PLANTS" as const, goal: 10, rewardPetals: 300, rewardCoins: 5, rewardXp: 150, weight: 3 },
  { slug: "q_w_visits_10", title: "Friendly bloom", description: "Visit 10 gardens this week.", kind: "WEEKLY" as const, actionKey: "VISIT_GARDENS" as const, goal: 10, rewardPetals: 200, rewardCoins: 3, rewardXp: 100, weight: 2 },
  { slug: "q_w_buy_3", title: "Treat yourself", description: "Buy 3 shop items.", kind: "WEEKLY" as const, actionKey: "BUY_ITEM" as const, goal: 3, rewardPetals: 150, rewardXp: 80, weight: 2 },
];

const ACHIEVEMENTS = [
  { slug: "ach_first_harvest", title: "First Harvest", description: "Harvest your first plant.", metric: "PLANTS_HARVESTED", threshold: 1, rewardPetals: 50 },
  { slug: "ach_green_thumb", title: "Green Thumb", description: "Harvest 25 plants.", metric: "PLANTS_HARVESTED", threshold: 25, rewardPetals: 250, rewardCoins: 5 },
  { slug: "ach_streak_7", title: "A Week in Bloom", description: "7 day login streak.", metric: "STREAK_DAYS", threshold: 7, rewardPetals: 150, rewardCoins: 5 },
  { slug: "ach_streak_30", title: "Steady Gardener", description: "30 day login streak.", metric: "STREAK_DAYS", threshold: 30, rewardPetals: 800, rewardCoins: 25 },
  { slug: "ach_friends_5", title: "Garden Party", description: "Make 5 friends.", metric: "FRIENDS", threshold: 5, rewardPetals: 200 },
];

async function main() {
  console.log("> Seeding plants…");
  for (const p of PLANTS) {
    await prisma.plantSpecies.upsert({
      where: { sku: p.sku },
      update: { ...p },
      create: { ...p },
    });
  }

  console.log("> Seeding shop items…");
  for (const item of SHOP_ITEMS) {
    const speciesId = item.linkSpecies
      ? (await prisma.plantSpecies.findUnique({ where: { sku: item.linkSpecies } }))?.id
      : null;
    const { linkSpecies, ...rest } = item as any;
    await prisma.shopItem.upsert({
      where: { sku: item.sku },
      update: { ...rest, speciesId },
      create: { ...rest, speciesId },
    });
  }

  console.log("> Seeding quests…");
  for (const q of QUESTS) {
    await prisma.quest.upsert({
      where: { slug: q.slug },
      update: q,
      create: q,
    });
  }

  console.log("> Seeding achievements…");
  for (const a of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { slug: a.slug },
      update: a,
      create: a,
    });
  }

  console.log("> Seeding test users…");
  await seedUser({
    email: "admin@floraverse.app",
    username: "admin",
    name: "Garden Admin",
    password: "Floraverse!Admin1",
    role: "ADMIN",
  });
  await seedUser({
    email: "rose@floraverse.app",
    username: "rose",
    name: "Rose Hart",
    password: "Floraverse!Rose1",
    role: "USER",
  });
  await seedUser({
    email: "iris@floraverse.app",
    username: "iris",
    name: "Iris Yoon",
    password: "Floraverse!Iris1",
    role: "USER",
  });
  await seedUser({
    email: "milo@floraverse.app",
    username: "milo",
    name: "Milo Park",
    password: "Floraverse!Milo1",
    role: "USER",
  });

  console.log("> Seeding admin settings…");
  await prisma.adminSetting.upsert({
    where: { key: "shop.featured" },
    update: { value: ["shop_seed_sunflower", "shop_dec_birdbath", "shop_con_fertilizer"] },
    create: { key: "shop.featured", value: ["shop_seed_sunflower", "shop_dec_birdbath", "shop_con_fertilizer"] },
  });

  console.log("Done.");
}

async function seedUser(args: {
  email: string;
  username: string;
  name: string;
  password: string;
  role: "ADMIN" | "USER";
}) {
  const hashed = await bcrypt.hash(args.password, 10);
  const user = await prisma.user.upsert({
    where: { email: args.email },
    update: { name: args.name, role: args.role, username: args.username },
    create: {
      email: args.email,
      username: args.username,
      name: args.name,
      role: args.role,
      hashedPassword: hashed,
      onboardedAt: new Date(),
    },
  });
  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, bio: `${args.name} is tending a tiny corner of Floraverse.` },
  });
  await prisma.garden.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, name: `${args.name.split(" ")[0]}'s Garden` },
  });
  // Drop a starter seed in inventory
  const starter = await prisma.shopItem.findUnique({ where: { sku: "shop_seed_marigold" } });
  if (starter) {
    await prisma.inventoryItem.upsert({
      where: { userId_shopItemId: { userId: user.id, shopItemId: starter.id } },
      update: {},
      create: { userId: user.id, shopItemId: starter.id, quantity: 3 },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
