# Kyphira v7: report (branch `redesign/kyphira`, not pushed, merged or deployed)

Brief: `docs/Kyphira_Brief_v7.md`. Direction chosen by the owner: **A, "Weighed"**, with B's ember as the dark theme. Phase 0 audit: `PHASE-0.md`. Directions board: `/dev/directions` (`directions-1440.png`, `directions-375.png`).

**Idea:** weight is the unit of the interface. Every number is a reading on a balance and every screen settles to a value before you read it.

## What changed
- **Tokens (`src/lib/theme.js`):** light = bone `#F4F1EA`, graphite `#1B1814`, brass `#B8893A` (action fill), verdigris `#2F6F62` (a stable reading); dark = soot `#14110E`, ember `#D4924A`, haze `#EADFCE`. Form border darkened to `#827A6B` to keep 3:1 on sand. Contrast tests pass.
- **Type:** Instrument Serif + Instrument Sans; Arabic Readex Pro (UI, prose) and Reem Kufi (display, via `.ar-display`). Replaces Newsreader, Hanken Grotesk, Plex Arabic, Naskh. Fonts are npm packages, same origin, metric-matched fallbacks; prerender preloads and Arabic public pages updated; batch PNG card and share images (`public/og/`) redrawn.
- **Components:** new `kx/WeightScale` (grams on a beam, brass pan by `transform`, verdigris on target, mirrored in RTL) and `kx/Confirm` (drawn check). `/dev/design` rewritten for the system.
- **Home ("Weighed", flag `compounding`):** reading (84.50 g) → oil 23.75 g → alcohol 60.75 g → six rooms each known by a number → live Bench. CSS scroll timelines, JS fallback, grams gauge ending at 84.50 g, static layout under reduced motion. Old bowl, canvas smoke and palette bands removed.
- **Room moments:** Bench figures count in on first view; Wardrobe save and wear log confirm with a drawn check; Library opener draws a brass rule (reading hairline and glossary already there); Atlas card-to-page morph (already there); Salon header rise (already there); Nose breathing ember while thinking; Account sections reveal.
- **Files:** `src/lib/theme.js`, `src/index.css`, `tailwind.config.js`, `src/main.jsx`, `src/i18n/arabic-{readex,reem}.css` + `arabicFonts.js`, `scripts/{prerender,make-og-images}.mjs`, `src/site/compounding/*`, `src/lib/compounding/*`, `src/components/kx/{WeightScale,Confirm}.jsx`, `src/components/{FragranceBlendCalculator,Account}.jsx`, `src/components/wardrobe/{Collection,Today}.jsx`, `src/components/nose/Nose.jsx`, `src/site/GuidePage.jsx`, `src/dev/{Directions,Styleguide}.jsx`, EN/AR messages, e2e (`board-sync`, `recipe`), 34 visual baselines.
- **Tools:** Vite dev, Vitest, Playwright with installed Chrome (`CHROMIUM_PATH`), `scripts/perf-pages.mjs`, new `scripts/shot.mjs` and `scripts/scroll-check.mjs`. No Claude Design, Figma or Canva (not authenticated): exploration was in code.

## Metrics (production-flag build, local, phone profile 375x667 @2x, CPU 4x, 1.6 Mbps / 150 ms, median of 3)
| | Before (2026-10-18) | Now |
|---|---|---|
| First script gzip | 180,777 B | 178,026 B |
| CSS gzip | 14,949 B | 12,464 B |
| All JS gzip | 329,743 B | 314,323 B |
| LCP `/` · `/ar` · `/pricing` | 2.19 · 2.54 · 1.90 s | 1.49 · 1.71 · 1.40 s |
| LCP `/library` · `/library/at-the-bench` · `/ar/library` | 1.83 · 1.92 · 2.27 s | 1.38 · 1.59 · 1.55 s |
| CLS, all six pages | 0 | 0 |
| FPS | 59.4 to 60.2 | 59.7 to 60.1 |

Scroll check (`scripts/scroll-check.mjs`): native scroll timelines present; beam, pan and gauge scale from 0 to 1 with scroll. Tests: Vitest 697 pass, lint 0 errors, Playwright default-flag build 373 pass / 72 skipped before baselines were regenerated; after regenerating, visual and recipe specs pass.

## Trade-offs and honest gaps
- **Room layouts (rebuilt after the first report).** Every room now sits under the ruled beam (`kx/RoomBeam`: twelve ticks, a brass pan on the room's place of six). Wardrobe, Atlas, Salon and Nose use `kx/RoomShell`: a sticky rail (numeral, name, lead, sections as a vertical scale) beside the work on wide screens, stacked with a sideways tab row on phones. The Bench is two columns with a sticky readout led by the batch total in grams (bottle graphic removed); Journal, Library, Account and sign-in take the beam and the large title. Screens: `screens/room-*`. Still plain inside: the tab bodies (collection grid, feed cards, Atlas results) keep their earlier layouts.
- Brief's "results count in" overrides the earlier owner rule "calculator figures never animate". Count is 250 ms, first view and changes only.
- Parallax and Pin exist but no page uses them; DrawLine only on guide openers.
- Over budget: first script is 8 KB above the 170 KB budget (was 10.8 KB).
- **Not measured:** Lighthouse on this branch (production numbers are of `main`: perf 86 to 94, LCP 2.8 to 3.9 s, still above the brief's 2.5 s), WebKit and Firefox, a real phone, app routes' performance, screen recordings (none made).
- Arabic is drafts: all new `site.compounding.*` strings and the hero "كل قطرة موزونة." Room figures "80,000+ scents" and "8 an hour" are hardcoded.
- Arabic-at-320 px specs (Atlas, Salon, Launch) and the screen-reader home spec time out under parallel load and pass alone: run with `--workers=2`.
- `localStorage` flags: production has `compounding` and `motion` on, so this scene replaces the shipped Compounding on deploy.

## Follow-ups
1. Owner review of the room layouts; rebuild the tab bodies (Wardrobe collection, Salon feed, Atlas results) in the same language if wanted.
2. Split Arabic font CSS or the scene out of the first script.
3. Lighthouse and WebKit/Firefox pass on a preview deploy; real-device check.
4. Arabic review; decide figures for Atlas and Nose from live data.
5. Remove `src/content/kyphi.js` use from Wardrobe if the sixteen ingredients are no longer wanted.

## Post-rebuild verification (2026-10-18)

- **Flag-off specs** (wardrobe, atlas, salon, nose, motion) on a default-flags build: 18 of 18 pass, phone and desktop.
- **Arabic rooms** (Wardrobe, Atlas, Salon, Nose, Bench, Journal, Account at 375 and 1440, `screens/room-*-ar-*`): `dir=rtl`, beam pan, rail and readout mirror, no sideways scroll. Reviewed by eye: Wardrobe and Bench.
- **Lighthouse mobile on production** (deploy of `d948497`, real compression): Home 91/100/100/100, `/ar` 90/100/100/100, Pricing 92/100/100/100, Library 96/100/100/100 (performance / accessibility / best practices / SEO). LCP 2.4, 2.5, 2.5, 2.3 s (was 2.8–3.9 s); CLS 0; TBT 50–230 ms. Within the brief's 2.5 s.
- Still open: WebKit and Firefox, a real phone, screen recordings, the 8 KB over the first-script budget, unused `Parallax`/`Pin`.
