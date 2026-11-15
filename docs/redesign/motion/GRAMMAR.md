# Kyphira motion grammar

M0 of `docs/redesign/Kyphira-Motion_Brief_v1.md`. One page. The numbers live in `src/motion/config.js` (`TOKENS`) and nowhere else; `src/motion/grammar.test.js` fails the build when this page and the code drift apart.

## Character

Matter on a bench: liquid pours and settles, ink draws and dries, weight lands and rests, paper turns. Nothing bounces, spins or sparkles. Quiet and precise.

## The numbers

| Token | Value | Used for |
|---|---|---|
| `--mo-fast` (`--dur-fast`) | 150 ms | Press, hover, focus, colour change, a tooltip |
| `--mo-base` (`--dur-base`) | 250 ms | Anything the user triggers that moves: a sheet, a menu, a toggle, a row |
| `--mo-slow` (`--dur-slow`) | 600 ms | An entrance on view, a drawn line, a curve, a track fill |
| `--mo-ambient` (`--dur-ambient`) | 2000 ms | A loop (loading dots, a breath). Never faster than this |
| `--mo-ease` (`--ease-out`) | `cubic-bezier(.22,1,.36,1)` | Everything that arrives, answers or settles |
| `--mo-ease-io` (`--ease-in-out`) | `cubic-bezier(.65,0,.35,1)` | Things that travel, and loops |

`--dur-*` and `--ease-*` (the app's names) are aliases of `--mo-*` (the site layer's names). Tailwind's `transition`, `duration-fast|base|slow`, `ease-out` and `animate-pulse` read the same tokens.

## Rules

1. **A user's action never waits on a movement.** Input is live from the first frame. Anything the user triggers is at most `base` (250 ms). Only entrances on view and drawn lines use `slow`.
2. **Exits are faster than entrances.** Rule of thumb: an exit takes about two thirds of its entrance.
3. **Only `transform`, `opacity`, `filter` and stroke offsets move.** No keyframe animates size, position offsets, margin or padding (tested).
4. **Text is never left half-transparent.** An entrance on text moves; it does not wait at partial opacity (the contrast failure behind the `.reveal` rule). Fades are for things that are not text, or are over in `fast`.
5. **The fold never animates.** Anything on screen when the page opens is already in place.
6. **Calculator figures never animate.** The one exception is the Bench's LCD, whose numbers are owner-specified constants (`BENCH_MOTION` in `src/lib/calc/flacon.ts`).
7. **Every animation has a reduced-motion form.** Movement sits inside `@media (prefers-reduced-motion: no-preference)` (or `motion-safe:`), so reduced motion gets the end state at once. A loop is still, not slow (tested).
8. **Direction follows the page.** Anything that grows from an edge uses `--mo-dir` or a mirrored `[dir="rtl"]` origin (tested). Arabic starts at the right.
9. **Stagger is capped.** Siblings step by 60 ms, at most 8 steps, so a long list still finishes in time.
10. **No literal durations.** CSS spells no milliseconds except the 1 s / 1 ms scrub unit used by scroll-driven fallbacks (tested). Components use `duration-fast|base|slow` or `var(--dur-*)`.

## Jobs

| Job | Duration | Ease | Moves |
|---|---|---|---|
| Press, hover, tint | fast | out | colour, scale 0.98 |
| Sheet or menu in | base | out | translate from the edge |
| Sheet or menu out | fast | out | translate to the edge |
| Toggle, switch | base | out | translate, colour |
| Entrance on view | slow | out | rise 8 to 16 px (not fade, for text) |
| Line or curve drawn | slow | out | scale or stroke offset |
| Saved, settled | base | out | rise 4 px, then rest |
| Travel between screens (M2) | base | in-out | shared element |
| Loading mark | ambient | in-out | loop; still under reduced motion |

## Shared pieces (M1)

- **Press**: buttons, `[role="button"]` and links with `mo-press` (the bar, the wide tab row, link chips) step down 1 px and scale to 0.985 at once on press (`motion.css`). No easing: the answer is immediate.
- **Save state**: `kx/SaveState` (`working`, `saved`, `queued` for saved on this phone, `failed`), each arriving with `kx-settle`; `kx/Confirm` is the saved state. A field's error arrives the same way. No shake anywhere.
- **Sheets**: `kx/Sheet` rises in `base` and leaves in `fast`, keeping its last title and content while it leaves; the More sheet leaves in `fast` too. At once under reduced motion.
- **Where you are**: the phone bar has one room rule (`.kx-bar-ind`) that slides by transform to the room you open, toward the left in Arabic; still under reduced motion.

## Where each piece lives

- Tokens and primitives (site layer): `src/motion/`
- App keyframes and utilities: `src/index.css`
- The Bench's own constants: `src/lib/calc/flacon.ts`, `src/components/kx/Flacon.jsx`, `ScaleDisplay.jsx`
- Home scenes: `src/site/compounding/` (own sheets, own report)
