# Motion M6: control and proof

Branch `claude/practical-feynman-v83ilb`, 2026-11-16. No migration.

## The motion setting (D2)

Full, Calm or Off, in the More sheet (phones) and in Account → Preferences, kept on the device (`localStorage` `kyphira.motion`) and applied before first paint (`<html data-mo-level>`, inline script in `index.html`).

| | Full | Calm | Off |
|---|---|---|---|
| Presses, saved marks, settles, sheets rising and leaving | yes | yes | no |
| Cross-fades between pages | yes | yes | no |
| Pages sliding in from an edge, the shared name travelling | yes | no (a cross-fade) | no |
| Rows sliding to their new places | yes | no (a swap) | no |
| Entrances rising, words rising out of a mask | yes | fade in place | no |
| The signature (a logged batch filed into the Journal) | yes | no (the words only) | no |
| Pointer light, magnetic and tilt | yes | no | no |
| Home scroll scene, 3D pour, smooth wheel scrolling | yes | no (the static page) | no |

With no choice made, a device that asks for reduced motion starts on Calm and the setting says why; the system's setting still stills the CSS whatever is chosen. Code: `src/motion/level.js` (tested), `calm()` in `src/motion/env.js`, the Off and Calm rules at the end of `src/index.css`, `src/components/MotionSetting.jsx`. Strings EN + AR (Arabic is a draft).

## Numbers (lab only, D7)

Playwright Chromium, headless, desktop 1280 × 720, software rendering, CPU slowed 4× through CDP, fake API with 24 batches, run alone (`MOTION_MEASURE=1 npx playwright test e2e/motion-measure.spec.js --project=desktop`). Raw: `numbers.json`. Indicative, not a verdict: a real phone with a GPU will differ.

| Room | Taps | Longest response (INP proxy) | Layout shift (CLS) |
|---|---|---|---|
| Bench: three strength taps | 9 events | 104 ms | 0 (was 0.028, see below) |
| Journal: two sorts, a batch picked | 9 | 96 ms | 0 |
| Upgrade sheet on the records page: plan badge opens it, Esc closes | 5 | 248 ms (was 424 ms) | 0 |
| Account: Motion → Calm → Full | 6 | 56 ms | 0 |
| Library: Glossary ↔ Essays | 6 | 40 ms | 0 |

Measured as a returning visitor (the Bench opened once before). Signature (a log on the Bench, 4× CPU): 55 frames while the bottle was on screen, **60 fps**, worst frame 17 ms (58.9 fps and 33 ms on another run). Target 55 fps on a mid-range Android: met in the lab, not yet on a phone.

Up-front JavaScript (module script and preloads of the first page, gzipped; `node scripts/motion-proof/upfront-js.mjs <dist>`, both builds `vite build` with the same placeholder env): **157.7 KB before M0 → 161.4 KB now, +3.7 KB** for the whole motion plan (budget 6 KB).

### Two findings, fixed with the owner's yes (2026-11-16)

1. **Bench layout shift, 0.028 → 0.** For someone with batches, the resting card ("Batch 1, Day 45 of 90") appeared above the formula about 330 ms after load and pushed it down 162 px (it predates the motion plan). Now the Bench remembers on the device whether the card showed (`kyphira.restingShown`) and, while batches load, holds its place with an empty card of the same height (`data-resting-placeholder`, `aria-hidden`). The very first visit on a device has nothing to remember, so it can still shift once; a resting batch that ends leaves a gap that closes once. Test: `e2e/hold.spec.js` (same height, no shift).
2. **Opening the upgrade sheet.** Profiled at 4× CPU: React's work, `showModal()` (about 50 ms) and then a style recalculation of the whole page (604 elements, 67 ms) and its repaint, because a modal dialog makes everything behind it inert. Fixed what is ours: the context value is memoised, the Bench reads the sheet's state through a stable `peek()` instead of re-rendering when it opens (`useUpgradeActions()`), and the sheet's contents stay built while closed (`kx/Sheet keepMounted`). Result: the records page 128 → 72–104 ms per open, the Bench about 240 → 225 ms. The Bench is still over 200 ms: the rest is the browser's own work for a native modal on a large page. Replacing `<dialog>` (focus trap, Escape and inertness come free with it) is not worth the risk.

## Film and stills

`kyphira-motion.mp4` (34 s, Pixel 7 size, H.264, no sound) and six stills, filmed from the production build with a fake account (`./scripts/motion-proof/film.sh`): the home page, a strength picked and a batch logged and filed into the Journal (1), the Journal (2) re-sorted (3), a rested batch's Ready day (4), the More sheet with the Motion setting (5), the same Journal in Arabic (6). The brief asked for 45 s; this cut is shorter.

## Not done

- The recorded check on the owner's iPhone and a mid-range Android, every room, EN and AR, Full and Calm: needs the devices.
- The public page "How Kyphira moves": not built (D8: the owner said no, 2026-11-16).
- Field measurement (D7: lab only, as decided).
