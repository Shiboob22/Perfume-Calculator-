# QA report: Scent Ledger (audit run 2026-10-09)

Branch `claude/scent-handbook-qa-audit-2b0296`. Ground rules: no production data touched, no secrets used (builds use CI placeholder Supabase values), no dependency added.

## Executive summary
The calculation core is mathematically correct against independent hand-derived oracles, including the screenshot case (200 mL @ 25 %, 1.00/0.81 → 50 / 121.50 / 171.50 g, 29.15 % by weight). Defects found were at the edges: invalid input produced negative grams, blank densities were silently replaced, inventory accepted negative stock server-side, and the home bench overflowed at 320 px. All four are fixed with tests. Signed-in flows against real data were **not** exercised.

## Architecture (inspected)
Vite 5 + React 18 SPA with prerendered public site; React Router `/app/<tab>`; pure calc module `src/lib/calc/`; Vercel functions `api/*.ts` (service role, handlers check auth); Supabase Postgres with RLS (`supabase/tests/rls_isolation.sql`, 64 checks on staging); i18n EN/AR; selector engine `src/lib/selector/`.

## Features audited
| Area | How | Result |
|---|---|---|
| Calculator (4 modes + pour check, units, rounding) | independent oracle + 300-case seeded property tests | correct; edge-case defects fixed (D1, D2) |
| Search / Selector / Journal / Inventory UI | existing e2e with fake API (108 pass) + code read | no failures; not independently re-derived |
| Inventory / batches API validation | code read | D3 found and fixed |
| Responsive, 6 widths × 5 public pages | new `e2e/viewports.spec.js` | D4 found and fixed; now 30/30 |
| Accessibility | existing axe spec (passes) | no serious/critical |
| Ask (AI) | code/structure only | **not tested live** (needs Gemini key, rate limits) |

## Not audited, and why
- Signed-in staging journeys (12 e2e skipped: need credentials). Cross-user RLS isolation not re-run (needs staging service access; last recorded 64/64).
- Real-device mobile, screen-reader announcements, 200 % zoom, touch tooltips: not run.
- Ask answers' factual quality; Selector recommendation quality for the seven profiles (golden tests exist, not re-reviewed).
- Concurrent-update behaviour and expired sessions against a live database.

## Defect register
| # | Sev | Status | Finding |
|---|---|---|---|
| D1 | P2 | fixed, confirmed | `calculate()` with a negative batch size returned negative oil/ethanol grams (warning shown but numbers rendered). Now zero + warning. |
| D2 | P2 | fixed, confirmed | Blank/0/NaN oil or ethanol density silently became 1.00 / 0.81 with no warning (implausibility check ran on the substituted value). Now warns (EN + AR draft strings). |
| D3 | P2 | fixed, confirmed | `POST /api/inventory` accepted negative `stock_g` / threshold (no DB check constraint). Now 0…1,000,000. |
| D4 | P3 | fixed, confirmed | Home LiveBench overflowed 11 px at 320 px (mono 2xl readout). Smaller size below 380 px. |
| D5 | P2 | **open, confirmed by code** | `restock_inventory` accepts negative deltas with no floor, so a large negative adjust can drive stock below zero. Needs a migration (`GREATEST(0, …)` or a CHECK); not applied: migrations need owner approval. |
| D6 | P3 | open | Family default oil density (up to 1.00) vs 0.95 in guides: two truths for the same oil; owner's "numbers table" decision already pending. |
| D7 | P3 | open (hypothesis) | 0.81 g/mL for 96 % ethanol is approximate; ≈1 % mass error possible. Unverified against a datasheet. |
| D8 | note | not a defect | The brief's "28.10 %" for 3 × 50 mL is a rounding slip; correct value 28.11 %. |

## Scientific assumptions
See `CALCULATION_SPEC.md`: nominal volumes (no contraction model), densities are assumptions with measured override, basis follows the unit, 0.01 g display ≠ 0.01 g accuracy.

## Security findings
No secrets in the bundle (CI `check:bundle` exists; not re-run here). API handlers scope by `user_id`; inventory input now bounded. No cross-user exposure found in code read; RLS not re-executed.

## Commands run
- `npx vitest run` → 42 files, 426 tests pass (was 401; +25 oracle tests).
- `npm run typecheck` → clean. `npx eslint .` → 0 errors, 3 pre-existing warnings.
- `npm run build` (placeholder env) → ok.
- `npx playwright test -c pw.local.config.js` → 168 pass (incl. 60 new viewport cases across both projects), 12 skipped (credentialed). A first run without Supabase env failed the sign-in gate tests: environment, not product (client has no fallback project by design).
- Note: this worktree's `node_modules` was stale; `npm install` (declared deps only) fixed the build.

## Remaining risks / next steps
1. Approve a migration for D5 (floor stock at 0) and apply to staging first.
2. Run the signed-in staging journeys with a test account, and the RLS test.
3. Owner: Arabic review of the two new warning strings; numbers-table decision (D6); verify ethanol density (D7).
4. See `UX_IMPROVEMENTS.md`.
