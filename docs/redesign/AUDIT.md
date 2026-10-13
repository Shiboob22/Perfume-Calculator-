# Kyphira — Phase 0 audit

Date 2026-10-14. Base: `main` @ `9a92ae9`. Branch `redesign/kyphira-p0-audit` (off `redesign/kyphira`, off `main`). No application code changed; this file and `docs/redesign/baseline/` are the only additions.

## 1. Baselines measured

| Check | Result |
|---|---|
| Vitest | 442 passed (44 files) |
| Playwright (installed Chrome, phone + desktop) | 202 passed, 12 skipped (signed-in staging journeys need `E2E_SERVICE_ROLE_KEY`) |
| ESLint | 0 errors, 3 warnings |
| `tsc` (api + src) | clean |
| Build + `check:bundle` | passes; 40 prerendered pages, 81 precached files (2.1 MiB) |
| Lighthouse mobile, `/` | A11y 100, BP 100, SEO 100 |
| Lighthouse mobile, `/guides/at-the-bench` | A11y 100, BP 100, SEO 100 |
| Lighthouse Performance, LCP, CLS, INP | **Not measured** (the Lighthouse tool here excludes Performance; needs a trace run on a Vercel preview). Phase 1 first task. |
| JS gzip, home | `index` 141.7 KB (budget 170 KB: 28 KB headroom). App chunks load only under `/app`: `App` 52.6, `Selector` 14.0, calculator 11.7, `Batches` 9.7 KB |
| Screenshots | `docs/redesign/baseline/`: 36 PNG (phone 390 px + desktop), EN and AR where noted |

Screenshot gaps (script covers fewer pages than exist): no `/ar/pricing`, `/ar/privacy|terms`, `/privacy`, `/terms`, `/app/selector`, 404, shared recipe page `/r/<slug>`, or `ar` calculator/inventory/account. Add in Phase 1 before the visual-regression baseline.

## 2. Stack (confirmed)

Vite 5 + React 18 + Tailwind 3 + **JavaScript (.jsx) with TypeScript only in `src/lib/calc`, `src/lib/selector`, `api/`** (the brief says "React + Vite + TypeScript"; the UI is not TS). React Router 7, in-house i18n (`src/i18n`), Supabase (auth-js + postgrest-js wired by hand, no supabase-js in the bundle), Vercel functions in `api/` (region `dub1`), Vitest, Playwright (Chrome; WebKit and screen-reader configs), GitHub Actions (`ci.yml`: lint, typecheck, vitest+coverage, build, bundle secret check, e2e; `uptime.yml`).

## 3. Routes (code, not brief)

Public (prerendered, EN + `/ar`): `/`, `/pricing`, `/guides`, `/guides/:slug`, `/privacy`, `/terms`, 404. Server-rendered: `/r/:slug`, `/ar/r/:slug`, `sitemap-recipes.xml` (`api/recipe.ts`). App (client, SPA fallback `/app/*`): `/app/:tab?` with tabs `search`, `selector`, `calculator`, `batches`, `inventory`, `ask`, plus `cards`, `account`, `labels`, `bench` (bench mode). Dev only: `/dev/:screen`.
Not as the brief describes: there is **no `/app/calculator` → "Journal" at `/app/batches` split** as a route pair beyond the above; "Journal" is the display name of the `batches` tab. There is **no `/library`, `/atlas`, `/wardrobe`, `/salon`, `/nose`** and no redirect layer (`vercel.json` has rewrites and headers only).

## 4. Data and security

- Tables created by migrations: `admins, batch_checkins, billing_events, calc_presets, plans, pro_waitlist, profiles, rate_limits, shared_recipes, user_plans`; baseline adds `batches, fragrance_notes, fragrances, inventory, perfumes`. RLS enabled on every one (5 in baseline, the rest in their own migration). `supabase/tests/rls_isolation.sql` is 64 checks on staging.
- Migrations 0000–0020 applied to staging and production (0020 applied under the label `0019_tier_from_accords`). **No migration has a down file.** The brief requires down migrations: new convention needed (`NNNN_x.down.sql`), and the production-apply rule below.
- `fragrances` already is a ~81.8k-row shared catalog (Fragrantica 68,687, dataset 12,665, curated 467, custom 4) with notes, accords, families, popularity, status/moderation, photos, `selector_candidates()`, `ensure_fragrance()`.
- API functions use the service-role key and bypass RLS; each handler checks auth itself.

