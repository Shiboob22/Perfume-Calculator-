# Phase 1 — Brand and design system

Branch `redesign/kyphira-p1-brand` (off `redesign/kyphira-p0-audit`).

## Decisions taken (owner, 2026-10-14)
1 consolidate API routes, stay on Hobby · 2 keep the catalog, hide the Atlas behind a flag, licensing later · 3 Nose uses the free Gemini key for now · 4 light stays the default theme · 5 **densities:** the handbook's 0.95 g/mL stays the single default; per-family presets (Fresh 0.87 … Oriental 1.02) stay as editable presets, so the brief's table does not replace the method (Phase 3) · 6 bench goes deeper, with bottle price per batch (Phase 3) · 7 wardrobe, essay and Arabic approved · 8 backup before production migrations: `BACKUP.md`.

## Tagline: "Make it. Wear it. Know it."
It names what the six rooms do and nothing else; three short imperatives that become three Arabic imperatives (اصنعه. ارتدِه. اعرفه.). "The first perfume formula was carved in stone…" is stronger as a story but is 11 words: it opens the origin essay instead. "Every drop, weighed with care." stays as the bench's motto. **The new line is in `src/brand.js` and the styleguide, not yet in the header:** "Wear it. Know it." promises rooms that are still behind flags, so the header keeps the bench motto until the Wardrobe and Atlas ship.

## Mark: three directions, you pick
`/styleguide` (dev) and `public/brand/`: A censer-and-smoke K, B flacon with smoke rising, C monogram K with an ember. Each as ink, mono, reversed, favicon and app-icon tile (`npx vite-node scripts/make-brand-assets.mjs`). A is the provisional default. The header and `public/icon.svg` still show the old flacon until you choose.

## What changed
- **Name:** `src/brand.js` is the single config (name, Arabic spelling كيفيرا, tagline, motto, entity, notice dates). Titles, meta, JSON-LD, manifest, recipe pages, export, cards, EN and AR strings use it; the printed books keep "The Scent Handbook" in citations.
- **Rooms:** `/bench`, `/bench/journal`, `/library`, `/library/:slug` serve the existing app and guides. 301s: `/app/calculator`, `/app/batches`, `/guides`, `/guides/:slug`, `/ar/guides…`, queries kept (`vercel.json`, mirrored in `scripts/serve-dist.mjs`, listed once in `src/routes.js`, tests keep the three equal). Other tabs stay at `/app/<tab>` until their room exists. `/app/*` still works; shared recipes `/r/<slug>` unchanged.
- **Tokens:** `PALETTES` gain resin, myrrh, verdigris (+ text-safe shades) and the dark palette follows the brief's ink/papyrus values; every text pair is tested at 4.5:1 in both themes.
- **Components** `src/components/kx/`: Button, Field, Card (catalogue numbers), Notice (incl. the ethanol warning), ScaleReadout (large mono digits, tare, poured-vs-target bar, live region), SmokeLine (divider and loading, still under reduced motion), KyphiraMark, RenameNotice. Pure helpers `pourProgress`, `renameNotice`, `contrast` are tested.
- **Rename notice:** "Scent Ledger is now Kyphira" for signed-in users, 2026-10-14 for 60 days, dismissible (e2e covers both).
- **`/styleguide`, `/ar/styleguide`:** dev only.
- **Type:** Fraunces, Inter Tight, IBM Plex Sans Arabic installed and shown in the styleguide only. Making them the live faces, plus the font preloads, is the Phase 2 re-skin, so the live site and its CLS do not move in this phase.

## Not done
Performance baseline (needs a preview deploy), WebGL smoke hero (Phase 2, with the hero), visual-regression snapshots (Phase 2 baseline), Supabase Auth redirect URLs for `/bench` (owner-side, below).

## Owner-side before production
Add `https://<domain>/bench` and `/bench/journal` to Supabase Auth redirect URLs on both projects; sign-in falls back to `/app` meanwhile, which still works.
