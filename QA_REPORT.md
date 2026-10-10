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
| Responsive, 7 widths (incl. 640 = 200% zoom proxy) × 5 public pages | new `e2e/viewports.spec.js` | D4 found and fixed; now 30/30 |
| Accessibility | existing axe spec (passes) | no serious/critical |
| Safari engine | full e2e suite on Playwright WebKit 26 with iPhone 15 emulation (`pw.webkit.config.js`) | see below; found D11 |
| Screen-reader proxy | new `e2e/screen-reader.spec.js`: every visible control has an accessible name, one h1 per page with no skipped heading level, and live announcements (LiveBench readout, calculator results, the invalid-size warning in the always-mounted status list) | found D9, D10 |
| Ask (AI) | code read + handler tests `api/_lib/__tests__/ai.test.ts` (12, Gemini stubbed at `fetch`) | expired session → 401; no key → 503 "AI is not configured yet."; empty/blank/model-only/non-list conversation → 400 without calling Gemini; unknown task → 400; turns capped at 2,000 chars and sent as `user` role only (injection text never reaches the system prompt); key only in the request header; outage → fallback model; double 429 → quota message; upstream error text never forwarded; empty answer → 502. Live on production 2026-10-10: `GET /api/ai` → `configured: true`, both models answer HTTP 200; an unauthenticated chat POST → 401. The content of real answers was not reviewed (needs a signed-in session) |

## Not audited, and why
- Signed-in staging journeys (12 e2e skipped: need credentials). Cross-user RLS isolation **was re-run on staging 2026-10-10 after 0019: 64/64 checks pass** (self-rolling-back SQL test).
- Signed-in staging journeys: attempted 2026-10-10 with the Preview env pulled from Vercel against preview `scent-handbook-b4kesgs47`. Staging refused the service-role key ("Invalid API key"): Vercel returns sensitive variables empty on `env pull`. The pulled file was deleted. To run them, set `E2E_SERVICE_ROLE_KEY` (Supabase dashboard → staging → API keys), `E2E_SUPABASE_URL` and `E2E_BASE_URL`.
- Real iPhone/iOS Safari: the Simulator needs a full Xcode install, which this Mac does not have. Playwright WebKit with iPhone 15 emulation was used instead (same engine, not iOS itself).
- Real screen reader: not run. Turning on VoiceOver is a system setting, so the accessibility tree was asserted instead (see above).
- Zoom: covered by the viewport e2e. 640 px = a 1280 px window at 200 %, and 320 px = 400 % (WCAG 1.4.10 reflow); no horizontal scroll at either. Real browser zoom was not driven.
- Real-device mobile (beyond Playwright's phone emulation), screen-reader announcements and touch tooltips: not run. They need hardware and assistive technology; axe covers roles, names and live regions.
- Ask answers' factual quality; Selector recommendation quality for the seven profiles (golden tests exist, not re-reviewed).
- Concurrent-update behaviour and expired sessions against a live database.

## Defect register
| # | Sev | Status | Finding |
|---|---|---|---|
| D1 | P2 | fixed, confirmed | `calculate()` with a negative batch size returned negative oil/ethanol grams (warning shown but numbers rendered). Now zero + warning. |
| D2 | P2 | fixed, confirmed | Blank/0/NaN oil or ethanol density silently became 1.00 / 0.81 with no warning (implausibility check ran on the substituted value). Now warns (EN + AR draft strings). |
| D3 | P2 | fixed, confirmed | `POST /api/inventory` accepted negative `stock_g` / threshold (no DB check constraint). Now 0…1,000,000. |
| D4 | P3 | fixed, confirmed | Home LiveBench overflowed 11 px at 320 px (mono 2xl readout). Smaller size below 380 px. |
| D5 | P2 | fixed, confirmed | `restock_inventory` accepted negative deltas with no floor, so stock could go below zero. `supabase/migrations/0019_inventory_non_negative.sql` floors it at 0 and adds `CHECK (stock_g >= 0) NOT VALID` (no existing row changed). Applied to staging and production 2026-10-10 on the owner's instruction; both verified (function floors, constraint present, 0 negative rows). |
| D6 | P3 | open | Family default oil density (up to 1.00) vs 0.95 in guides: two truths for the same oil; owner's "numbers table" decision already pending. |
| D7 | P3 | open (hypothesis) | 0.81 g/mL for 96 % ethanol is approximate; ≈1 % mass error possible. Unverified against a datasheet. |
| D8 | note | not a defect | The brief's "28.10 %" for 3 × 50 mL is a rounding slip; correct value 28.11 %. |
| D9 | P2 | fixed, confirmed | Calculator "Copy recipe" button had no accessible name: its text sat in a `role="status"` child, which is excluded from a button's name (`FragranceBlendCalculator.jsx`). The text is now plain, and a separate sr-only status announces "Copied". |
| D10 | P3 | fixed, confirmed | App tabs (Calculator, Search, Journal, Inventory, Ask, Labels, Cards) had no `<h1>`. The shell now renders one sr-only h1 per page (`App.jsx`); Selector and Account keep their own. |
| D11 | P2 | fixed, confirmed | On a 393×659 phone (iPhone 15 viewport), the section on the fold at load stayed ~45 % transparent (scroll-tied `.reveal` fade), so `/guides` and `/ar/guides` failed axe colour contrast in WebKit **and** Chrome. The reveal now moves only, with no fade (`index.css`). |

## Scientific assumptions
See `CALCULATION_SPEC.md`: nominal volumes (no contraction model), densities are assumptions with measured override, basis follows the unit, 0.01 g display ≠ 0.01 g accuracy.

## Security findings
No secrets in the bundle (CI `check:bundle` exists; not re-run here). API handlers scope by `user_id`; inventory input now bounded. No cross-user exposure found; RLS isolation re-run on staging: 64/64.

## Commands run
- `npx vitest run` → 43 files, 438 tests pass (was 401; +25 oracle, +12 Ask handler).
- 2026-10-10 after D9–D11: Chrome (`pw.local.config.js`, phone + desktop) → 202 passed, 0 failed, 12 skipped (signed-in). WebKit iPhone 15 (`pw.webkit.config.js --workers=1`) → 100 passed, 0 failed, 7 skipped (6 signed-in; the offline-emulation test, which crashes Playwright's WebKit on reload and was verified there by stopping the server instead). Harness changes, assertions unchanged: fake-API specs block the service worker (in WebKit it bypasses `page.route`); the journal test taps the star label instead of force-checking a 1 px input; axe waits for finite (time-based) animations to settle.
- `npm run typecheck` → clean. `npx eslint .` → 0 errors, 3 pre-existing warnings.
- `npm run build` (placeholder env) → ok.
- `npx playwright test -c pw.local.config.js` → 168 pass (incl. 60 new viewport cases across both projects), 12 skipped (credentialed). A first run without Supabase env failed the sign-in gate tests: environment, not product (client has no fallback project by design).
- Note: this worktree's `node_modules` was stale; `npm install` (declared deps only) fixed the build.

## Remaining risks / next steps
1. Done: 0019 on staging and production, RLS 64/64 on staging.
2. Run the 12 signed-in staging journeys (`e2e/signed-in.spec.js`) with a staging test account; their screens already pass with the fake API.
3. Owner: Arabic review of the two new warning strings; numbers-table decision (D6); verify ethanol density (D7).
4. See `UX_IMPROVEMENTS.md`.
