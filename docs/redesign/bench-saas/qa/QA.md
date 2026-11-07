# Bench SaaS: final QA (Phase 8, 2026-11-06)

No new features in this phase. Built from `redesign/kyphira`, served as
production (`scripts/serve-dist.mjs`) with a fake session and API.

## Automated

| Check | Result |
|---|---|
| Vitest | 906 passed |
| Calc coverage (`src/lib/calc`) | 100 % lines, branches, functions, statements |
| ESLint | 0 errors (4 older warnings) |
| Typecheck (`api/`, `src/`) | clean |
| Playwright, phone + desktop (visual baselines excluded: macOS renders, skipped in CI) | 478 passed, 50 skipped |
| Accessibility, `e2e/a11y-bench-saas.spec.js` (axe, WCAG 2.2 A/AA) | 32 passed, **0 violations of any impact** |

The axe pass covers, in EN and AR, light and dark: the Bench (Simple, then
Blend with two materials), the upgrade sheet, Pour along (prepare, tare, a
material's pour), the Journal room and each of the tour's six stops (the
card, plus the Pour along preview inside the Bench).

## Manual checklist

Screens in `screens/`, named `<screen>-<desktop|phone>-<en|ar>-<light|dark>.png`
(40). Each was looked at for: layout and overflow at the width, RTL mirroring
and Arabic shaping, both themes' contrast, the LCD/scale display, focus and
dialog state.

| Screen | Desktop EN | Desktop AR | Phone EN | Phone AR | Light | Dark | Notes |
|---|---|---|---|---|---|---|---|
| Bench | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Pinned LCD bar on phones; "Take the tour" under the heading |
| Pour along (a material) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Next stays disabled until the reading is within 1 % |
| Journal room | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | |
| Upgrade sheet | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Bottom sheet on phones; prices are placeholders |
| Tour (first stop) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Card beside the target on desktop (left first in RTL), at the bottom on phones |

## Known, not fixed here (no new features)

- Arabic readout rows show their units in the wrong order; "Copy recipe" is untranslated in Arabic (both older than this round).
- BenchMode's step names overlap between about 560 and 640 px wide (older; the tour widens its preview to avoid it).
- On phones in Arabic, Pour along's header sits a few pixels under the top edge after a step change (focus moves to the step title).
