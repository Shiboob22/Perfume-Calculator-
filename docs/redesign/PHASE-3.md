# Phase 3 — Bench upgrades

Branch `redesign/kyphira-p3-bench` (off `redesign/kyphira-p2-reskin`). Scope and status table: [PHASE-3-scope.md](PHASE-3-scope.md).

## Decisions (2026-10-14)
- Merge `phase-11-audit-fixes` here (option 1-a): done, no conflicts. It brings the seller cost layer (bottle price per batch, packaging, labour, sale price, margin, markup; Pro) and migrations 0021, 0022.
- Saved recipes are **Free**, capped at 50 recipes per user and 100 versions per recipe.

## What was built
- **Saved recipes with versions.** `recipes` and immutable `recipe_versions` (0023). The picker sits under the calculator's presets: open a recipe (its latest version, or any version from a list), save the settings as a new recipe, or as the next version of the open one with an optional note. A version stores size, unit, strength, family and the densities as used.
- **Batches link to a version, never by surprise.** A batch carries the version only while the calculator still holds exactly its settings; a line under the picker says which. After any change it says the batch won't be linked, and offers to save a new version. The API stores the link only for a version that belongs to the caller (the service role bypasses RLS) and drops anything else without refusing the log.
- **Journal and Make again.** The batch card names the recipe ("Oud Nights v2"); Make again carries `recipe=<version id>` and the calculator reopens that version.
- **Scale readout in bench mode.** The oil and alcohol steps show the weight against the step's target (large digits, a meter, spoken state). The "on target" tolerance is the scale's 0.01 g, not an invented pour limit.
- Export covers both new tables (and tolerates a database without 0023); RLS isolation test extended.
- Test fix: `.down.sql` files no longer count as migrations in `api/_lib/migrations.test.ts`; the seller-cost checks at the end of the RLS test now run as the table owner (they ran as `anon` and could not pass).

## Not done
- **Resting reminders:** need a sender (email needs SMTP; web push needs a VAPID key and a table). Waiting for the owner's pick. The ready state and the tab badge exist.
- **Multi-ingredient formulas with IFRA:** scoped only (see the scope doc): needs the owner's data and lawyer decision.
- Cost-breakdown view beyond Phase 11's per-bottle cost and margin.
- Production: migrations 0021, 0022 and 0023 are **not** on production (staging has all three). Needs the owner's SQL approval and a backup first (`BACKUP.md`).
- Nothing pushed (the push is the owner's step).

## Tests
Vitest 534 passed (55 files). Playwright (local Chrome) 270 passed, 34 skipped (visual baselines are macOS-only; CI skips them). New: 15 recipe-logic tests, 5 API link tests, payload/prefill/make-again tests, `e2e/recipes.spec.js` (4 scenarios on phone and desktop, including Arabic at 320 px with axe), a bench-scale e2e with axe. ESLint 0 errors (3 old warnings), `tsc` clean. RLS isolation on **staging**: 78 checks pass.

## Lighthouse (mobile)
Not re-run: the changed screens are signed-in. Public pages are unchanged from Phase 2 (Accessibility, Best Practices, SEO 100). The Vercel preview run is still pending the push.

## Data changes
`0023_recipes.sql` (+ `.down.sql`): additive. New tables `recipes`, `recipe_versions`, column `batches.recipe_version_id` (nullable, on delete set null). Applied to **staging only**. Production data untouched.

## Risks and open questions
1. Production migrations 0021–0023 and their order (approval needed).
2. Arabic strings for recipes and the scale are drafts for review.
3. Resting reminders: email, web push, or none for now.
4. Recipes are written from the browser under RLS (like presets); the caps are enforced by database triggers.
5. A recipe's versions are history: no editing, only adding or deleting the whole recipe.
