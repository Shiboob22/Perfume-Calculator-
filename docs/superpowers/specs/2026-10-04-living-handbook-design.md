# Phase 9 — An award-level public site: "the living handbook"

## Context

Phase 8 is live (main = `8d25cb2`). Phase 7 made the site distinct but it still reads as a tidy dark template, not a book.

The owner chose:
- **Scope:** the public site first (Home, Guides index, guide pages, Pricing, recipe pages). The app gets the tokens in a later phase.
- **Direction:** editorial atelier, built on the existing Atelier Noir theme.
- **Approach:** the living handbook plus a live bench.
- **Motion:** crafted and light. CSS plus tiny JS, no new UI library.

Goal: a site that feels like opening the printed handbook, with the product shown working in the first screen. Awwwards/CSSDA-grade craft without losing Lighthouse 100, phone speed, RTL or no-JS completeness.

Branch `phase-9-living-handbook` off `main`. The approved design is copied to `docs/superpowers/specs/2026-10-04-living-handbook-design.md` on the branch.

## Design

### 1. Editorial system
Extend `src/lib/theme.js`; don't replace it.
- **Type scale:** display sizes with `clamp()`, a measure of about 66ch, and leading for Cormorant/Space Grotesk/Plex Mono.
- **Book parts:** chapter numeral style, running head, folio, rule weights.
- **Motion tokens:** durations and easing, and one `reducedMotion` switch.
- **Arabic:** the display pairing comes from the existing `src/i18n/arabicFonts.js`.
- **Colours:** the contrast tokens stay as they are (WCAG work from Phase 5).

### 2. Editorial components (`src/site/editorial/`)
- **`ChapterMark`:** the volume and chapter numeral plus a running head, e.g. "III · Formulation".
- **`Folio`:** a page-foot line, e.g. "The Scent Handbook · III · 07".
- **`DropCap`:** Latin only. Arabic gets a heading ornament instead, since Arabic has no drop-cap convention.
- **`MarginNote`:** evidence badges sit in the margin on desktop and inline on phones. The labels are kept on every claim.
- **`Rule`:** hairline and ornament dividers.

Each is small, prop-driven and shared by every public page.

### 3. Live bench hero (`src/site/LiveBench.jsx`)
- **Controls:** a size choice (30 / 50 / 100 mL) and the four named strengths (`STRENGTHS` in `src/lib/formulation.ts`).
- **Numbers:** from `solveBottle` (`src/lib/calc`), so they are the handbook's Quick Reference values. No new maths.
- **Look:**
  - a scale readout with a short digit roll;
  - oil and alcohol pour columns (CSS `transform: scaleY`);
  - the basis line "by weight, 0.95 / 0.81 g/mL".
- **Link:** "Open in calculator" carries the chosen values plus `ref=home`, matching the `calcPrefill` link format.
- **No JS:** the prerendered HTML shows 100 mL at 25% (23.75 / 60.75 / 84.50 g), so the page is complete without JavaScript. Hydration turns on the controls.
- **Home only:** it replaces `WorkedExample` on Home. Sign-in keeps `src/components/WorkedExample.jsx`.

### 4. Pages
- **Home:**
  - live bench hero;
  - "The method in chapters": `MethodSequence` restyled as a contents spread;
  - an evidence-label strip;
  - a pricing teaser;
  - a colophon footer.
- **Guides index:** the book's contents page. Part numerals, page-like rows, Blending and Wearing as parts.
- **Guide page:**
  - a chapter opener (numeral, drop cap, running head);
  - a reading-progress hairline (CSS scroll timeline, behind `@supports`);
  - margin notes;
  - "turn the page" previous/next using the View Transitions API (feature-detected, plain links otherwise).
- **Pricing:** an editorial two-column plan sheet using the existing `PlanCards` data.
- **Recipe pages** (server template `src/lib/recipePage.js`): new type and rules only. Same tokens, no JS.

### 5. Motion (all off under `prefers-reduced-motion`)
- Scroll reveals use CSS scroll-driven animations behind `@supports`; older browsers simply show the content.
- One tiny `useViewTransition` helper wraps public-route navigation.
- No new library, so no justification is needed.

### 6. RTL and content
- Logical CSS properties throughout. Readout numbers stay `dir="ltr"`.
- No new claims, techniques or numbers.
- New labels or headings ship EN and AR together, with the AR text a draft for the owner's review.
- The private-terms guard and the `dist/` scan keep running.

### 7. Budgets (release gates)
- Lighthouse mobile: Accessibility, Best Practices and SEO 100; Performance ≥ 95.
- LCP < 2.0 s; CLS < 0.05.
- Added public JS ≤ 8 KB gzipped.
- axe clean in EN and AR.

## Critical files
- **Changed:**
  - `src/lib/theme.js`
  - `src/site/Home.jsx`, `GuidesIndex.jsx`, `GuidePage.jsx`, `Pricing.jsx`, `MethodSequence.jsx`, `PublicLayout.jsx`
  - `src/lib/recipePage.js`
  - `src/i18n/messages/{en,ar}.js`
- **New:** `src/site/editorial/*`, `src/site/LiveBench.jsx`, `src/site/useViewTransition.js`.
- **Reused as is:** `solveBottle`, `STRENGTHS`, the `calcPrefill` link format, `arabicFonts.js`, `scripts/screenshots.mjs`, the prerender in `scripts/prerender.mjs`.

## Verification
- **Vitest:**
  - LiveBench numbers equal the Quick Reference for 30/50/100 mL × 15/20/25/30% (via `solveBottle`);
  - the hero link builds the right query;
  - the editorial components render in RTL.
- **Playwright:**
  - no-JS Home shows 23.75 / 60.75 / 84.50;
  - choosing 50 mL at 30% updates the readout and the link;
  - guide previous/next works with and without View Transitions;
  - reduced motion turns off the animations;
  - axe clean in EN and AR, at phone and desktop sizes.
- **Before/after screenshots:** `docs/screens/phase-9/` via `scripts/screenshots.mjs`.
- **Preview:** Lighthouse mobile recorded against the budgets; the owner reviews on a phone in EN, then AR.

## Commit sequence (one concern each)
1. Theme tokens.
2. Editorial components.
3. LiveBench, with tests.
4. Home.
5. MethodSequence as a contents spread.
6. Guides index.
7. Guide page opener and margin notes.
8. Reading progress.
9. View transitions.
10. Pricing sheet.
11. Recipe page type.
12. AR polish.
13. e2e and axe.
14. Screenshots and Lighthouse.
15. Docs and release record.

## Out of scope
- The app redesign (next phase, reusing these tokens).
- WebGL and new libraries.
- New handbook copy.
- Award submission: Awwwards and CSSDA need the owner's account and fee.
