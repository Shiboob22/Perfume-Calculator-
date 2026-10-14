# Phase 2 — Re-skin to parity

Branch `redesign/kyphira-p2-reskin` (off `redesign/kyphira-p1-brand`). No new features.

## Decisions taken (Phase 1 open questions, answered 2026-10-14)
1. **Mark: A** (censer with smoke that rises as a K). It is the only direction that is both a vessel and a letter, as the brief asks; B is close to the old flacon, C is a plain K. It is now the header, footer, sign-in, favicon, app icon and social-card mark. B and C stay in the styleguide.
2. **Supabase Auth redirect URLs** (`/bench`, `/bench/journal`): owner-side, I cannot change Auth settings. Sign-in falls back to `/app`, so nothing breaks before it is done.
3. **Arabic:** كيفيرا, the Arabic tagline and the notice text ship as drafts, flagged for your review (the Arabic spelling is also what the Arabic social cards show).
4. **Old service workers:** harmless; the app opens at `/app/calculator`, only the 301 is skipped, and it clears on the next worker update.
5. **Header tagline:** the header keeps "Every drop, weighed with care." until the Wardrobe and Atlas ship; the new line stays in `src/brand.js`.

## What changed
- **Type is live:** Fraunces (optical-size axis, upright and italic) for display and voice; Inter Tight for the interface; IBM Plex Mono for numbers (unchanged). Arabic: IBM Plex Sans Arabic (UI) and Amiri (display), loaded only in Arabic. Poppins, Lora and Tajawal are no longer loaded. Preloads updated; the hero headline is Fraunces, `TYPE.display`/`title` now serif.
- **Mark:** direction A everywhere (`FlaconMark` now draws it, so every call site follows), `public/icon.svg` and the inline favicon, manifest `start_url` `/bench`, and the ten recipe preview images regenerated in the new faces with the new mark (`npx vite-node scripts/make-og-images.mjs`).
- **Hero smoke field:** `SmokeField` (Canvas 2D, about 2 KB, no library): six slow ribbons that lean toward the pointer and lift with scroll. One still frame under `prefers-reduced-motion`; stops off-screen and in background tabs; `aria-hidden`; theme-aware (resin colour from the palette). Geometry is pure and tested (`src/lib/smoke.js`).
- **Pages:** Home, Pricing, Library, guides, legal, sign-in, the Bench (calculator, journal) and the rest of the app pick up the new type, tokens and mark through the shared system; no layout or copy changes.
- **Visual regression:** `e2e/visual.spec.js` snapshots every public page (home, pricing, library, a guide, privacy, terms, 404) in English and Arabic (right to left), light and dark, on phone, plus the three entry pages on desktop: 34 baselines in `e2e/__screenshots__/` (7 MB). They are macOS renders: **CI skips them** unless `VISUAL=1`; Linux baselines come from a CI run in Phase 8.

## Numbers
- JS on home: 143.9 KB gzipped (budget 170 KB), up 1.4 KB for the field.
- Fonts above the fold: Fraunces 67 KB + italic 82 KB, Inter Tight 45 KB, Plex Mono 15 KB, all preloaded (about 100 KB more than Poppins + Lora).
- Local trace, mobile, 4× CPU, Fast 4G: LCP 218 ms (was 195 ms), CLS 0.00 (was 0.00). Local server, so not a substitute for the Vercel preview run.
- Lighthouse mobile, `/`: Accessibility 100, Best Practices 100, SEO 100.

## Not done
Calculator results as a full "scale display" and a re-drawn Pricing/Library layout (the system is applied, the pages were not redesigned: "parity" held to); app-screen screenshots for a before/after (use `node scripts/screenshots.mjs`); the Vercel preview run for real LCP/INP; shared-recipe page snapshots (server-rendered by a function the local server doesn't run).
