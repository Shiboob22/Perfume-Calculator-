# 3D pour hero: stills for the owner's decision (D3)

The pour (`src/site/compounding/hero3d/`, flag `hero3d`, needs `compounding`) is built and **off in production**. The motion brief's M5 asks you to review it and either switch it on or leave it off.

These stills were taken from the production build on 2026-11-15: Pixel 7 size (412 × 915), at 2×, headless Chromium with software WebGL. Five moments in each of English and Arabic, light and dark:

| Moment | Where on the track |
|---|---|
| 1 Choose | dials, before the pour (4 %) |
| 2 Top notes | the note names fall as drops (21 %) |
| 3 Alcohol | the second tare, alcohol going in (60 %) |
| 4 Spray | the atomiser sprays once (88.5 %) |
| 5 Name it | the label, "Name it" and the Bench link (98 %) |

Files: `<en|ar>-<light|dark>-<n>-<moment>.jpg`.

## Still open for you

1. **Arabic strings** (drafts): the captions, the beat names in the pill, "Sound off", "Name it", the Bench link.
2. **Dark theme ground** (first pass): see the `*-dark-*` stills.
3. **Drop paths**: the note names now start inside the frame (see `*-2-top-notes`).
4. **The label's strength name** is French on both editions ("Eau de Parfum Intense"), also on the Arabic label.

To try it on your own phone first: open `https://scent-handbook-app.vercel.app/?flag=hero3d` (and `/ar?flag=hero3d`). It stays on for that phone only; `?unflag=hero3d` turns it off again. To switch it on for everyone: `VITE_FLAG_HERO3D=1` in Vercel production and a redeploy (I can do that once you say so).
