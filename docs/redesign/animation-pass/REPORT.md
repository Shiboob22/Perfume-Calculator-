# Animation pass: report (branch `redesign/kyphira`, not pushed, merged or deployed)

Brief: `docs/Kyphira_Brief_v8.md`. Critique and the ranked ten gaps: `critique.md`. Before shots: `before/`; after shots (EN and AR, 1440 and 375, home in full, rooms first two frames): `after/`; recordings (webm, motion on): `recordings/` (home scroll EN 1440, AR 1440, EN 375; Bench, Wardrobe, Atlas, Salon, Nose, Account, Library opener).

## What changed, by gap

| # | Gap | Result |
|---|---|---|
| 1 | No pinned story | `Weigh.jsx` + `weigh.css`: one pinned stage, 360 svh, scrubbed. Counter 0 to 23.75 g to 84.50 g, oil and alcohol on a beam, text beats cross-fade, ground goes to dusk and back. CSS `view-timeline` first; `scrollFallback()` writes `--pp` elsewhere; static stack under reduced motion. Scrubbed forward and back in a real browser (EN 1440, EN 375, AR 1440): reverses exactly. |
| 2 | Flat paper | `Light` (resin glow, follows pointer, lifts with scroll), `.mo-grain` (static tooth, hero and dusk panel only), `.mo-raised` (layered shadow, on hero card, dusk panel and every `Card`). |
| 3 | Type not the hero | Home headline 10.5 vw up to 160 px, two lines, second indented 11 vw (asymmetry), reading figure up to 152 px, panel figure up to 184 px. Masked word reveals on rooms title and handoff title and on every room header, Account and sign-in titles (`TextReveal eager`, whole words, Arabic joins intact). The h1 itself stays static (LCP). |
| 4 | No first-load moment | `#intro` in `index.html`: home only, once per session (`sessionStorage`), 1.1 s, any input skips it, never under reduced motion; page is already painted under it. |
| 5 | Nothing answers the pointer | `Magnetic` (CTAs, 6 px max; large primary `Button`s by default), `Tilt` (hero card, 3 degrees), press state 90 ms, all fine-pointer only. |
| 6 | Rooms plain inside | Partly: shared treatment on all rooms (masked title, beam pan draws in, resin light behind the rail, raised cards). No bespoke per-room scroll scenes; the Bench and Atlas deliberately have no light. See gaps. |
| 7 | No ember or smoke | `Smoke.jsx`, lazy chunk (1,207 B gzip), half-resolution canvas, DPR capped at 1.5, driven by pinned progress and scroll velocity (thickens with the alcohol, leans with direction), paused off-screen and in hidden tabs, `fpsGovernor` halves then stops it. Not loaded under reduced motion or low power. |
| 8 | Orientation local | `Progress`: 2 px scroll hairline on every public and app page (RTL mirrored); the margin gauge ends on 84.50 g as before. |
| 9 | Hard cuts | The weighing stage's ground interpolates paper, dusk, paper through a registered colour property, timed so no text is on a transitioning ground; ends on the next section's ground. |
| 10 | Parallax, horizontal, `/dev/motion` | Rooms run sideways once across a pinned stage on wide screens (vertical on phones and under reduced motion, mirrored in Arabic) with a progress meter. `/dev/motion` now shows both pin progresses, beat jump buttons and smoke status beside progress, stage, fps and the reduced-motion, RTL and low-power switches. `Parallax` was unused and has since been removed: light and the tilting card carry depth instead (decision, see trade-offs). |

## Numbers

Production-flag build, phone profile (375x667 @2x, CPU 4x, 1.6 Mbps / 150 ms), median of 5, same machine, base = commit `cce8fcd`.

| | Base | Now |
|---|---|---|
| First script gzip | 178,026 B | **150,970 B (-27,056; under the 170 KB budget)** after the Arabic catalog moved to its own 29 KB chunk |
| CSS gzip | 12,464 B | 15,501 B (+3,037: weigh, rooms, light, grain) |
| All JS gzip | 314,323 B | 331,378 B (incl. 1,207 B lazy smoke chunk and the 29 KB Arabic chunk) |
| LCP `/` (gzip served, `GZIP=1`) | 1.02 s | 1.09 s |
| LCP `/ar` | 1.27 s | 1.34 s |
| LCP `/` uncompressed local | 1.53 s | 1.90 s |
| CLS `/`, `/ar`, `/pricing`, `/library`, `/ar/library` | 0 | 0 |
| FPS while scrolling `/`, `/ar` | 60.1, 60.0 | 59.8, 59.8 (over 20 ms: 2 to 3 frames) |

