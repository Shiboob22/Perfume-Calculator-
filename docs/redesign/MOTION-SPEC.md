# Kyphira motion spec and design rationale

Date 2026-10-18. Answers deliverables 3 and 4 of `design/Kyphira_Brief_v5.md` from what is **shipped**, not from the boards. Sources: `src/lib/theme.js` (`MOTION`), `src/index.css`, `src/motion/config.js`, `src/lib/compounding/config.js`, `src/components/kx/Stepper.jsx`. Numbers below are read from those files; change them there, then here.

## 1. Tokens

| Token | Value | Use |
|---|---|---|
| fast | 150 ms | hover, press, colour and border changes (`a, button, summary`), row tint |
| base | 250 ms | UI in and out, scale and bar fills (`.fill-anim`), pour, sheet exit |
| slow | 600 ms | an entrance, page transition, cinematic rise |
| ambient | 2 s or more | loops at rest: thinking dots (2 s), ember breath (3.2 s) |
| ease-out | `cubic-bezier(.22,1,.36,1)` | everything that arrives or fills (UI layer) |
| ease-in-out | `cubic-bezier(.65,0,.35,1)` | things that travel, page transitions, loops |

Rules that hold everywhere: only `transform` and `opacity` move (the weight-scale readout is the one registered-integer exception); nothing bounces; **calculator figures never animate**; entrances fire once and never replay on scroll-up; anything already on the first screen is never hidden.

### Known inconsistencies (to settle, none visible to users)

| Where | Says | Board / brief says |
|---|---|---|
| `src/motion/config.js` (`--mo-ease`, scroll-in reveals) | ease-out `(.2,0,0,1)`, ambient 2200 ms | `(.22,1,.36,1)`, ambient 2000 ms |
| `src/lib/compounding/config.js` `MOTION_SCENE.ease` | `(.2,0,0,1)` | `(.22,1,.36,1)` |
| `.cmp-breath` in `index.css` | uses the 2 s token; the 3.2 s ember breath is set inline from `emberBreathMs` | one ambient token |

The two ease-outs differ by a few percent of curve shape. Recommendation: point all three at the CSS `--ease-out` so there is one curve. Not done: it would shift baselines for entrance states.

## 2. Interaction table

| Element | Trigger | Property | Duration | Ease | Notes |
|---|---|---|---|---|---|
| Link, button, summary | hover, focus, press | colour, background, border | fast | out | focus ring is instant, 2 px, 2 px offset |
| Chip, tab | select | colour, border, underline | fast | out | `aria-pressed` / `aria-selected` change with the visual |
| Stepper (`kx/Stepper`) | press | value commits instantly | 0 | none | hold 400 ms, then repeat every 120 ms; mirrors in RTL |
| Bench scale and bar fills | value change | transform, width, height | base | out | figures beside it change instantly |
| Bench-mode row tick | tick | row tint | fast | out | tick mark fills with the scale at base |
| Bottle pour | volume change | transform (bottom origin) | base | out | |
| Reveal (Home, Library index) | top within 12% of viewport bottom | opacity, translateY (16 px) | slow | out | once; stagger 60 ms, capped at 8 steps |
| Heading words | in view | mask, translateY | slow | out | whole words only; Arabic letters keep their joins; 40 ms per word, 14 words max |
| Hairline | in view | scaleX from the inline start | slow | out | mirrors in RTL |
| Route change | navigate | root crossfade (View Transitions) | slow | in-out | header and footer sit out; fallback is a 250 ms fade |
| Active-room underline | navigate | slides between items | slow | in-out | one `view-transition-name` |
| Salon profile header | mount | opacity, translateY (14 px) | slow | out | cinematic; delays 0 / 120 / 240 ms for name, bio, stats |
| Nose thinking | pending answer | dot opacity .25 → 1 | ambient (2 s) | in-out | delays 0 / 250 / 500 ms, alternate |
| Skeleton | loading | opacity pulse | ambient | in-out | |
| Mobile More sheet | open, close | translateY, scrim opacity | base | out | exit handled by `useExit` |

Cinematic motion is allowed in three places only: the homepage hero, Library chapter openers, the Salon profile header. Every other room is quiet.

## 3. Hero storyboard: the Compounding

Scroll is time in the room. Progress runs 0 to 1 over one scene; each mark also has its own view timeline (0 = touches the bottom of the screen, 1 = leaves the top). Driver: CSS scroll timelines; a 388 B script when they are missing. Light is fixed per stage and independent of the theme toggle; the last stage hands back to the page's own theme.

| # | Stage | Scene progress | Ground (hex) | What the reader sees |
|---|---|---|---|---|
| 1 | Afternoon | 0 to 0.12 | `#EDEAE3` | Headline "16 materials. 1 ember. 6 rooms." (never animates; it is the LCP element). A bowl on the table lags the page (parallax, 40 px, view 0.5 to 1). |
| 2 | The sixteen | 0.12 to 0.46 | `#F0E8D7` | Plates I to XVI arrive one by one, English and Arabic names, 28 px rise, 35 ms stagger. A gauge on the side starts to fill. |
| 3 | Pour | 0.46 to 0.62 | `#E6D3AA` | Grains drop into the bowl (34 px, view 0.08 to 0.32), draw together (0.06 to 0.42), become one amber mass (0.20 to 0.58). Scale reads in grams. |
| 4 | Dusk | 0.62 to 0.74 | `#3C2815` | Ground turns from light to resin-brown through a graded band (96 px to 220 px, 22 vh). Words settle by movement only, never by fade. |
| 5 | Burn | 0.74 to 0.90 | `#1A120B` | The ember takes (view 0.06 to 0.30) and breathes (3.2 s loop). Seven plumes of canvas smoke climb (progress 0.10 to 0.62 of this stage) and thin out (0.80 to 1.00). |
| 6 | Hand-off | 0.90 to 1 | page theme | Smoke clears (0.82 to 1). Six rooms come out of it, I to VI, 44 px rise, 35 ms stagger; the haze lifts (view 0 to 0.4). The gauge ends on 84.50 g, the batch weight the calculator opens with. |

