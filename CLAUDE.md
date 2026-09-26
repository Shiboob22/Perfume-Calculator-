# The Scent Handbook — working brief

Repo `Shiboob22/Perfume-Calculator-` · live at `scent-handbook-app-shiboob22s-projects.vercel.app` (alias `scent-handbook-app.vercel.app`).
Owner and author of the handbooks: Hisham Shiboob.

The product is **The Scent Handbook**. Use that name everywhere (titles, meta, emails, cards). "Atelier Noir" is only the internal name of the visual theme in `src/lib/theme.js`; it never appears in the UI.

---

## Current phase

**Phase 0 — takeover review (done, awaiting approval).** Read the whole repo and all three handbooks, wrote this file, reported the codebase read, risks and disagreements. No feature code written. Next: owner answers the open questions below, approves a phase plan, then Phase 1 starts on its own branch.

Open questions blocking Phase 1 (see "Content gaps" and "Decisions pending"):
1. Family oil densities (0.87–1.02) and family default concentrations / rest days: not in any handbook. Keep as "house defaults", or drop to the handbook's single 0.95?
2. Live Supabase schema: need a schema-only dump (or access) to write the baseline migration.
3. Is a "Wardrobe" (choose-what-to-wear) feature in scope? It is not one of the four pillars.
4. Catalog data licensing (Fragrantica dataset, HF `doevent/perfume`, live Parfumo scrape, hot-linked `fimgs.net` photos) for a commercial product.
5. Hosting plans: Vercel Hobby is non-commercial; Supabase free tier has no backups.

Update this section at the end of every phase.

---

## Where it is going

The best SaaS for **DIY fragrance blenders**: people who dilute ready-made fragrance concentrate (oil) with perfumer's alcohol to make their own bottles. Not from-scratch perfumery, no raw-material formula builder.

Four pillars:
1. **Calculator** — the most accurate, most forgiving blending calculator on the web, built on the Formulation method.
2. **Techniques library** — drawn from the three handbooks, searchable and indexable (needs server-rendered or prerendered HTML).
3. **Marketing site** — public, with a pricing page; the app lives behind login.
4. **Arabic (RTL) edition** — full, alongside English.

Billing: **free for now, billing-ready.** Plans + entitlements exist and gate features (checked on the server, not only in the UI). No payment provider connected. Everyone starts on Free; the owner can flip a user to Pro by hand.

---

## How to work (owner's rules — follow exactly)

- **Plan first, wait for approval, then build.** After each major step, a 2–3 line summary.
- **Small commits, one concern each, clear messages.** One branch per phase, a PR per phase, a Vercel preview per phase.
- **Database:** every change is a new numbered migration in `supabase/migrations/`. Never edit the live database by hand. Never drop or rewrite existing user data. Show destructive SQL to the owner before running it.
- **Calculator math lives in pure functions with unit tests (Vitest).** No math inside components.
- **Design system:** keep it. Extend `theme.js`, don't replace it. No new UI library without a written justification.
- **i18n:** from Phase 1 onward every user-facing string goes through the i18n layer, EN and AR added together.
- **Mobile first.** Most users blend at a bench with a phone next to the scale.
- **Don't delete working features.** If something should go, ask.
- **Handbook content is the owner's.** Don't invent techniques, numbers or claims. If a page needs something the handbooks don't cover, list the gap and ask.
- **Push back before building** if something in the brief is wrong or a better approach exists.
- The owner checks the **deployed** URL, not localhost.

---

## Stack and layout (as of Phase 0)

- Vite 5 + React 18 + Tailwind 3 SPA. No router: tabs are React state in `src/App.jsx`. No tests, no lint, no `tsconfig`.
- Supabase: auth (magic link, Google, Apple OAuth via `src/components/AuthGate.jsx`) + Postgres. The browser client in `src/lib/supabaseClient.js` wires `AuthClient` + `PostgrestClient` by hand to keep supabase-js out of the bundle.
- Vercel functions in `api/*.ts`, region `dub1`. They use the **service-role key and bypass RLS**, so every handler must check auth and scope by `user_id` itself.
  - `api/batches.ts`, `api/inventory.ts` — authed, per-user.
  - `api/search.ts`, `api/similar.ts` — anonymous, CDN-cached catalog reads; `search` can live-scrape Parfumo and save to `fragrances` for signed-in callers.
  - `api/ai.ts` — Gemini free tier; tasks `chat`, `lookup`, `tips`, `insights`.
- Tabs: Search (`PerfumeSearch.jsx`), Calculator (`FragranceBlendCalculator.jsx`), Batches, Inventory, Ask (`PerfumerChat.jsx`).
- Batch PNG card: `src/lib/batchCard.js` (Canvas 2D, no deps). Timing: `src/lib/batchTiming.js`.
- Visual identity: `src/lib/theme.js` (warm near-black ground, ivory text, one amber accent; legacy aliases `forest`/`forestDeep`/`brass` kept). Fonts: Cormorant Garamond, Space Grotesk, IBM Plex Mono (latin subsets only). Mark: `FlaconMark.jsx`.
- Handbook PDFs: `content-src/` in the **main checkout only** (untracked). Identical copies in `~/Downloads`.

### Database — repo SQL does not match live

The root `supabase-*.sql` files are hand-run scripts, not migrations, and the live schema has drifted from them (ad-hoc scripts like the deleted `fix_schema.js` altered it). Evidence: `supabase-schema-v2.sql` has no `user_id` on `batches`/`inventory`, but the API code and `supabase-restock-rpc.sql` assume `(user_id, fragrance_id)`. **Before the first migration, capture a schema-only dump of live as `supabase/migrations/0000_baseline.sql`.** The Supabase MCP connected to this machine is on a different account and cannot see project `nhfpgjikyolrwmbmqrng`.

