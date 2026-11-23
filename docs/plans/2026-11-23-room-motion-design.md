# Room motion: GSAP and Lenis in the app rooms (design)

Date 2026-11-23. Branch `claude/kyphira-motion-lenis-gsap-cdbd95`. Status: design approved by the owner, not built.

## Decisions (owner, 2026-11-23)

1. **Scope:** the app rooms, one signature scene each. Public pages keep the CSS layer they have.
2. **GSAP:** a lazy chunk loaded by the app only (core + ScrollTrigger + Flip). Never in the first script or a prerendered public page. Not loaded under reduced motion or low power.
3. **Lenis:** reading rooms only (Library, Atlas, Salon, Wardrobe, Nose), wheel smoothing on wide screens with a fine pointer. Bench, Pour along, Journal and Account keep native scroll. Phones stay native everywhere.
4. **Character:** same voice, more craft. The `TOKENS` in `src/motion/config.js` and the rules in `docs/redesign/MOTION-SPEC.md` hold: only transform and opacity, nothing bounces, entrances once, first screen never hidden, calculator figures never animate, reduced motion is a full static page.
5. **Approach:** a shared kit in `src/motion/gsap/` plus one scene file per room.
6. **Flag:** new flag `roommotion` (needs `motion` too), off in production until the owner reviews the preview.

## 1. Architecture

`src/motion/gsap/` (app chunk only):

- `load.js`: `loadGsap()` returns one cached promise of `{ gsap, ScrollTrigger, Flip }` via `import()`. Resolves `null` unless `motionOn()`, `flagOn("roommotion")`, `!reduced()` and `!lowPower()`. Loads on `requestIdleCallback` after the room's first paint.
- `useRoomScene(ref, build, deps)`: once loaded, runs `build({ gsap, ScrollTrigger, Flip, tokens, rtl })` inside `gsap.context(ref)` and `gsap.matchMedia()` (`prefers-reduced-motion: no-preference`). Unmount, or reduced motion switched on mid-session, reverts everything.
- `useFlipList(key)`: `Flip.getState()` before a render whose `key` changed (sort, filter, tab), `Flip.from()` after. Does nothing without GSAP.
- `ease.js`: registers `kx.out` and `kx.inOut` from `TOKENS.ease`, so GSAP and CSS share one curve.

Scenes: `src/components/<room>/scene.js`, a plain `build(ctx)` function. No React, no arithmetic beyond layout.

Lenis: `useSmoothScroll` gains a route allowlist (decision 3). Lenis `raf` runs on `gsap.ticker`, `lagSmoothing(0)`, so ScrollTrigger and Lenis read the same frame. `lenis.stop()` while a `<dialog>` sheet or the tour is open.

Untouched: calculator figures, the LCD (`kx/ScaleDisplay`), `kx/benchClock`, `kx/Flacon`, hero3d, and the CSS reveal layer on public pages.

## 2. Scenes per room

Whatever is on the first screen when a room opens is shown at once (the View Transition crossfade already covers the arrival). Motion goes to what comes later: below the fold, the user's own changes, scroll-linked detail.

| Room | Signature | GSAP part |
|---|---|---|
| Bench | Blend editor rows slide in and out on add/remove; the strength tier ring slides between tiers; "Logged as No. NNN" stamps in. | Flip on rows and the tier ring; a timeline for the stamp. Figures, LCD, flacon untouched. |
| Journal | Sort chips reorder batch rows in place; a milestone dot draws along the rest bar when a note is saved. | Flip (`key` = sort + dir); a dot tween. |
| Library | Essays/Glossary tab cross-slide (mirrored RTL); a margin hairline fills as you read long essays; pull quotes settle in. | ScrollTrigger scrub on the hairline. Lenis on. |
| Wardrobe | Filters regroup the numbered grid; the Tonight answer reveals word by word. | Flip; word stagger with `splitWords` (whole words). Lenis on. |
| Atlas | Pyramid bands draw top, middle, base on scroll; results reorder on chip filters; a card grows into the fragrance page. | ScrollTrigger; Flip; `Flip.fit` card to page. Lenis on. |
| Salon | Notebook pages stack and turn slightly as they scroll in (rotation at most 1 degree, small rise); the composer sheet rises. | `ScrollTrigger.batch`. Lenis on. |
| Nose | The shelf fills as matches arrive; each card's accords draw in as a bar. | A timeline per answer. Lenis on. |
| Selector | The 16 steps move sideways (mirrored RTL), the progress bar slides, results arrive top match first. | A timeline per step. |
| Account | Plan meter fill and ruled sections draw in. | A small timeline. |

