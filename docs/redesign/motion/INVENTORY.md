# Motion inventory

M0 of `docs/redesign/Kyphira-Motion_Brief_v1.md`, 2026-11-15. Every keyframe, timing and animation hook in the product. Verdicts: **keep**, **merge** (into a shared primitive in M1 to M3), **removed** (done in M0).

## Keyframes

| Keyframe | File | Job | Verdict |
|---|---|---|---|
| `mo-enter`, `mo-word`, `mo-draw`, `mo-settle`, `mo-settle-up`, `mo-fade`, `mo-fade-out`, `mo-sheet-in`, `mo-sheet-out`, `mo-leave`, `mo-sweep`, `mo-light-scroll`, `mo-progress`, `mo-grow`, `mo-ember`, `mo-breath` | `src/motion/motion.css` | The site layer: entrances, word reveals, drawn lines, sheet, leave, sweep | keep. These are the shared primitives the app adopts in M1 |
| `reveal` | `index.css` | Scroll entrance (21 uses), moves, never fades | keep |
| `gloss-in` | `index.css` | Glossary tooltip fade | keep (now behind reduced motion) |
| `read` | `index.css` | Reading-progress hairline | keep |
| `kx-drift` | `index.css` | Smoke loading line | keep (now still under reduced motion) |
| `sheetUp`, `sheetFade` | `index.css` | The More sheet's fallback without the motion layer; `sheetFade` also fades every `kx/Sheet` backdrop in | keep (M1: the More sheet's exit is now `mo-sheet-out` in the fast step) |
| `kx-rise` | `index.css` | Salon profile header | keep. M1: the words are whole by a quarter of the rise (rule 4), its delays are stagger steps; the confirm card moved to `kx-settle` |
| `kx-tick-draw` | `index.css` | A confirmation tick draws | keep, becomes part of the shared "saved" (M1) |
| `kx-think` | `index.css` | The Nose's thinking dots (ambient) | keep; replaced by the accord-gathering moment in M4 |
| `kx-curve-draw`, `kx-track-fill`, `kx-settle` | `index.css` | The Journal's curve, timeline fill; `kx-settle` is the shared arrival of every save state and field error (M1; the words are whole by 60 %) |  keep |
| `kx-sheet-in`, `kx-sheet-out`, `kx-pop-in`, `kx-pop-out`, `kx-fade-out` | `index.css` | `kx/Sheet`: rises on phones, settles in on wide screens, leaves in the fast step (M1) | new |
| `kRise`, `kGrow`, `kFade` | `index.css` | Homepage v2 scroll entrances (`.kv*`) | keep (scroll-driven versions of `mo-enter` and `mo-draw`) |
| `cmp-drift`, `cmp-plate`, `cmp-pan`, `cmp-beam`, `cmp-ember`, `cmp-fill`, `cmp-tick`, `cmp-grams`, `cmp-breath` | `index.css` | The Compounding scroll scene | keep (own report) |
| `wg-*` (10) | `src/site/compounding/weigh.css` | The weighing scroll scene | keep |
| `rs-slide` | `src/site/compounding/rooms.css` | The rooms strip | keep |
| `kDrift`, `kPulse` | `index.css` | Homepage v2 export, never referenced | **removed** |
| `rs-hint` | `rooms.css` | Never referenced | **removed** |

Total after M0: 51 keyframes in 4 stylesheets (was 54), each referenced (tested).

## Timings and curves that were off the tokens (fixed in M0)

| Where | Was | Now |
|---|---|---|
| More sheet and scrim (`AppNav.jsx`) | 240 ms and 200 ms, `cubic-bezier(.2,.8,.2,1)` and `ease-out` | `--dur-base`, `--ease-out` (10 ms and 50 ms; a slightly different settle) |
| Nav tab icon and bar (`AppNav.jsx`) | `duration-200` | `duration-fast` (150 ms) |
| Selector progress bar | `duration-200` | `duration-base` |
| Smoke loading line | `2400ms` | `calc(var(--dur-ambient) * 1.2)` (same) |
| Thinking dots delay | `250ms`, `500ms` | `ambient / 8`, `ambient / 4` (same) |
| Cost card unblur | `600ms` and a fallback ease | `--dur-slow`, `--ease-out` (same) |
| Tailwind `transition` | 150 ms, Tailwind's own curve | `--mo-fast`, `--mo-ease` (17 uses; a gentler settle) |
| Tailwind `animate-pulse` (3 uses) | 2 s, ran under reduced motion | `--mo-ambient`, `motion-safe:` only |

Two names for one set of numbers (`--dur-*` and `--mo-*`) are now one: `--dur-*` and `--ease-*` alias `--mo-*`, whose values come from `TOKENS` in `src/motion/config.js`.

## Reduced motion

Two animations ran regardless of the setting and are fixed: the glossary tooltip fade and the Smoke loading line. Everything else in `index.css` and `motion.css` sits inside a `no-preference` or `@supports` block (tested). The Compounding's scrub fallbacks are paused animations that move only with scroll.

## Right to left

Audited every `transform-origin`, `translate` and sweep. Every rule that grows from the left edge has a mirrored `[dir="rtl"]` rule, and the sweeps, reveals and nudges use `--mo-dir` (tested). Found nothing to fix. `left: 50%` with `translateX(-50%)` in the hero is symmetric.

## Left as they are, on purpose

- **The Bench**: the LCD roll, flacon pour and 120 ms settle are owner-specified constants (Phase 6), with `Flacon.jsx` and `ScaleDisplay.jsx` holding inline `120ms`, `150ms` and `200ms`. They are `aria-hidden` and tested in `bench-motion.spec.js`. They stay out of the token tests.
- **`src/dev/Directions.jsx`**: a dev-only page with its own CSS, not shipped.
- **JavaScript timers** (`setTimeout` for copy and "added" confirmations at 2 s, wake-lock timers, the View Transition guards in `nav.js`): behaviour, not motion.

## Not done in M0

- The `/dev/motion` gallery of app primitives. There are no shared app primitives to show until M1; it moves there.
- A pass over Tailwind `transition` use for reflow properties (`transition-[width]` in the Selector bar). It is one small bar; noted for M3.