The uncompressed local run shows +0.37 s: it is the +13 KB raw render-blocking CSS on a server that does not compress (checked: hiding grain, light and shadows moves it by under 0.1 s each; the intro veil is not the cause). Production compresses, and the compressed A/B shows +75 ms. First script is still above the 170 KB budget (it was already).

Tests: Vitest 701 pass; lint 0 errors; Playwright flags-on build 373 pass, 13 fail, all expected or flaky: 12 are flag-off specs that need a default build, 1 (`journal sharing`) passes alone. Visual baselines: 6 home images regenerated on a default build (the scene is masked), 34 pass. Axe a11y specs pass (inside the 373); no Lighthouse run this pass.

## Trade-offs and decisions

- **Counters animate.** The brief asks for scroll-linked counters; the 0 to 84.50 g counter is on a dark instrument panel and drawn from a registered integer (aria-hidden), with the same numbers as real text beside it. The calculator's own figures are untouched.
- **Colour interpolation** on the weighing ground (the brief allows colour on scroll timelines). Mid-transition the ground is grey; the text beats are faded out then, only the self-contained dark panel is visible. AA holds at every held state.
- **Intro veil** is CSS and runs before hydration, so it adds no JS and no LCP cost, but it does cover the first 0.64 s of an already-painted page; skipping is any input.
- **Parallax primitive removed.** On a page with a pinned stage, extra layer speeds fought the pin; light and tilt give the depth.
- **Smoke is subtle by design** (amber, 16% peak alpha) so the numbers stay readable.

## Cross-engine and dark theme (follow-up, 2026-10-18)

