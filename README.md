# 🌿 Floraverse

A cozy social digital-garden game. Plant. Grow. Visit friends. Leave kindness.

> Hybrid of Webkinz (ownership), Animal Crossing (cozy customization), Finch (gentle habit loop), Pinterest (aesthetic identity), Clash of Clans (progression + economy).

This is a **production-ready** Next.js + Prisma + Stripe app — full-stack, authenticated, monetized, with admin tooling.

**Live**: https://floraverse.vercel.app

---

## Stack

- **Framework**: Next.js 15 App Router · TypeScript · Tailwind · shadcn-style components
- **DB**: PostgreSQL (Neon, Supabase, Vercel Postgres marketplace, etc.) via Prisma
- **Auth**: Auth.js (next-auth v5 beta) — credentials + optional Google
- **Payments**: Stripe (subscriptions + one-time coin packs)
- **Email**: Resend (optional, abstracted)
- **Hosting**: Vercel (recommended)

---

## File map

```
app/
  ├ (root)              landing, login, signup
  ├ app/                authenticated app (dashboard, garden, quests, shop, friends, profile, billing)
  ├ admin/              admin & moderator panel
  ├ u/[username]/       public garden visit pages
  └ api/
      ├ signup
      ├ auth/[...nextauth]
      └ stripe/{checkout,portal,webhook}

server/
  ├ actions/           server actions (garden, care, shop, social, quests, rewards, profile, admin, onboarding)
  └ queries/           cached read-side queries (dashboard, etc.)

lib/                    db, auth, config, currency, plant-engine, quests, streak, moderation, validation, analytics, rate-limit, stripe, notifications, email, level, utils

components/
  ├ ui/                primitives (button, card, dialog, progress, tabs, …)
  ├ brand/             logo
  ├ game/              plant-art, garden-grid, currency-pill, paywall, rarity-badge
  └ app/               app-shell

prisma/
  ├ schema.prisma      full data model
  └ seed.ts            20 plants, 10 shop items, 10 quests, 5 achievements, 4 users
```

---

## 0. Prerequisites

- Node.js 20+
- A Postgres URL (Neon free tier works great)
- (optional) Stripe test keys
- (optional) Resend key for email

---

## 1. Install

```bash
npm install
cp .env.example .env
# fill in DATABASE_URL, AUTH_SECRET (openssl rand -base64 32) at minimum
```

## 2. Database

```bash
npx prisma generate
npx prisma migrate dev --name init      # or `npm run db:push` for quickstart
npm run db:seed
```

Seed creates:

| Email | Password | Role |
|---|---|---|
| `admin@floraverse.app` | `Floraverse!Admin1` | ADMIN |
| `rose@floraverse.app`  | `Floraverse!Rose1`  | USER |
| `iris@floraverse.app`  | `Floraverse!Iris1`  | USER |
| `milo@floraverse.app`  | `Floraverse!Milo1`  | USER |

…plus 20 plant species, 10 shop items, 10 quests, 5 achievements, and starter inventory for each user.

## 3. Run

```bash
npm run dev
# → http://localhost:3000
```

Visit `/signup` to create an account, or log in with the test admin to access `/admin`.

---

## 4. Stripe (test mode)

1. Get test keys from https://dashboard.stripe.com → toggle **Test mode**.
2. In Stripe Dashboard → **Products**, create:
   - `Floraverse Plus` recurring · monthly **$4.99** → copy the price ID into `STRIPE_PRICE_PLUS_MONTHLY`
   - `Floraverse Plus` recurring · yearly **$49.99** → `STRIPE_PRICE_PLUS_YEARLY`
   - `100 Bloom Coins` one-time **$2.99** → `STRIPE_PRICE_COINS_SMALL`
   - `350 Bloom Coins` one-time **$8.99** → `STRIPE_PRICE_COINS_MEDIUM`
   - `1000 Bloom Coins` one-time **$19.99** → `STRIPE_PRICE_COINS_LARGE`
3. Set `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in `.env`.
4. Local webhooks:
   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   # copy the whsec_... value into STRIPE_WEBHOOK_SECRET
   ```
5. Test cards: `4242 4242 4242 4242`, any future date, any CVC.

---

