# v7 Phase 0 — audit (2026-10-18)

Brief: `docs/Kyphira_Brief_v7.md`. Branch `redesign/kyphira` (128 commits ahead of origin, not pushed).

## Decision recorded
The brief calls the current design disposable and the owner re-sent it as the instruction, so v7 is read as **replace**. Kept: features, data, routes, redirects, flags, `src/brand.js`, EN/AR parity, the motion primitives in `src/motion/` (they already match the Phase 3 list: Reveal, TextReveal, Stagger, Parallax, DrawLine, CountUp, Pin, PageTransition) — they get new tokens and a new look, not a rewrite.

## Routes
Public: `/`, `/pricing`, `/library`, `/library/:slug`, `/privacy`, `/terms`, 404, `/ar/*` mirror, `/r/<slug>` (server-rendered). App: `/bench`, `/bench/journal`, `/wardrobe`, `/atlas`, `/salon`, `/nose`, `/app/:tab` (calculator, batches, inventory, account, labels, cards, selector). Dev: `/dev/:screen`, `/dev/design`, `/dev/motion`, new `/dev/directions`. Legacy 301s unchanged.

## Components
34 files in `src/components` (calculator, Batches, Inventory, PerfumeSearch, PerfumerChat, Account, Onboarding, AuthGate, AppNav, SiteChrome …), `kx/` set (Button, Card, Chip, Field, Stepper, RoomHeader, FragranceCard, KyphiraLogo, ScaleReadout, SmokeField, SmokeLine …), `src/site/` (Home, Compounding scene, LiveBench, Library, Pricing), `src/motion/`.

## Animation today
Motion layer (flag `motion`, on in production): scroll reveal, page transitions, stagger, word reveal, canvas smoke, Compounding scroll scene (flag `compounding`), Homepage v2 keyframes. Tokens: 150/250/600/2200 ms, two eases.

## Baseline (from `docs/redesign/METRICS-2026-10-18.md`)
First script 180.8 KB gzip (budget 170); CSS 14.9 KB. Production Lighthouse mobile: `/` perf 90, `/ar` 86, `/pricing` 94; a11y 100, CLS 0 everywhere; LCP 2.8–3.9 s on production (real throttling), 1.8–2.5 s on the local phone profile. Not measured: app routes, WebKit/Firefox, real device.
**Gap vs brief:** LCP target "under 2.5 s" is already missed on production `/` (2.9 s) and `/ar` (3.9 s). Redesign must not regress, and should aim to fix.

## Tools
Code exploration in Vite dev; Playwright (`e2e/`, `scripts/screenshots.mjs`, `scripts/perf-pages.mjs`) for screenshots, a11y and perf; Chrome DevTools/Lighthouse for metrics. Claude Design / Figma / Canva exist as connectors but need authentication and are not used: exploration is in code.
