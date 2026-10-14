# Phase 3 — Bench upgrades: scope and status

Branch `redesign/kyphira-p3-bench` (off `redesign/kyphira-p2-reskin`). **Unpaused 2026-10-14: Phase 11 merged (1-a), recipes Free. See [PHASE-3.md](PHASE-3.md).**

## What the brief lists, and what the code already does
| Brief item | State |
|---|---|
| Family density presets, editable; measured density wins | Exists (`tiers.js`, `formulation.ts`, `MeasuredDensity.jsx`). Default stays the handbook's 0.95 g/mL (decision 5). |
| Measured-density helper | Exists. |
| Cost per bottle from concentrate and ethanol prices | Exists in the calculator (Pro), but only the oil cost was saved with a batch. |
| **Bottle price per batch, detailed and professional** (your answer 6) | **Already built on `phase-11-audit-fixes`**: migration 0022 (ethanol price, bottle cost, bottles, packaging per bottle, labour minutes and rate, sale price, currency; staging has it), `batchEconomics`, margin and markup, the calculator fields, the batch card and Journal showing cost per bottle and profit, Pro-only on the server, tests and e2e at 320 px. |
| Resting timer with a "ready" state | Exists (Journal list: resting/ready, rest timeline, check-ins). **Reminders** need a sender (email or push): not built, see "Open" below. |
| Printable labels (PDF) and share cards (image) | Labels (print, Pro) and the batch PNG card exist. |
| Scale mode (large digits, stays awake) | Bench mode exists with wake lock; the digits are not yet the new `ScaleReadout`. |
| Saved recipes with versions; batches linked to recipes | **Not built.** `calc_presets` saves only size and strength. |
| Multi-ingredient formulas with IFRA guidance | Scoped below, not built (flagged). |

## The decision I need
The seller layer is the owner's own unmerged branch. I tried to merge `phase-11-audit-fixes` into this branch (it touches the same files I would: `batchPayload.js`, `Batches.jsx`, the calculator, `api/batches.ts`, the message catalogues) and the tool permission layer refused it as integrating unreviewed code. Building recipes on top of the current branch instead would make the two diverge and push conflicts onto you later. Options:
1. **Merge it here (recommended).** Run `git merge phase-11-audit-fixes` on this branch (or allow it), then I add recipes with versions, the scale readout in bench mode, and tests on top. Staging already has 0022, and production still needs 0021 and 0022 (owner approval, as before).
2. Land Phase 11 into `main` first, rebase the Kyphira branches on it, then continue.
3. Skip the seller layer in Kyphira and rebuild it here (duplicate work; not recommended).

## Recipes with versions (ready to build after the merge)
`supabase/migrations/0023_recipes.sql` (+ `.down.sql`): `recipes` (name, family), immutable `recipe_versions` (v1, v2, …: size, unit, strength, densities, note), `batches.recipe_version_id`; owner-only RLS, versions cannot be edited, 50 recipes per user and 100 versions per recipe (trigger). Written from the browser under RLS like `calc_presets`; the batch API checks the version belongs to the caller before storing the link. Not applied to any database yet. UI: a recipe picker in the calculator (load a version, "save as new version"), the version shown on the batch card and "Make again" from a recipe. **Free or Pro is a plan decision for you; default proposal: Free, capped as above.**

## Open: resting reminders
A reminder needs something to send: email (needs SMTP, which `LAUNCH.md` lists as not done) or web push (service worker plus a VAPID key and a subscriptions table). I will not add either without your pick. Meanwhile the "ready" state shows in the Journal and the tab badge.

## Multi-ingredient formulas with IFRA guidance: scope (not built)
- **What:** formulas of several ingredients (concentrates, solvents, additives) summing to 100 %, with per-ingredient percentage and weight at the bench, still by mass.
- **IFRA:** the IFRA Standards give maximum concentrations per ingredient and product category (for example, category 4 for fine fragrance). The standards are published by IFRA and the data is licensed; Kyphira should not copy the tables. Realistic routes: a user-entered limit per ingredient (from the supplier's IFRA certificate, which is the legal document for a concentrate), checked against the formula; or a licensed dataset (a paid service: your decision).
- **Not claimed:** compliance, safety or allergen status. Wording would say "checked against the limits you entered".
- **Gating:** behind a flag, Pro. Needs the lawyer who is reading `/terms`.
- **Size:** a new `formulas` and `formula_lines` pair of tables, a pure checker in `src/lib/calc`, an editor screen, about the size of Phase 3 on its own.