Tables: `fragrances` (shared catalog, ~80k rows, generated `search_text`/`all_notes`/`priority`), `fragrance_notes` (per-user), `batches`, `inventory`, `perfumes` (legacy scraper table), storage bucket `bottles`.

---

## The method (Vol. III Formulation — source of truth for the calculator)

- Formulate **by mass**, not volume. Reference densities: **fragrance oil 0.95 g/mL**, **96% ethanol 0.81 g/mL** — bench starting points, **a measured density always wins**.
- For target volume V and concentration C: oil volume = V×C, alcohol volume = V×(1−C); oil mass = V×C×0.95; alcohol mass = V×(1−C)×0.81; batch weight = sum.
- Named strengths: **15% EDT · 20% EDP · 25% EDP Intense · 30% Extrait.**
- Quick Reference table (30/50/100 mL × the four strengths) — e.g. 100 mL @ 25% → 23.75 g oil, 60.75 g alcohol, 84.50 g total. These values are the calculator's golden test fixtures.
- Bench: tare before every component, add slowly, stabilise before recording, consistent temperature, **record actual weights**. Flammability caution. Mix ~60 s gently. QC checklist. Suggested label fields.
- "On Accuracy": concentrates vary; final volume can differ from the nominal sum.

Calculator today: by-volume when the batch is in mL / fl oz (matches the handbook), by-weight when in g / oz (not in the handbook — keep, but label the basis clearly and store it on the batch).

### Three disagreeing sources (to reconcile into one module)

| Source | Oil density | Concentrations | Rest |
|---|---|---|---|
| Formulation handbook | single 0.95 | 15 / 20 / 25 / 30 named strengths | not covered |
| `src/lib/tiers.js` | per family 0.87–1.02 | family defaults 20/25/22/30/25 | per family 1–6 weeks |
| `data/perfume-ratios.json` | — | family ranges (e.g. Citrus 15–18%) | — |

Also duplicated in `api/ai.ts` (`TIER_GUIDE`, `PERFUMER_RULES`) and hard-coded in the calculator's `densities` state. Handbook rule stands: reference densities are starting points, measured density wins.

---

## Handbook content — what may be published

- **Public method:** all of Vol. III Formulation; Vol. I Application Parts I–IX and XI–XV (performance equation, prep, placement, spray-count system, skin vs clothing, optimisation, layering, climate framework, type framework, 15 mistakes, evidence verdicts, 60-second protocol, wear profiles, closing rule + olfactory radius); Vol. II Wardrobe method only (Five Wardrobes as categories, temperature bands, occasion/dress, decision tree, social-distance bands, rotation & acquisition discipline, the wardrobe principle).
- **Private — never published:** Application Part X (the owner's bottles); Wardrobe collection pages, field guide, core five, individual profiles, occasion matrix, rankings, signature winners, cheat sheet, and every score. Most Wardrobe method pages name the owner's bottles inline; publishing them needs a bottle-free rewrite **approved by the owner**.
- The owner's collection may be used as **demo data for a Wardrobe feature only with explicit approval.**
- Evidence labels (Scientific / Plausible / Anecdotal / Myth) are part of the voice — keep them on every claim that has one.
- Arabic translations of handbook text need the owner's review before publishing.

### Known content gaps (ask before filling)

- Maceration / rest times per family (in `tiers.js`, not in any handbook).
- Per-family oil densities and default concentrations (in `tiers.js`, not in any handbook).
- How to measure a concentrate's density at the bench.
- Correction procedure after overshooting a pour (handbook: "unless you have a controlled procedure").
- Storage conditions after mixing.
- AI prompt rules in `api/ai.ts` ("20–30%", ">35% harsh", "10–30 mL test batch") are not from the handbooks.

---

## Known problems (fix early)

- **RLS:** `supabase-schema-v2.sql` has `using (true) with check (true)` on `fragrances`, `fragrance_notes`, `batches`, `inventory`. Live state unknown. Every user-owned row needs `user_id` + owner-only policies. `fragrances` currently lets any signed-in user `update` any catalog row.
- **Gemini free tier:** Google may use prompts for training. Before public launch, move to a paid key or disclose clearly with opt-out. No per-user quota today — one user can drain the shared free quota.
- **Title:** `index.html` says "The Scent Handbook — Atelier Noir"; `AuthGate` shows "Atelier Noir · Sign in". Use The Scent Handbook.
- **Personal data in UI:** login placeholder `hisham@oravue.com`; calculator `OIL_TYPE_OPTIONS` lists the owner's suppliers.

### Bugs spotted in Phase 0 (not yet fixed)

- `setLowStockThreshold` POSTs without `stock_g`; `api/inventory.ts` rejects it with 400 and the UI swallows the error — thresholds never save.
- Search "+ Add to Inventory" calls `setStock(id, 0)`, which upserts and **resets existing stock to 0**.
- Logging the first batch for an oil with no inventory row: the restock RPC likely returns nothing → 404 → UI says "Could not save" although the batch was saved (retry = duplicate batch).
- Batches don't record the concentration basis (volume vs weight); `batchCard.js`/`Batches.jsx` always say "by volume".
- `upsertFragrance` upserts on `name`, so a race with the debounced lookup can overwrite a curated row's `tier`/`source`.
- If live `fragrance_notes` still has `fragrance_id` as sole PK, a second user's notes for the same oil fail RLS and block "Log this batch".
- Batch-size presets always say "mL" even when the unit is g/oz; concentration presets lack 15% (EDT).
- `seed_full_catalog.cjs` uses tier values the check constraint rejects; `pg` dependency is unused; `test-e2e.mjs` signs up real accounts against production.
