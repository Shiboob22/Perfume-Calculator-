# Kyphira (formerly Scent Ledger) — unified system

One Supabase-backed React app: search, calculate, log batches, and track
inventory. Replaces the previous split between the HTML tool (local
database + localStorage personal log) and this app (Supabase search
only, dumb calculator) — everything now shares one database.

## Design system and motion (Kyphira, branch `redesign/kyphira`)

- **Tokens:** colours are CSS variables generated from `PALETTES` in `src/lib/theme.js` (light default, dark behind a toggle; one accent, resin). Text uses the `*Text` shades; contrast of both palettes is unit-tested. Radius, type scale and motion durations come from the same file. Faces: Newsreader (display), Hanken Grotesk (UI), Noto Naskh Arabic (Arabic display), IBM Plex Sans Arabic (Arabic UI).
- **Components:** `src/components/kx/` (`Button`, `Card`, `Chip`, `Field`, `FragranceCard`, `Notice`, `RoomHeader`, `ScaleReadout`, `SmokeLine`, `Stepper`, `KyphiraLogo`). Rooms compose these; they do not restyle them.
- **Motion layer:** `src/motion/`, behind the `motion` flag (sets `<html data-motion>`). Primitives: `Reveal`, `Stagger`, `TextReveal`, `DrawLine`, `Parallax`, `Pin`, `CountUp`, `Skeleton`, `PageTransition`, `Link`, `useNavigate`. Rooms use only these. Tokens in `src/motion/config.js` (150 / 250 / 600 ms, two eases, stagger step 60 ms). Rules: calculator figures never animate; above-the-fold content never fades in prerendered markup; `eager` is for client-rendered content only; reduced motion and no-flag give a static page; a changed `key` on a `Stagger`/`Reveal` replays an entrance.
- **Living sheet:** `/dev/design` and `/ar/dev/design` under `vite dev` (tokens, EN/AR side by side, motion tokens with replay, component states). `/dev/motion` and `/dev/primitives` show the layer's progress and reduced-motion/RTL switches. None of these are in a production build.
- **Home:** the Compounding scroll scene (flag `compounding`) plus the Homepage v2 keyframes (`.kv`, `.kv-grow`, `.kv-fade` in `src/index.css`).
- **Checks:** `npx playwright test` (axe runs after entrances settle), `npm run test`, `node scripts/perf-pages.mjs <base-url>` for LCP/CLS on a throttled phone, `node scripts/screenshots.mjs <dir> <base-url>` for screenshots. Latest numbers: `docs/redesign/METRICS-2026-10-18.md`. Handoff: `docs/redesign/KYPHIRA-HANDOFF.md`.

## Architecture

```
Search tab   ──reads──►  perfumes table      (scraper backend writes this)
Calculator   ──reads/writes──►  fragrances, fragrance_notes, batches, inventory
Batches tab  ──reads/deletes──►  batches
Inventory    ──reads/writes──►  inventory
```

All four new tables are defined in `supabase-schema-v2.sql`. The
`fragrances` table replaces the 468-entry array that used to be
hardcoded in the standalone HTML tool — `seed-fragrances.sql` was
generated directly from that array (not retyped) so nothing was lost
in the move.

## Setup

1. **Run the schema**, in order, in the Supabase SQL Editor:
   - `supabase-schema-v2.sql` — creates `fragrances`, `fragrance_notes`,
     `batches`, `inventory`, and their RLS policies
   - `seed-fragrances.sql` — populates `fragrances` with the existing
     468-entry classification database
   - (if not already done) the scraper backend's `schema.sql` +
     `supabase-rls.sql` for the `perfumes` table, used by Search

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment** — same as before:
   ```bash
   cp .env.example .env
   # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
   ```

4. **Run it:**
   ```bash
   npm run dev
   ```

## What each tab does now

- **Search** — unchanged: reads the scraped `perfumes` table
  (Fragrantica-style note/accord data). Selecting a result hands its
  name to the Calculator tab.
- **Calculator** — now looks up the fragrance name against the
  `fragrances` table as you type (auto-classifying family/tier, same 5
  tiers as the HTML tool: Fresh, Floral, Woody, Gourmand, Amber). If
  the name isn't in the database yet, it's added automatically the
  first time you log a batch for it — the app's own way of building
  the database, instead of asking Claude to hand-edit source code.
  Personal log fields (oil type, price/gram, notes) now save to
  Supabase instead of browser localStorage, so they follow you across
  devices.
- **Batches** *(new)* — every batch you log is a permanent record: date,
  fragrance, concentration, exact weights/volumes, cost, notes. This is
  now an actual production history, not just one-off math.
- **Inventory** *(new)* — stock on hand per fragrance oil, in grams.
  Logging a batch automatically subtracts the oil grams used. Restock
  manually with the "Add stock" field; a low-stock threshold (default
  10g, editable per fragrance) flags anything running low.

- **Ask** *(new)* — chat with Gemini about blending. It knows the five
  families and your last 30 batches. Search, Calculator and Batches also
  gain Gemini buttons (look up an unknown perfume, advise on a blend,
  summarise your batch log). All calls go through `api/ai.ts`; needs
  `GEMINI_API_KEY` (see DEPLOYMENT.md step 5).

## A security note on Row Level Security

`supabase-schema-v2.sql` grants the anon key full read/write on all
four new tables. That's appropriate here because this is a private,
single-user Supabase project — only you hold the URL and anon key. It
would NOT be an appropriate pattern for a public, multi-tenant app;
don't copy this RLS approach if this project ever needs to support more
than one person.

## What didn't make it into this pass

The HTML tool's canvas-drawn PNG/JPG receipt export was **not** ported
to this app in this round — that's a real feature gap, not an
oversight I'm hiding. The HTML tool still works standalone (with its
own local database and localStorage log) if you want receipt export
today; porting that to the unified system is a reasonable next step if
you want it.

## Folder structure

```
scent-handbook-app/
├── supabase-schema-v2.sql     ← run first
├── seed-fragrances.sql        ← run second (generated from the HTML tool's DB)
├── supabase-rls.sql            (perfumes table policy, from the scraper backend setup)
├── index.html
├── package.json / vite.config.js / tailwind.config.js / postcss.config.js
├── .env.example
└── src/
    ├── main.jsx / App.jsx      4 tabs: Search, Calculator, Batches, Inventory
    ├── index.css
    ├── lib/
    │   ├── theme.js             shared color tokens
    │   ├── tiers.js             5-tier family/density definitions (ported from HTML tool)
    │   ├── supabaseClient.js    browser Supabase client (anon key)
    │   └── fragranceApi.js      all reads/writes: fragrances, notes, batches, inventory
    └── components/
        ├── FlaconMark.jsx
        ├── PerfumeSearch.jsx            (unchanged)
        ├── FragranceBlendCalculator.jsx  (rewritten: Supabase-backed, full tier system, log-batch action)
        ├── Batches.jsx                   (new)
        └── Inventory.jsx                 (new)
```