Per-keyframe detail for the two moments people remember:

| Keyframe | State | Trigger | Duration | Ease |
|---|---|---|---|---|
| 2.1 | Plate I at rest, off screen, 28 px low | scroll, view 0 | scrubbed | linear to scroll |
| 2.2 | Plate I in place, plate II starts | +0.035 view | scrubbed | |
| 2.16 | All sixteen set; gauge at 100% of its sixteen | stage 2 ends | scrubbed | |
| 3.1 | First grain falls | stage 3 starts | scrubbed | |
| 3.2 | Grains meet | view 0.42 | scrubbed | |
| 3.3 | One amber mass, scale reads full grams | view 0.58 | scrubbed | |
| 5.1 | Ember alight, small | stage 5, view 0.06 | scrubbed | |
| 5.2 | Ember at rest | view 0.30 | 3.2 s loop, alternate | in-out |
| 5.3 | Smoke at full height | stage progress 0.62 | scrubbed (canvas) | |
| 6.1 | Smoke gone, rooms visible | view 0.82 to 1 | scrubbed | |

Scrubbed means the scroll position sets the frame, so reversing scroll plays it backwards and a stopped page is a still image.

**Skip.** A "Skip to rooms" link follows the headline. The board's timed 9.2 s autoplay was not built (decision Q1, scroll kept).

**Reduced motion.** The scene renders as a static layout: all sixteen plates in a grid, the mass drawn, the ember and smoke as still strokes, the six rooms in a row, every word and link present. Nothing is hidden waiting for scroll.

**Low power** (Save-Data, 4 or fewer cores): no canvas, 3 plumes of static stroke, pixel ratio 1.

**Measured** (throttled phone profile, lab): LCP 2.05 s EN / 2.3 s AR, CLS 0, 60 fps scrolling, 0 frames over 20 ms. Source: `docs/redesign/phase-compounding/REPORT.md`.

## 4. One key moment per room

| Room | Moment | Frames | Duration | Reduced motion |
|---|---|---|---|---|
| Bench | Weigh to the target | (1) bar empty, target tick; (2) bar fills with the scale, figure already final; (3) at target the bar meets the tick and the state word changes under / ok / over | base, out | bar jumps to the final width |
| Wardrobe | Tonight answer | (1) occasion chip pressed (fast); (2) one large answer replaces the last (base fade, 8 px rise) | fast + base | swaps with no rise |
| Library | Chapter opener (cinematic) | (1) heading words rise through a mask, 40 ms apart; (2) hairline draws from the inline start; (3) drop cap and body settle | slow | all visible at once |
| Atlas | Family chip filter | (1) chip pressed with count; (2) rows re-stagger from the top, 60 ms steps, 8 max | fast + slow | list swaps |
| Salon | Profile header (cinematic) | (1) name and avatar rise 14 px; (2) bio +120 ms; (3) stat tiles +240 ms | slow, out | static |
| Nose | Thinking | (1) three dots, 6 px, offset 250 ms; (2) answer replaces them with the picks, staggered | ambient, then slow | dots static at .6 |
| Account | Plan meter | (1) meter at 0; (2) fills to real usage | base, out | final width |

## 5. RTL and bilingual rules

- Slides, progress, the hairline draw and the stepper mirror; the gauge and scale mirror with `inset-inline-start`.
- Motion distances use a direction multiplier (`--mo-dir`), so a rise is still vertical and a slide reverses.
- Heading reveals split on whole words only. Splitting Arabic by letter breaks its joins.
- Catalogue and measurement strings keep `dir="ltr"` inside Arabic text.
- Digits are Western everywhere, one style, chosen once.

## 6. Rationale

Kyphira is a perfumer's notebook kept in a laboratory room at dusk, so every choice favours a working record over a showpiece. One resin accent in both themes keeps the page calm and lets the amber mean one thing, action; light stays the default because most people blend by day at a bench, and the dark edition carries the board's exact ground, surfaces and hairline for the evening. Newsreader for display and voice, Hanken Grotesk for UI and tabular figures for every measurement, paired with Noto Naskh Arabic and IBM Plex Sans Arabic, give an editorial voice without a monospace "tech" tone, and Arabic is set with its own line height (1.95 body) rather than borrowing the Latin one. Roman numerals, hairlines and generous space carry the catalogue feel; ornament is left out. Motion follows the same rule: four durations and two eases, only transform and opacity, figures never animate because a number you are reading while you pour must not move, and cinematic treatment is spent on three places only (the Compounding hero, Library openers, the Salon profile header) so the rest of the site stays quiet and precise. The hero is scroll-driven, not timed, so the reader controls the pace, a stopped page is a still, and reduced motion gets the full content as a static layout rather than a stripped one. Where the brief and the product disagreed (a Pro-gated Nose chat, raw-material formulas, mock identifiers like R·0318), the product won, and the gaps are logged in `BOARD-SYNC.md`.
