# PalengkeScout — Phase 1

AI-powered community market price transparency app. React + TypeScript + Vite frontend, Supabase backend (optional in Phase 1 — see below).

## What's built (Phase 1)

- **Home** — search + browse items by category, each showing the lowest currently reported price nearby
- **Item detail** — every reported price for one item, sorted by price or recency, with a freshness badge (🟢 <1hr / 🟡 <24hr / 🔴 older) and a status badge for unverified/flagged reports
- **Report a price** — form to submit a new price report for an item at a market/store
- **My List** and **Profile** tabs are wired into navigation as placeholders — they're built in Phase 4 and Phase 6

No AI/anomaly-detection logic yet — every new report is saved as `pending` until Phase 2. This is intentional: Phase 1 is the raw, always-demoable foundation everything else builds on.

## Running it

```bash
npm install
npm run dev
```

The app runs immediately with **zero setup** — no Supabase project required. It uses a local mock data layer (`src/lib/dataClient.ts`) seeded with realistic starting data (`src/data/seed.ts`), persisted to `localStorage` for your session. This means:

- It's fully demoable out of the box
- New reports you submit during testing/demo actually save and show up
- It solves the "app looks empty" cold-start problem from day one

## Switching to real Supabase

1. Create a Supabase project
2. Run `supabase/schema.sql` in the Supabase SQL editor (creates tables, RLS policies, and seeds the same starting data as mock mode)
3. Copy `.env.example` to `.env` and fill in your project URL + anon key
4. Restart the dev server — the app automatically switches to live Supabase data (see `src/lib/supabaseClient.ts`)

## Design system

Colors are pulled directly from the PalengkeScout logo (`public/logo.png`):

| Token | Hex | Use |
|---|---|---|
| `palengke-green` | `#075C34` | Primary — top bar, buttons, wordmark |
| `palengke-red` | `#C5211C` | Secondary accent |
| `palengke-gold` | `#FEC502` | Highlights |
| `fresh-green/amber/red` | — | Freshness indicator only, not brand color |

Typography: **Baloo 2** (display/headings — rounded, friendly, market-stall energy) + **Inter** (body/UI — clean and legible at small sizes for older users).

Built mobile-first per the accessibility/touch guidelines: 44px+ touch targets, 16px base font, visible focus rings, no hover-only interactions — this is designed to be wrapped in MIT App Inventor's WebViewer per the project plan.

## Next phases

See the phase plan: Phase 2 (AI anomaly detection), Phase 3 (location/distance), Phase 4 (shopping list comparison), Phase 5 (trends), Phase 6 (trust/reputation), Phase 7 (App Inventor wrapper + publishing), Phase 8 (polish + demo prep).