## 5. Conflicts between the brief and the code or the owner's standing rules

Need your call before or in Phase 1. Ordered by impact.

1. **Vercel Hobby function limit.** 11 of 12 functions used (`account, ai, batches, checkins, inventory, log, me, recipe, search, similar, billing/webhook`), enforced by `api/_lib/functionBudget.test.ts`. Atlas, Salon, Wardrobe and Nose each want endpoints. Either consolidate (one catch-all router per room, e.g. `api/salon/[...path].ts`), or move to Vercel Pro. Hobby is also non-commercial (CLAUDE.md). **Decision, and it touches paid service.**
2. **Catalog already exists, and a 81.8k-row Atlas is not "start empty".** The brief says Atlas data starts empty plus the owner's wardrobe; the live catalog is much larger, with provenance largely scraped (Fragrantica-sourced rows). "No scraping" is forward-looking in the brief, but the data licensing question is now material to The Atlas and Nose grounding. Also the CLAUDE.md open item "catalog data licensing". **Decision: keep, restrict or replace the existing rows for Atlas.**
3. **AI provider.** Brief: Nose calls the Claude API. Current `api/ai.ts` uses Gemini (free tier; prompts may be used for training). Switching = new paid key, new cost guard, new disclosure text. **Paid service.**
4. **Default theme.** Brief: "dark by default". Live: light paper default, dark behind a toggle (owner decision 2026-10-04, v3). **Which default?**
5. **Brand rename vs owner's own decision.** CLAUDE.md records the 2026-10-04 rename to Scent Ledger and the rule "use that name everywhere". Kyphira replaces it; the doc, emails, OG images, manifest, JSON-LD, `<title>`, sign-in and legal drafts all carry the name. Not a conflict if you confirm; CLAUDE.md must then be updated in Phase 1. Also the printed books keep "The Scent Handbook" in citations.
6. **Design tokens vs v3 palettes.** Brief tokens (`ink-0..2, papyrus, resin, myrrh, verdigris, ember`) overlap but do not match `PALETTES` in `src/lib/theme.js` (generated CSS variables, contrast unit-tested for both). Plan: map new tokens into `PALETTES`, keep `theme.test.js`. v3 is "square corners, Poppins/Lora/Plex Mono, Tajawal/Amiri"; brief wants Fraunces / Inter Tight or Geist / Plex Mono / Plex Sans Arabic + Amiri. All new fonts are additive `@fontsource` packages (self-hosted, fine), but CLS preloads were tuned (0.11 → 0) and must be redone.
7. **URL restructure and the service worker.** `/app/*` rewrite, the SW precache, `serve-dist.mjs`, e2e specs, shared-recipe links in the wild (`/r/<slug>`), sitemap, Supabase Auth redirect URLs, and OAuth redirect all assume `/app/...`. 301s must be added to `vercel.json` (or `vercel.ts`) **and** to `serve-dist.mjs` (it mirrors Vercel) and e2e. Auth redirect URLs on both Supabase projects need `/bench` etc. before the cut-over. `/r/<slug>` must stay.
8. **Domain/brand config.** "Do not change production domain": ok. Hard-coded origin strings live in `src/site/meta.js`, `api/recipe.ts`, sitemap, OG scripts, emails; a `src/brand.ts` (or `.js`; `src/` is JS) has to absorb them. Repo, Vercel project and domain keep the old names regardless.
9. **Process rules vs how this repo ships.** (a) `gh` token cannot open PRs: I can push branches, you open PRs (compare links). (b) CI runs only on PRs/`main`, so PRs into `redesign/kyphira` run CI only if the workflow's `pull_request` trigger has no base filter (it has none: ok). (c) Previews point at **staging** Supabase; every "additive migration" lands on staging first, production only on your approval — consistent with the brief, but staging is the only place new tables can be tested for real. (d) Vercel Hobby blocks private-repo deploys unless the head commit author is the GitHub noreply email; commits here use that.
10. **Stated current state vs reality.** Brief's "Phase 6 resting journal and shareable recipes — check what shipped": both shipped (check-ins, `/r/<slug>`, Pro insights). Measured density, family density presets (Fresh 0.87, Gourmand etc. exist in `tiers.js`/`formulation.ts`; **brief's Floral 0.95 / Gourmand 1.00 / Oriental 1.02 differ from the code: 0.87–1.02 per family, and the owner's open decision "D6, 1.00 vs 0.95" is unresolved**), saved recipe presets (`calc_presets`), printable labels (Pro), bench mode with wake lock, PWA/offline outbox, cost per bottle (Pro), selector, journal export: **all exist**. Bench "upgrades" in Phase 3 are therefore smaller than the brief reads: remaining are recipe versions, resting timer *reminders* (needs SMTP/push, not built), share cards for recipes, multi-ingredient + IFRA.
11. **Safety copy and claims.** Preserve: ethanol warning, "densities are starting points", AI disclosure, and the safety notice on blending guides. The Nose's "no skin/allergy/health advice" matches existing `api/ai.ts` house rules direction. IFRA guidance, if built, is regulatory-adjacent content: needs the lawyer.
12. **Handbook privacy rule.** CLAUDE.md: Application Part X, Wardrobe collection pages, scores and the owner's bottles are never published. The brief wants the owner's wardrobe as Atlas seed data and Wardrobe frameworks from the volumes: both need **explicit written approval** per item (CLAUDE.md says so) and a bottle-free rewrite of Wardrobe method pages. The origin essay (kyphi/Edfu) is new content: facts need sources (Plutarch, Edfu inscriptions) and the owner's review; Arabic needs the owner's review.
13. **Name risk.** Brief says you run trademark searches. Note for the record: "Kyphi" is a common word for the incense; "Kyphira" collision search should include classes 3, 35, 42 (cosmetics/perfumery, retail, SaaS).

