# Journal J6: polish and proof (2026-11-15)

What was done, what was measured, and what is still the owner's.

## Done

- **Motion** (existing tokens, none under reduced motion; `index.css`): the rest timeline fills from where it
  starts (the right in Arabic), a saved note's confirmation settles in, the curve draws once. Checked by
  `e2e/journal-room.spec.js` ("the room's small motions").
- **Layout shift fixed.** Lighthouse found CLS 0.40 on the signed-in Journal: the footer jumped when the page
  chunk and the batches arrived. The app's loading placeholder and the Journal's wrapper are now one screen tall,
  so the footer stays below the fold. CLS is now 0 (this helps every page that shows the loading placeholder).
- **Accessibility** (axe, WCAG 2.2 AA, EN/AR x light/dark x phone/desktop): 0 violations on the curve, the oil
  overlay, the compare table and the record (`e2e/journal-curve.spec.js`).
- **Stills and film**: `docs/redesign/journal/film/` (five stills at 390 px, 2x, and a 20-second MP4 of the
  quick note, the curve, the oil overlay with Make again, and the compare table).

## Lighthouse, mobile, signed in (`/journal?batch=...`, fixture data, local server)

| Category | Score |
|---|---|
| Accessibility | 100 |
| Best practices | 100 |
| Performance | 65 |
| CLS | 0 |

Performance is not a verdict: it ran under Lighthouse's simulated slow 4G and 4x CPU slowdown, in a sandbox,
against an uncompressed local server (FCP 4.5 s, LCP 7.6 s, TBT 70 ms). Run it again on the deployed site from a
phone before quoting it. Signed in is faked by `scripts/journal-proof/harness.mjs` (fixtures, an injected
session); `scripts/journal-proof/film.mjs` records the film against it. Build with
`VITE_SUPABASE_URL=http://127.0.0.1:4180`, serve `dist/` on 4173, run the harness on 4180.

## Not done, and why

- **Bottle photos per note (D5)**: costs storage on the free Supabase plan; waiting for the owner's yes.
- **Arabic review** of every new string (all are drafts) and a **VoiceOver / TalkBack pass** on a real phone:
  the owner's.
- The film is 20 seconds, not 30, and is English only.
