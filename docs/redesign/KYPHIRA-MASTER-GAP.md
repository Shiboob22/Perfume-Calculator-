# Kyphira master brief: gap audit

Branch `redesign/kyphira`, fast-forwarded to `main` (`aa1982b`) on 2026-10-18. Owner's call: gap-close, no rework of shipped rooms.

## Phase status against the master brief

| Phase | State | Evidence |
|---|---|---|
| 0 Audit | Done earlier | `AUDIT.md`, `baseline/` (re-measure needed, see below) |
| 1 Design system | Tokens, type, kx components done. No living sheet with specimens | `src/dev/Styleguide.jsx` exists (dev only) |
| 2 Foundation | Done | brand config, i18n, RTL, 301s |
| 3 Motion system | Config and eight primitives exist | `src/motion/` |
| 4 Compounding | Done, flag on | `src/lib/compounding/`, `src/site/compounding/` |
| 5 Six rooms | Built; motion per room mostly not wired | see below |
| 6 QA | Suites green; perf and a11y numbers stale | Playwright 422 pass |
| 7 Handoff | README section, recordings, final report missing | |

## Gaps found

1. **Primitives barely used.** Outside `src/motion/` and `src/dev/`: `Reveal` in `Home`, `GuidesIndex`; `Stagger` in `EmptyState`; `PageTransition` in `App`, `PublicLayout`. No room (Bench, Wardrobe, Library, Atlas, Salon, Nose) imports a primitive. `TextReveal`, `Parallax`, `DrawLine`, `CountUp`, `Pin` have no production use. The brief requires every page to use only the shared primitives.
2. **Homepage v2 keyframes unused.** `kRise`, `kGrow`, `kFade`, `kDrift`, `kPulse` and `.kv` are in `src/index.css` (`c167a96`), no component applies them.
3. **Per-room motion** (brief section 5) not verified: Bench `CountUp` and staggered rows, Wardrobe confirm, Library reading line and glossary popovers, Atlas filter reflow and shared-element detail, Salon follow/review confirm, Nose message rise and Pro gate.
4. **Design-system sheet.** `/dev/design` does not exist; `Styleguide` is a dev screen without side-by-side EN/AR specimens or all component states.
5. **Metrics stale.** Lighthouse and LCP/CLS were last taken before the dark palette, motion and flags went live.
6. **Handoff.** README has no design-system or motion section; no recordings.

## Plan

A. Wire primitives into the six rooms (one commit per room, reduced-motion and RTL checked).
B. Apply Homepage v2 keyframes to the home page.
C. `/dev/design` living sheet.
D. Re-measure bundle, LCP, CLS, Lighthouse a11y; fix regressions.
E. README section, screenshots, recordings, final report.

No production deploy, merge to `main`, migration or flag change without the owner's go-ahead (brief section 9).