Search and Batches get the shared list Flip only. No room gets parallax, bounce or colour scrolls.

## 3. Fallbacks, performance, RTL, accessibility

Fallbacks (each gives today's room):
- No GSAP with either flag off, reduced motion, or low power (Save-Data or 4 cores or fewer).
- Chunk fails to load (offline, old service worker): `loadGsap()` resolves `null`, no user-facing error, one `/api/log` report per session.
- Hidden start states are set by GSAP only (`gsap.set` inside the context), never in CSS: without GSAP nothing starts hidden.
- Flip falls back to an instant reorder.

Performance:
- gsap chunk at most 40 KB gzip; first script unchanged. Both enforced by `scripts/check-bundle.mjs`.
- A scene that starts before the chunk lands skips its entrance and keeps later interactions.
- Only transform and opacity: pyramid bands and hairlines use `scaleX`/`scaleY`, never width.
- ScrollTriggers per room, killed on unmount, one `ScrollTrigger.refresh()` after fonts load.
- `fpsGovernor`: level 1 halves stagger steps, level 2 drops scrubbed scenes.

RTL and Arabic:
- Every x move multiplied by the direction (`rtl` in `build(ctx)`, from `--mo-dir`).
- Word reveals are whole words; SplitText is not used.
- Flip plays measured positions, so it is the same in both directions.

Accessibility:
- Focus never moves during a scene; Flip does not change focus order beyond what React renders.
- `aria-live` text is never animated.
- No new loops beyond the existing ambient tokens.

## 4. Testing and rollout

Vitest:
- `load.test.js`: `null` with a flag off, reduced motion or low power; one cached promise.
- `ease.test.js`: GSAP eases equal `TOKENS.ease`.
- One test per `scene.js` with a stub `gsap` that records calls: only `x`, `y`, `scale*`, `rotation`, `opacity`; durations from `TOKENS`; x mirrored under `rtl`.
- `useFlipList` does nothing without GSAP.

Playwright `e2e/room-motion.spec.js` (EN/AR, 375 and 1440):
- Flags on: each room loads with no console errors; first screen visible at t = 0; after a sort or filter the final order is correct.
- Reduced motion: no request for the gsap chunk.
- Lenis only on allowlisted routes, wide screens, stopped while a sheet is open.
- Existing axe and visual specs run with the flag off; baselines unchanged.

Bundle: `check-bundle.mjs` keeps gsap out of the first script and public pages, 40 KB chunk budget; the service worker does not precache the gsap chunk.

Rollout, one commit per concern: (1) kit + bundle guard, (2) Lenis allowlist, (3) Journal + Search/Batches Flip, (4) Bench, (5) Library, (6) Wardrobe, (7) Atlas, (8) Salon, (9) Nose, (10) Selector, (11) Account, (12) docs: `MOTION-SPEC.md` interaction table and the CLAUDE.md phase note. Recordings EN/AR in `docs/redesign/room-motion/`. `roommotion` stays off in production until the owner reviews the preview.

## Open for the owner

- The exact gzip size of GSAP core + ScrollTrigger + Flip is measured in step 1; if it is over 40 KB, Flip-only rooms load a smaller chunk.
- Feel review on the preview (pace of Flip reorders, the Salon page turn).
