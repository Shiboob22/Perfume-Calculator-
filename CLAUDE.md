# The Scent Handbook — working brief

Repo `Shiboob22/Perfume-Calculator-` · live at `scent-handbook-app-shiboob22s-projects.vercel.app` (alias `scent-handbook-app.vercel.app`).
Owner and author of the handbooks: Hisham Shiboob.

The product is **The Scent Handbook**. Use that name everywhere (titles, meta, emails, cards). "Atelier Noir" is only the internal name of the visual theme in `src/lib/theme.js`; it never appears in the UI.

---

## Current phase

**Released to production 2026-10-02.** Phases 1–5 are merged into `main` (fast-forward) and deployed to `scent-handbook-app.vercel.app`. Migrations 0001–0011 applied to production through the Supabase connector after the owner's approval; production's schema fingerprint (columns, policies, grants, constraints, functions, RLS) matches staging, where the 42-check RLS test passes. The pre-migration backup schema was dropped on the owner's request (2026-10-02). Lighthouse mobile on production: Accessibility, Best Practices, SEO 100. Still owner-side: see `LAUNCH.md` §1–3 and §5 (Auth redirect URLs, custom domain, SMTP, paid plans, legal text, Web Analytics toggle).

**Phase 6 — Retention and growth: plan approved 2026-10-02, building (branch `phase-6-retention-growth`, off `main`).** Resting Journal: check-ins at day 1 · rest start · rest end · rest end + 14 (from `formulation.ts` `restDays`), due until the next point then quietly missed, ad-hoc check-ins allowed; one line + optional 1–5 rating; Batches tab badge + "due" strip; check-ins Free and outside the batch cap (max 20 per batch, rate-limited); personal pattern (median per-batch peak day, ≥3 batches each with ≥2 ratings incl. one after day 1, worded as the user's own history) is Pro (`journal.insights`) with a Free teaser; email reminders are a fast-follow once SMTP exists. Shareable Recipes: Free; separate public note (not the private `notes`), sharer's own rest days (not the family default, which isn't handbook content), weights + basis included, never cost/inventory/email/supplier; anonymous (no display names in v1); `/r/<slug>` + `/ar/r/<slug>` server-rendered by `api/recipe.ts` from a pure template with the anon key (RLS = published only), same HTML for bots and people, CDN 5 min (unshare visible within 5 min); static per-family OG images; `/sitemap.xml` becomes an index of build-time pages + a dynamic recipes sitemap; only recipes with a public note ≥40 chars are indexed. Migrations 0012 (batch_checkins) and 0013 (shared_recipes). Owner decisions: trademark risk of recipe names goes to the lawyer with `/terms` (not blocking); moderation v1 = report email + manual unpublish.

**Phase 5 — Launch hardening: built, in review (branch `phase-5-launch`, stacked on Phase 4).** Migrations 0010 (rate limits) and 0011 (batches/inventory writable only through `/api`) on staging only; RLS isolation test 42 checks. Rate limits (Ask, live lookups, batch logs, deletion, error reports); error boundary + `/api/log` client error reports; offline outbox never drops a batch unseen (keeps on 401/429/5xx, refused ones listed in Batches); batch delete confirms; WCAG 2.2 AA pass (contrast tokens `dim`/`field`/`focus`, amber focus ring, combobox, live regions, headings, targets) checked by axe in Playwright; EN/AR batch card; export with oil names and paging; font preloads (CLS 0.11 → 0); Playwright suite + CI job, opt-in signed-in journey against staging; `LAUNCH.md`. Rate limits approved as built (2026-10-02). Printable bottle labels at `/app/labels` (Pro). Open decisions specific to Phase 5: label sizes (built with defaults 50×30/70×40/90×50 mm + custom, `src/lib/labels.js`), whether to add Sentry-style monitoring beyond runtime logs.

**Phase 4 — Site, account and billing seam: built, in review (branch `phase-4-site`, stacked on Phase 3).** Migrations 0007–0009 (profiles, pro_waitlist, billing seam) on staging only; RLS isolation test now 37 checks. Onboarding (3 questions → calculator opens at the answers), `/app/account` (plan + usage, Pro waitlist, preferences, JSON/CSV export, delete account via `DELETE /api/account` — email typed back, admins refused, immediate), billing seam (`api/_lib/billing.ts`, 501 webhook, `docs/billing.md`), draft `/privacy` + `/terms` (noindex, `[OWNER: …]` placeholders), Ask AI disclosure, safety notice on blending guides, empty-state actions, Vercel Web Analytics (needs switching on in the Vercel project). Open decisions specific to Phase 4: manual-grant vs provider-event precedence (`resolvePlan`), deletion grace period (built: immediate), provider choice/prices, all `[OWNER: …]` legal facts + lawyer review, landing copy approval.

**Phase 3 — Library: built, in review (branch `phase-3-library`, stacked on Phase 2).** 15 guides EN/AR (3 Blending from Vol. III, 12 Wearing from Vol. I), search, evidence badges, JSON-LD, Pro printable cards at `/app/cards`. Choosing (Wardrobe) guides wait on neutral-example approval. Guide content lives in `src/content/` (JS modules; EN follows the handbook, AR drafts `needsReview`).

**Phase 2 — Calculator: built, in review (branch `phase-2-calculator`, stacked on Phase 1).** Migrations 0004–0006 on staging only. Calculation core `src/lib/calc/` (100% covered, golden tests = Vol. III Quick Reference), four modes, measured density, presets, bench mode `/app/bench`, offline (service worker + outbox), warnings, sources, Pro cost. Open decisions specific to Phase 2: pour tolerance (none set; check shows deviation only), density bounds (proposed 0.80–1.20 / 0.78–0.83), whether measured density / by-weight are Pro, the density-measurement wording. Until the numbers table is decided, guide links (0.95) and calculator family densities (e.g. Fresh 0.87) give different grams.

**Phase 1 — Foundations and safety: built, in review (branch `phase-1-foundations`, PR open).** Migrations 0001–0003 are applied to STAGING only; production gets them at merge, after the owner approves the SQL.

Done in Phase 1: tooling + CI (lint, typecheck, Vitest, bundle secret check); baseline migration; catalog ownership + moderation (0001), user-data hardening (0002), plans + `can()` (0003); RLS isolation test (30 checks, staging); inventory/batch-log bugs; the numbers module (`src/lib/formulation.ts`, values unchanged); i18n on every screen (EN/AR, plurals, errors); Arabic fonts (lazy) + digit setting; React Router with `/app/<tab>`; prerendered public site (home, pricing, 3 Formulation guides, EN/AR, sitemap, robots, 404).

Waiting on the owner:
1. Approve the production SQL (0001–0003) and the merge. At merge also: add `/app` URLs to production Supabase Auth redirect URLs.
2. Staging Auth URL configuration (Site URL + preview redirect wildcard) so sign-in works on previews.
3. The numbers table (`npm run numbers:diff`): densities, ranges, defaults, presets, rest days.
4. Plan feature map + Free cap (25 proposed); pricing wording; Gemini key tier.
5. Review of all Arabic strings and the three Arabic guide drafts; Arabic spelling of the byline.
6. Landing copy (draft from the Phase 4 plan).
Later phases: Wardrobe feature scope; catalog data licensing; hosting plans (Vercel Hobby is non-commercial; Supabase free has no backups).

Update this section at the end of every phase.

## Phase plan (approved 2026-09-27)

Each phase: own branch `phase-N-<slug>`, PR, Vercel preview (previews point at the staging Supabase project), small commits. EN + AR strings ship together in every phase.

1. **Foundations and safety** — staging Supabase project + Vercel Preview env; `0000_baseline.sql` from a live dump; RLS/ownership migrations (shown before running); Vitest, ESLint, `tsconfig` for `api/`, CI; in-house i18n layer (`Intl`-based, `dir="rtl"`, Tailwind logical utilities) on shell + auth + nav; product name everywhere; personal data out of the UI; inventory bugs; drop unused `pg`; `test-e2e.mjs` only against staging.
2. **Calculator core** — `src/lib/blend/` pure module as the single source; Quick Reference + worked examples as golden tests; measured density per oil; batch stores basis + densities; mobile bench mode (handbook workflow, QC checklist, suggested label). Overshoot-rescale helper only if the owner approves.
3. **Plans, entitlements, AI controls** — `plans`/`user_plans`, owner-only flip function, server-side `requireEntitlement()`; per-user AI quota, disclosure + opt-out; AI house rules rewritten from the handbooks.
4. **Routing and marketing site** — React Router with `/en`, `/ar`, app under `/app`; prerendered landing + pricing; hreflang, sitemap, meta.
5. **Techniques library** — handbook sections as structured content with evidence labels, public parts only; bottle-free Wardrobe rewrites approved by the owner; prerendered articles; build-time search.
6. **Arabic edition complete** — library in AR after owner review; Arabic fonts in `theme.js`; RTL QA incl. batch card; digit style decision.
7. **Launch hardening** — catalog licensing outcome; Vercel/Supabase paid plans + backups; monitoring; a11y/perf; legal pages (owner's lawyer writes the text); e2e on staging. Optional Phase 8: Wardrobe feature.

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

## Engineering notes learned the hard way

- `api/*.ts` run as native ES modules on Vercel: relative imports need the `.js` extension (`./_lib/x.js`), or the function crashes at runtime with ERR_MODULE_NOT_FOUND. `api/imports.test.ts` enforces it. Files under `api/_lib/` are helpers, not routes.
- The browser client has no fallback project: `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` must be set (Preview env → staging, Production → production, local `.env.local` → staging).
- Catalog writes from users go through `ensure_fragrance()` / `add_fragrance_photo()`; users have no UPDATE/DELETE on `fragrances`. Server code that reads the catalog must filter `status = 'approved'`.
- Public pages must not import Supabase or app code (they are prerendered and hydrated); the app lives behind a lazy import in `src/Root.jsx`.
- i18n keys are dot paths, so message keys must not contain dots (nest them).
- Arithmetic lives in `src/lib/calc/` (pure, 100% covered, enforced in CI). Components call `calculate()`, `solve*()`, `checkPour()`, `labelWeights()` and only format.
- The service worker is built last (`scripts/build-sw.mjs`, after prerender); never cache `/api`. Offline batch logs go through `src/lib/outbox.js` with client ids (the API is idempotent on id).
- `/dev/<screen>` renders app screens without sign-in under `vite dev` only, for visual checks.
- Colours: text uses `ink`/`inkSoft`/`dim` (all ≥4.5:1), form borders `field` (≥3:1), focus `focus`; `line` is decorative only. `npx playwright test e2e/a11y.spec.js` (axe) guards it.
- `npm run e2e` runs Playwright against `npm run build` output via `scripts/serve-dist.mjs` (mirrors Vercel routing).
- Owner-only tables written straight from the browser (profiles, pro_waitlist) rely on RLS alone: add every such table to `supabase/tests/rls_isolation.sql`. Anything needing the service role (deleting a user, billing) goes through `api/`.
- Batches and inventory are written only through `/api` (0011 revoked direct writes): the API is where the cap, rate limits and Pro gates live. Don't add browser writes to them.
- Every user table references `auth.users` with ON DELETE CASCADE, so account deletion is one `auth.admin.deleteUser`. New user tables must do the same (and be added to `EXPORT_TABLES` in `src/lib/exportData.js`).

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

The root `supabase-*.sql` files are hand-run scripts, not migrations, and the live schema has drifted from them (ad-hoc scripts like the deleted `fix_schema.js` altered it). Evidence: `supabase-schema-v2.sql` has no `user_id` on `batches`/`inventory`, but the API code and `supabase-restock-rpc.sql` assume `(user_id, fragrance_id)`. **Before the first migration, capture a schema-only dump of live as `supabase/migrations/0000_baseline.sql`.** Baseline captured 2026-09-27 as `supabase/migrations/0000_baseline.sql` (pg_dump of `public`, lightly edited so it replays; see its header).

Supabase projects (org "Hisham perfumer", free plan, both eu-west-1):
- **production** `nhfpgjikyolrwmbmqrng` ("perfume calculator"). One user: `hishamshiboob@gmail.com` (the owner). Migrations reach it only after the owner has seen the SQL.
- **staging** `eiqgsvqisuhinmbgxuop` ("scent-handbook-staging"), created 2026-09-27, baseline applied, schema verified identical to production. Every migration lands here first; Vercel previews will point here.

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