## 6. Risks to user data

- All current rows are real (owner Pro, 36 batches at last count, 81,823 catalog rows). Additive-only migrations with `IF NOT EXISTS`, nullable columns, no renames of `batches`/`inventory`/`journal` tables. No renaming `profiles`/`plans` keys (`FEATURES` strings are stored in `plans`).
- The Wardrobe, Salon and public profiles introduce **user-generated public content**: needs moderation, rate limits, takedown and privacy text updates (`/privacy`, `/terms` are drafts awaiting a lawyer).
- `shared_recipes` slugs are public and indexed; redirects must not change them.
- Account deletion cascades through `auth.users`; every new table must `references auth.users on delete cascade` and be added to `EXPORT_TABLES` (`src/lib/exportData.js`) and `rls_isolation.sql`.
- Backup: Supabase **free plan has no backups**. Brief asks for a schema backup before Phase 1: schema is already in `0000_baseline.sql` + 0001–0020, but **no data backup exists**. Recommend a `pg_dump` data export (via your credentials) before the first production migration; I will not run it.

## 7. Feature flags

None exist. Need a minimal mechanism before Phase 4 (proposal: build-time `VITE_FLAG_*` + server-side check in `api/`, default off; or a `feature_flags` table read through the existing `/api/me`). Production must not change until you flip a flag, so flags must default to off in the Production environment and on in Preview.

## 8. What the brief gets right and can be reused

Catalogue numbering ("No. 015") exists in `BenchCards`/the editorial system; scale-like calculator readout exists in LiveBench and bench mode; View Transitions page turns exist (Phase 9); reduced-motion handling exists; `ar` full parity with RTL logical utilities; axe in Playwright; contrast unit tests. Phase 1 extends these rather than replacing them (CLAUDE.md: "keep it, extend `theme.js`").

## 9. Tests and CI to extend

Existing specs: `a11y`, `app`, `blend-loop`, `journal`, `living-handbook`, `public`, `recipe`, `screen-reader`, `selector`, `signed-in`, `viewports`. Missing for the brief: visual regression snapshots (none; `scripts/screenshots.mjs` only produces images), RTL snapshots, redirect tests, Lighthouse CI, performance budget check (only `check:bundle`, a secret scan).

## 10. Recommended answers to unblock Phase 1

See the phase report in chat. Short form: (1) consolidate API routes, stay on Hobby until revenue, (2) keep catalog, mark provenance, defer licensing, hide Atlas behind a flag, (3) keep Gemini through Phase 6, decide provider at Phase 7, (4) keep light default, dark one tap away, unless you say otherwise.