- **Firefox 155 (script fallback) and WebKit iPhone 15 emulation (native scroll timelines, which this WebKit build has).** The weighing pin, the rooms strip (EN and AR at 1440) and the weighing at 375 were scrubbed in both: layout, beats, ground, beam and sideways travel match Chromium. Frames: `verification/`.
- **One bug found and fixed:** in Firefox the counter stepped (0, 23.75, 84.50) because it does not interpolate a registered integer inside keyframes. The fallback now computes the counter from `--pp` with `calc()`; Firefox reads 13.96 / 46.48 / 84.45 / 84.50 at the same stops as WebKit.
- **Suites, flags-on build:** WebKit iPhone 167 passed, 0 failed. Firefox 163 passed, 5 failed: four were 30 s timeouts under two parallel workers and pass alone (`a11y /`, Atlas Arabic 320, blend-loop Arabic edit, journal pattern); the fifth is the `?flag=wardrobe` spec that expects flags off. (Flag-off, visual and `Atlas is on` specs excluded as before.) New `pw.firefox.config.js`.
- **Dark theme, by eye, Chromium:** home hero, weighing (dusk is a warm brown, `#2B1C0E`, against the page's `#1E1A16`), rooms strip, Account, Wardrobe, Nose, Bench in EN and AR. One defect: the dark instrument panel merged with the dark ground; a 10% hairline now frames it in dark.
- **Accessibility:** axe (WCAG 2 A and AA) on `/` and `/ar`, light and dark, at four held states (top, oil beat, alcohol beat on dusk, total): zero violations in all 16 runs.
- Frames of the light-only mid-transition grey (ground between beats) are by design: only the dark panel is visible then.

## Finish pass (2026-10-18)

1. **Gap 6, room signatures** (all `transform`/`opacity`, scrubbed by `view()` where the browser has it, static and complete elsewhere, off under reduced motion and low power; rules in `motion.css`, scoped to `html[data-motion]`): Wardrobe bottle fill gauges fill as the card enters (`.mo-gauge`); Salon page rules are inked in over a hairline (`.mo-ink`); Atlas pyramid light grows band by band, deepest last, from the start edge in both directions (`.mo-band`); Nose matched accords ignite one by one after the card lands (`.mo-ember`). Bench and Atlas numbers and text never move.
2. **Tested with real data, not `/dev` routes.** `scripts/rooms-real.mjs` pulls 12 real catalog rows from the live public search API (names, brands, years, ratings, accords, notes), then drives the four rooms through the real built UI with a fake session. The user-owned tables (bottles, wear log, posts, Nose answer wrapper) are faked, so this is real catalogue data on a fake account: **a staging sign-in was not possible** (no service-role key; see CLAUDE.md). Per room, EN and AR, 1440 and 375, the script measures the rendered width of the signature element at six scroll positions: it grows from 0 to full and returns to 0 on the way back (gauge `0, 169, 169, 169, 169, 0` px; Atlas band `0, 237, 341, 341, 237, 0`), in Chromium, WebKit and in dark; Firefox shows the final state. Zero console errors and no sideways overflow in 24 runs. Real data also caught what the empty `/dev` routes never would: a scroll-timeline bug (below), and the Atlas page printing the year as "2,018".
3. **Scroll fallback, no scroll timelines (Firefox 155):** the weighing pin and the rooms strip scrubbed forward and back at 1440 EN and 375 AR; the counter climbs 0.00 → 20.94 → 59.14 → 84.50 g and returns to 0.00; no errors (frames in `verification/final/`). The room signatures have no fallback by design: they show their final state.
4. **Firefox and WebKit suites** (flags-on build): see Numbers.
5. **Dark theme by eye:** Wardrobe, Salon, Nose (Arabic 375) and Atlas with real rows, plus the earlier home and weighing frames (`rooms/chromium-dark-*`). Fine; no contrast or hairline problems found.
6. **Lighthouse (mobile, Lighthouse defaults, local gzip server, prod flags):** `/` performance 91 to 96, `/ar` 88 to 92 over four runs; accessibility 100, best practices 100, SEO 100 on both; CLS 0; TBT 30 to 165 ms. **LCP is simulated at 2.5 s on `/` and 3.0 to 3.3 s on `/ar`: `/` is at the 2.5 s limit and `/ar` is over it.** The pre-pass commit measured the same way gave 4.7 to 5.1 s and 5.0 to 5.2 s, so this pass is not the cause. I did not find what holds the `/ar` first paint (render-blocking CSS plus Arabic fonts under the simulated 1.6 Mbps link are the candidates; the intro veil is ruled out by a run without it; observed, unthrottled LCP is 0.2 to 1.3 s). Reports in `lighthouse/`.
7. **First script under budget:** 179,486 → 150,970 B gzip (-28.5 KB). `ar.js` (93 KB raw) was in the first script for English readers. It is now its own chunk (`src/i18n/catalogs.js`): English stays bundled; `main.jsx` loads Arabic before hydrating an `/ar` page or an app opened in Arabic; the prerender writes a `modulepreload` for it into every `/ar` head; switching language waits for it; a locale reached any other way renders English for one fetch, then re-renders. The first version missed the last case, and the Firefox suite caught it (language link, Arabic rooms at 320 px) before it shipped.
8. **`Parallax` removed** (component, export, CSS, dev sheet, README, test allowlist).

Bugs found while doing this, all fixed: a scroll-driven element inside an `overflow: hidden` wrapper never moved (the wrapper became its scroll container; `overflow: clip` fixes it; the Wardrobe gauge and Atlas bands had it); the year printed as "2,018" in Arabic and English (a number passed to the translator was grouped; now a string); the lazy-Arabic regression above.

## Not done or not checked

- **No staging sign-in**, so no real account data: the real catalog rows sit behind a fake session. Bottles, wear log and posts are invented fixtures.
- **`/ar` LCP over 2.5 s in Lighthouse's simulated mobile profile** (3.0 to 3.3 s), `/` at 2.5 s. Better than before this pass, cause of the remainder not found.
- A real phone and real Safari on an iPhone (WebKit emulation stands in); Lighthouse was not run on a device or on the Vercel preview, only on a local gzip server.
- Dark theme by eye in Chromium only; Firefox and WebKit are checked in light.
- Room recordings (`recordings/`) predate the signatures; no new video was cut, the proof is the width measurements and screenshots in `rooms/`.
- Firefox visual snapshots do not exist (the `visual` spec has Chromium baselines only), so Firefox ran without it.
- Sign-in still not screenshotted on its own; Arabic strings: none added.
- `Smoke` canvas not measured on a real low-end phone.
