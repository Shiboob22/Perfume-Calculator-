# The Compounding — report

Branch `redesign/compounding`, behind the `compounding` flag (`VITE_FLAG_COMPOUNDING=1`, or `?flag=compounding` on one device). Flag off: today's homepage, and a lighter first script (see below).

## Numbers

Measured on a throttled phone profile: 375×667 at 2×, CPU 4× slower, 1.6 Mbps / 150 ms, touch scroll through the whole scene, median of 3 runs, headless Chromium (software rendering). Script: `scripts/compounding-perf.mjs`.

| Page | LCP | CLS | FPS while scrolling | Frames over 20 ms |
|---|---|---|---|---|
| EN | 2.05 s | 0 | 60.1 | 0 of 526 |
| EN, low power | 2.36 s | 0 | 60.1 | 0 of 525 |
| AR | 2.50 s | 0.024 | 60.1 | 0 of 501 |

- **Hero JS:** 176,434 B gzip for the first script with the flag on (170,482 B with it off). The scene is 5,952 B gzip, of which the scroll fallback is 388 B. The flag-off build loads the scene as a separate chunk, only if a device switches it on, so the flag-off homepage is 5.9 KB lighter than before this branch.
- **LCP element:** the afternoon headline. It never animates. These are lab figures, not field data.
- **AR CLS 0.024 is not from the scene.** The shifting nodes are shared header/footer links when the Arabic font swaps in. The flag-off Arabic home gives the identical 0.0241. It needs a fix in the shared chrome (reserve the Arabic font metrics); not done here. AR LCP sits on the 2.5 s line for the same reason.
- **Frame rate is a lab floor.** Headless software rendering at 4× throttling held 60 fps with no long frames. A real mid-range phone is untested; check the Vercel preview.

## What moves, and what it costs

| Layer | Driver | Properties | Idle cost |
|---|---|---|---|
| Plates, grains, mass, words, rooms, ember, haze | CSS view timelines (JS fallback where missing) | `transform`, `opacity` | none |
| Weight scale | CSS timeline on the scene | `transform` + one registered integer for the readout | none |
| Smoke | canvas 2D, drawn from the burn stage's scroll position | pixels | none: draws only on scroll, only while the stage is on screen |
| Palette shift | gradient bands at stage feet | none (static paint) | none |

Low power (Save-Data, 4 or fewer cores, or the debug toggle): the canvas is skipped, the static strokes stay, pixel ratio is 1.

## Browser support

| Browser | Scroll timelines | Smoke canvas | Scale readout (`@property`) | Result |
|---|---|---|---|---|
| Chrome / Edge 115+ | native | yes | yes | full |
| Safari 26+ (macOS, iOS) | native | yes | yes | full |
| Safari 16.4–25 | JS fallback | yes | yes | full, driven by the 388 B script |
| Firefox (stable) | off by default, JS fallback | yes | yes (128+) | full, driven by the script |
| Firefox before 128 | JS fallback | yes | no: scale fills, readout stays 0.00 g | degraded readout |
| Older browsers | none | no | no | static layout, all text and links present |
| Reduced motion (any) | none | none | none | static layout, per-stage scale labels |

Only Chromium was run here (native, and the fallback with support hidden). Safari and Firefox rows come from published tables ([caniuse](https://caniuse.com/mdn-css_properties_animation-timeline_view), [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline/view)), not tests. Check them on the preview.

## Trade-offs

- The scale follows the whole scroll, not stage boundaries; per-stage labels apply under reduced motion only.
- SVG child transforms (grains, mass) may not be compositor-driven in every engine.
- The scene range uses `vh`, so a mobile toolbar change shifts progress slightly.
- Atlas and Salon show "Not open yet" until their flags are on.
- The ingredient list and the Arabic drafts need the owner's review (aspalathus, seselis, thryon flagged).
- `/dev/motion` exists in development only, like the other `/dev/*` screens.

## Screenshots

`final/` (44 frames: each stage arriving and settled, EN and AR, 375 and 1440). `reduced-motion/` is the static layout. The folder root is checkpoint 1.