## 5. Deploy on Vercel

```bash
# 1. Push to Github
# 2. Import to Vercel → set environment variables (same as .env.example):
#    DATABASE_URL, AUTH_SECRET, AUTH_URL, NEXT_PUBLIC_APP_URL,
#    STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_*,
#    ADMIN_EMAILS, RESEND_API_KEY (optional)
# 3. Build command: npm run build  (runs prisma generate first)
# 4. After first deploy:
#    npx prisma migrate deploy   (in Vercel CLI / GitHub Action / Neon UI)
#    npm run db:seed             (optional, one time)
# 5. In Stripe Dashboard → Developers → Webhooks, add endpoint:
#    https://YOUR-DOMAIN/api/stripe/webhook
#    Events: checkout.session.completed, customer.subscription.updated,
#            customer.subscription.deleted
```

Database recommendations on Vercel: install **Neon** or **Supabase** from the [Vercel Marketplace](https://vercel.com/integrations) — they auto-provision `DATABASE_URL`.

---

## 6. Game systems (where things live)

| System | Source |
|---|---|
| Plant growth (real-time, decay, wilt, harvest) | `lib/plant-engine.ts` |
| Streak (login + daily/timed claim) | `lib/streak.ts` |
| Quest assignment, progress, reward | `lib/quests.ts` |
| Currency ledger (atomic spend/earn) | `lib/currency.ts` |
| Level / XP curve | `lib/level.ts` |
| Note moderation | `lib/moderation.ts` |
| Rate limiting | `lib/rate-limit.ts` |
| Analytics | `lib/analytics.ts` (`trackEvent(userId, event, metadata)`) |
| Stripe checkout / portal / webhooks | `app/api/stripe/*` |
| Paywall component | `components/game/paywall.tsx` |
| Admin gating | `lib/auth.ts#requireAdmin/requireMod`, `app/admin/layout.tsx` |

Tweak the entire game economy in **one place**: `lib/config.ts → ECONOMY`.

---

## 7. Test the loop

1. Sign up.
2. You start with 150 🌸 + 10 🪙 + 2 marigold seeds.
3. Garden → tap an empty plot → plant a marigold.
4. Tap the plant → water it.
5. (For dev) drop the species `baseGrowthMs` in `prisma/seed.ts` to a few minutes to test full lifecycle.
6. Quests page → today's quests fill in as you act.
7. Daily reward & timed reward on the dashboard.
8. Visit `/u/rose` to test friends + notes + reactions.
9. Buy something with petals in `/app/shop`.
10. Open `/app/billing` → Stripe checkout for Plus or coins (test mode).
11. Sign in as admin → visit `/admin` to moderate.

---

## 8. Known limitations / next steps

- **Image assets** are currently rendered as inline SVGs (see `components/game/plant-art.tsx`). Drop real artwork into `public/assets/plants/` and switch to `<Image>`.
- **Rate limiting** is in-process — for multi-instance prod, swap with Upstash Redis (`@upstash/ratelimit`).
- **Email verification** is wired into Auth.js but not enforced — add a verify-email gate if needed.
- **Achievements** are seeded but not auto-awarded yet — add an `awardAchievement(userId, slug, progress)` call inside the relevant care/social actions. See `lib/quests.ts` for the pattern.
- **Real-time** updates use server actions + `revalidatePath`. For live multiplayer feel, add Pusher / Vercel KV pub-sub on visits/notes.
- **Seasonal events** schema is present (`SeasonalEvent` model) but no UI — add `/app/events` and a banner in `app-shell.tsx`.
- **Garden expansion** for Plus only adds 2 row/col (`server/actions/garden.ts#expandGarden`); pair with the paywall and a button on the garden page.
- **Mobile haptics, sound, particle effects** for harvest moments would lift the cozy feel another notch.
- **i18n** — wrap copy in next-intl when ready.

## 9. Roadmap

- v0.1 (this) — core loop, social, shop, billing, admin
- v0.2 — seed packs (gacha), seasonal events, achievement auto-award
- v0.3 — push notifications + native PWA
- v0.4 — friend gardens with collaborative care, gifting
- v1.0 — public launch, marketing site polish, plant art pack

---

Built with care. Plant something today. 🌱
