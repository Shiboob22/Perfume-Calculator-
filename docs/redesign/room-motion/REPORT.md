# Room motion report (2026-11-23)

Branch `claude/kyphira-motion-lenis-gsap-cdbd95`. Flag `roommotion` (needs `motion`), off in production. Try it with `?flag=motion&flag=roommotion` on the preview. Design: `docs/plans/2026-11-23-room-motion-design.md`. Interaction rows: `docs/redesign/MOTION-SPEC.md`.

## What moves, per room

| Room | Motion |
|---|---|
| Bench (`/bench`) | Blend editor rows rise in and out; the strength tier ring slides to the lit tier; "Logged as No. NNN" settles (scale only, the live text is never faded). |
| Batches (`/bench/journal`) | Flip when the list changes (delete, new data). |
| Journal (`/journal`, `/ar/journal`) | The note dot pops in when a note is saved. The batch list reorder is the motion layer's own `useFlip` (from main), not GSAP. |
| Wardrobe (`/wardrobe`) | Tonight: the answer's words rise in when a choice changes the answer (never on first mount); the collection grid Flips. |
| Atlas (`/atlas`) | Pyramid bands draw in from the inline start; Browse results Flip. Lenis on wide screens. |
| Salon (`/salon`) | Notebook pages enter in batches as they reach the fold. Lenis on wide screens. |
| Nose (`/nose`) | Lenis only. No GSAP scene. |
| Selector (`/app/selector`) | Ranked results arrive top match first; results already shown are not replayed. |
| Library | Lenis only (public page). |
| Search (calculator tab) | Flip on the results list. |

All scenes use transform and opacity only, `kx.out` / `kx.inOut`, and durations built from the motion tokens (enforced by `assertSceneRules` in the unit tests). Under reduced motion, low power, or either flag off, nothing loads and the page is static.

## Cut, and why

- **Account**: cut by the owner.
- **Atlas card to page (Flip.fit)**: cut by the owner; pyramid draw and result reorder stay.
- **Selector step slide and progress bar**: cut by the owner; results arrival stays.
- **Nose scene**: its cards sit inside an `aria-live` region and already enter through the CSS motion layer; there are no accord bars (cards carry chips). Animating inside the live region would break the rule that announced text is never animated, and moving it out would change what screen readers announce.
- **Salon composer rise**: Compose is a route whose form is on the first screen; fading it in breaks "the first screen is never hidden".
- **Recordings**: cut by the owner; this report is text only.
- **Library**: Lenis only, because it is a public page and must not import app code.

## GSAP weight

Three lazy chunks, loaded by `load.js` after first paint and only where a scene is mounted: gsap core 32.5 KB, ScrollTrigger 14.3 KB, Flip 7.4 KB (gzip), 54.2 KB in all. Splitting was a ruling after a single chunk came to 52.6 KB against the 40 KB budget; the budget is now per chunk. Every motion room fetches all three (the loader does not pick plugins per room). `check-bundle.mjs` fails if any reaches an up-front script. Rooms with no scene mounted (for example the Atlas landing) fetch none.

## Rulings made during the build

- Vitest runs in node with no jsdom or RTL, so hooks are thin wrappers over pure functions; component behaviour is proven in Playwright.
- Scene duration rule: a token plus k x 60 ms, k from 0 to 8 (matches stagger semantics).
- `peekGsap()` and `useSceneCtx()` were added to the kit so event-driven scenes can run on user actions.
- The stamp animates scale only, from the inline start, never opacity (it sits in a live region).
- Late-loading GSAP must not replay a scene on content already on screen (Selector, Salon).
- Lenis stops while a `kx/Sheet` or the tour is open. Lenis in the rooms needs `roommotion` as well as `motion` (`roomSmoothAllowed`); the home page's Lenis needs `motion` only.

## Verification

`e2e/room-motion.spec.js` (desktop project, 22 tests): no console errors and a visible first screen in `/bench`, `/journal`, `/ar/journal`, `/wardrobe`, `/atlas`, `/salon`, `/nose`, `/app/selector` at 375 and 1440; no `gsap-` request under reduced motion; all three chunks on the Bench; Lenis on at 1440 `/atlas`, off on `/bench` and at 375; leaving `/atlas` for `/bench` within 200 ms raises no error; Batches Flip ends in visual order with `transform: none`; the Wardrobe answer words are at opacity 1 one second after choosing an occasion.

What this spec does not cover: the fake API is empty, so most rooms (`/journal`, `/ar/journal`, `/wardrobe`, `/atlas`, `/salon`, `/nose`, `/app/selector`) only prove "mounts without error, first screen visible" here; the Bench also runs its blend and tier scenes only on interaction. Scene behaviour is covered by the node scene tests and the per-room e2e added in each room's task (journal rapid re-sort, bench add and remove rows, the salon, atlas, wardrobe and selector specs). The Batches Flip check asserts the end state only (visual order, `transform: none`), and the quick-navigation test asserts no console error only.

Differences from the brief: (1) while a Sheet is open Lenis is destroyed (`smooth.js` `halt`), so `html.lenis` goes away; the `lenis-stopped` class never appears, and the spec asserts the real behaviour. (2) `window.ScrollTrigger` is not exposed in any build, so the quick-navigation test asserts "no console error" only.

## Open items for the owner

- **Feel review** on the preview with `?flag=motion&flag=roommotion`: durations, the Salon page tilt (0.6 deg), the Wardrobe word rise, Lenis lerp 0.1 on the five rooms.
- **Arabic**: no new strings, nothing to review. RTL is covered (inline-start origins, mirrored direction); only `/ar/journal` is routed as an Arabic room.
- `gsap.ticker.lagSmoothing(0)` is set when Lenis drives the ticker and never restored.
- Per-room plugin loading (Flip-only rooms need not fetch ScrollTrigger) is a possible follow-up, about 14 KB on those rooms.
- Smaller deferred review notes: the tier ring is not throttled on resize; Salon and Wardrobe scenes run in `useEffect`, so a one-frame flicker is possible on reshuffles; Lenis checks width per pathname only.
- Pre-existing and unrelated: `src/lib/batchTiming.test.js` fails on a DST edge.
