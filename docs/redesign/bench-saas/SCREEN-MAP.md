# Bench SaaS: screen map

Where each screen of the Bench SaaS round lives: its route, the files that
draw it, the pure code behind it, its tests and its screenshots. Reference
prototype: `prototype/` (kept unchanged). Owner's standing rule: the Phase 0
answers win over the phase prompts (no five-tier ladder; label PNG, batch card
PNG and share links Free; inventory Pro; pour steps in `BenchMode.jsx`).

| Screen | Route | Components | Pure code (`src/lib/…`) | Tests | Screenshots |
|---|---|---|---|---|---|
| The Bench (Simple / Blend) | `/bench` | `components/FragranceBlendCalculator.jsx`, `calc/StrengthTiers.jsx`, `calc/BlendEditor.jsx`, `calc/Formulas.jsx`, `kx/RoomHeader.jsx`, `kx/Stepper.jsx` | `calc/strength.ts`, `calc/mixture.ts`, `calcDraft.js` | `e2e/bench-saas.spec.js` | `screens/bench-*.png`, `qa/screens/bench-*` |
| Readout scale + flacon (motion) | `/bench` (readout, phone pinned bar) | `kx/ScaleDisplay.jsx`, `kx/Flacon.jsx`, `kx/benchClock.js` | `calc/flacon.ts`, `surfaces.js` | `e2e/bench-motion.spec.js` | `screens/motion/` |
| Cost per bottle (Pro) | `/bench` (Bottle mode) | `calc/CostCard.jsx` | `calc/cost.ts`, `plansConfig.js` (`COST_*`) | `e2e/bench-saas.spec.js` | `screens/pro-cost-*.png` |
| Upgrade sheet, plan badge, trial | any app page | `plan/Upgrade.jsx`, `kx/Sheet.jsx` | `entitlements.js`, `plansConfig.js` (`COMPARE_ROWS`, `PRICES`: placeholders) | `e2e/bench-saas.spec.js` | `screens/upgrade-*.png`, `qa/screens/upgrade-*` |
| Pour along (bench mode) | `/app/bench` | `components/BenchMode.jsx` (also its `demo` in the tour) | `calc/pourAlong.ts`, `calc/pour.ts`, `pourProgress.js` | `e2e/bench-saas.spec.js`, `e2e/journal-room.spec.js` | `screens/pour/`, `qa/screens/pour-*` |
| Journal room (rest tracker) | `/journal` (`/ar/journal`) | `journal/JournalRoom.jsx`, `journal/RestingLine.jsx` | `calc/restTracker.ts`, `journal.js` | `e2e/journal-room.spec.js` | `screens/journal/`, `qa/screens/journal-*` |
| Batches (records) | `/bench/journal` | `components/Batches.jsx` | `calc/journal.ts` | `e2e/journal.spec.js` | — |
| Guided tour | `/bench` (link, first visit, `?tour=1`) | `tour/BenchTour.jsx` | `tour.js` | `e2e/bench-tour.spec.js` | `screens/tour/`, `qa/screens/tour-*` |

Accessibility of all of the above (EN/AR × light/dark): `e2e/a11y-bench-saas.spec.js`.

## Data

| Migration | What | Where |
|---|---|---|
| `0031_bench_saas` | Free limits on `plans`, `recipe_ingredients`, `batches.batch_no` / `remind`, `batch_checkins.tags`, `start_pro_trial()` | staging |
| `0032_batch_pours` | `batches.pours` (per material of a blend) | staging |
| `0033_bench_tour` | `profiles.bench_tour_at` (tour seen) | staging |

API: `api/checkins.ts` (notes window, tags, upsert), `api/batches.ts` (`remind`, `pours`), `api/account.ts` (`start_trial`). Typed data access: `src/lib/benchData.ts`, types `src/lib/database.types.ts`. SQL checks: `supabase/tests/bench_saas.sql`.

## Final QA

`qa/QA.md` (checklist), `qa/screens/` (40 screenshots), `qa/qa-shots.mjs` (makes them).
