# Kyphira motion system — Checkpoint 1: audit and proposed stack

Date 2026-10-16. Source: `main` (HEAD of this branch is in `main`), built with the production flags (`VITE_FLAG_WARDROBE=1`, `VITE_FLAG_NOSE=1`, `VITE_FLAG_COMPOUNDING=1`). No code changed. Brief: `Kyphira_Brief_v4.md`.

## 1. Page inventory

### Public (prerendered, EN at `/…`, AR at `/ar/…`, hydrated)

| Route | Component | Notes |
|---|---|---|
| `/` | `site/Home` | Compounding scene (flag on in production), `LiveBench`, four `.reveal` sections |
| `/pricing` | `site/Pricing`, `PlanCards` | |
| `/library` | `site/GuidesIndex` | `.reveal` per section |
| `/library/:slug` | `site/GuidePage` | 15 guides; reading hairline, drop cap, View Transition between guides |
| `/privacy`, `/terms` | `site/LegalPage` | |
| `*` | `site/NotFound` | |
| `/r/:slug`, `/ar/r/:slug` | `api/recipe.ts` → `lib/recipePage.js` | **Server-rendered plain HTML, no script.** React primitives cannot reach it; CSS only. |
| `/guides…` | redirect to `/library…` | |

### Signed-in app (one lazy chunk, behind `AuthGate`)

| Route | Component | Flag / gate |
|---|---|---|
| `/bench` | `FragranceBlendCalculator` (+ `calc/*`, `BenchCards` result strip) | |
| `/bench/journal` | `Batches`, `journal/*` | check-ins Pro |
| `/app/search` | `PerfumeSearch` | |
| `/app/selector` | `Selector`, `selector/*` | |
| `/app/inventory` | `Inventory` | Pro |
| `/app/ask` | `PerfumerChat` | Pro; kept mounted |
| `/app/account` | `Account` | |
| `/app/cards`, `/app/labels` | `BenchCards`, `Labels` | Pro |
| `/app/bench` | `BenchMode` | full screen, no chrome |
| (first run) | `Onboarding`, sign-in `AuthGate` | |
| `/wardrobe` | `wardrobe/*` (Today, Collection, Lists, Stats, BottleForm, Privacy) | **on in production** |
| `/nose` | `nose/Nose` | **on in production** |
| `/atlas`, `/atlas/*` | `atlas/*` (Search, Browse, ResultList, EntityPage, FragrancePage, Contribute, Review, Pyramid) | flag off |
| `/salon`, `/salon/*` | `salon/*` (Feed, Compose, PostCard, Profile, MyProfile, Moderation) | flag off |
| `/dev/:screen`, `/styleguide` | dev only | `/dev/motion` already exists for the Compounding |

### Shared layout and components

`SiteChrome` (`SiteHeader`, `SiteFooter`), `PublicLayout`, `AppNav` (phone bottom bar + More sheet, wide-screen icon row), `kx/{Button, Card, Chip, Field, FragranceCard, Notice, RenameNotice, ScaleReadout, SmokeField, SmokeLine, KyphiraLogo}`, `EmptyState`, `ErrorBoundary`, `ProLocked`, `WaitlistButton`, `SharePanel`, `site/editorial/*`, `App.jsx` `TabLoading` (plain text "Loading").

**Overlays found:** the More sheet and inline `Notice` (`role=status/alert`). **There is no toast and no modal component.**

## 2. Existing motion

| Where | What | Keep / replace |
|---|---|---|
| `index.css` `.reveal` | `animation-timeline: view()`, 20 px rise, no fade. Used on Home ×4, GuidesIndex. | **Replace.** A view timeline is scrubbed: it plays backwards on scroll-up, which breaks "once, not always". It also has no fade on purpose (see 5.2). |
| `index.css` `.read-progress` | scroll timeline hairline (Library) | Keep, move under the new tokens |
| `index.css` View Transition | root crossfade 320 ms; only guide → guide via `<Link viewTransition>` | Extend to all routes |
| `index.css` global `a, button, summary` | colour transitions 180 ms | Keep, rebase on token (150 ms) |
| `.fill-anim`, `.pour` | 240 ms bar fills (LiveBench) | Keep |
| `.kx-smoke--loading` | 2.4 s line drift | Keep (ambient token) |
| `sheetUp`, `sheetFade` (AppNav) | More sheet enters, **no exit animation** | Keep, add exit |
| Tailwind `animate-pulse` | Search skeleton, chat "thinking", Search spinner text | Replace with the slow shimmer |
| Tailwind `transition-*`, `hover:-translate-y-0.5` | Search cards, Button, AuthGate, AppNav | Fold into card/button states |
| Compounding (`index.css`, `site/compounding/*`, `lib/compounding/*`) | CSS view timelines + 388 B fallback, canvas smoke, palette bands, gradient scale; on in production | **Untouched.** It is the homepage hero the brief asks for. |
| `lib/theme.js` `MOTION` | `{180, 320, 480}` ms | **Third and conflicting duration set** (see below) |

No animation library is installed. Wardrobe, Atlas, Salon, Nose, Account, the Journal, toasts and route changes have no motion at all.

**Three duration scales disagree today:** `theme.js` 180/320/480, `index.css` 180/240, `compounding/config.js` its own. The brief's tokens are 150/250/600/2000. One file must own them.

## 3. Baseline (before any change)

Lab numbers, headless Chrome 4× CPU slowdown, 1.6 Mbps / 150 ms, 375×667 @2×, touch scroll through the whole page, median of 3. Same method as `scripts/compounding-perf.mjs`.

| Page | LCP | CLS | FPS | Frames >20 ms | Long tasks |
|---|---|---|---|---|---|
| `/` | 1.90 s | 0 | 59.7 | 3 | 155 ms |
| `/ar` | 2.04 s | 0 | 60.1 | 1 | 75 ms |
| `/pricing` | 1.66 s | 0 | 60.6 | 0 | 62 ms |
| `/library` | 1.67 s | 0 | 60.1 | 1 | 63 ms |
| `/library/at-the-bench` | 1.83 s | 0 | 59.9 | 1 | 100 ms |
| `/ar/library` | 2.10 s | 0 | 59.6 | 2 | 237 ms |

**Not measured: every app route.** They need a session. Plan: run them through the e2e fake-API harness (`serviceWorkers: "block"`) at checkpoint 2, before and after.

Bytes (gzip), production-flag build:

| Asset | gzip | raw |
|---|---|---|
| First script `index-*.js` (router, i18n, public site, Compounding scene) | 176,743 B | 536,205 B |
| `App-*.js` (lazy; shell, Search, router tabs) | 56,450 B | 203,585 B |
| Calculator / Selector / Batches / Wardrobe / Salon / Atlas / Nose chunks | 14,099 / 13,986 / 10,046 / 8,029 / 8,025 / 6,638 / 1,904 B | |
| `index-*.css` | 10,869 B | 49,356 B |
| All JS chunks / CSS | 321,769 B / 12,054 B | |

Gaps in this baseline: Chrome only (WebKit is on this Mac through `pw.webkit.config.js`; Firefox is not), software rendering (a mid-range phone is untested), no field data.

## 4. Proposed stack: no library

Rule from the brief: CSS first, a library only where CSS cannot do it. After reading the code, **nothing in the brief needs one.** Cost of the whole layer is estimated, not built: ~3 KB gzip JS, ~2 KB gzip CSS, to be reported at checkpoint 2.

| Need | Mechanism | Why not a library |
|---|---|---|
| Tokens | `src/lib/motion/config.js` (plain data, like `compounding/config.js`), emitted as `:root` custom properties; `theme.js MOTION` re-exports it | one source |
| `Reveal`, `Stagger`, `DrawLine`, `TextReveal` | one shared `IntersectionObserver`, fires once, toggles an attribute; CSS transition on `transform`/`opacity`; stagger = `--i` × step in CSS | scroll-driven timelines replay on scroll-up, so they cannot be "once" |
| `Parallax`, `Pin`, reading progress | CSS scroll/view timelines (`@supports`), static fallback (no JS fallback; parallax is not worth 388 B on old browsers) | |
| `CountUp` | ~40-line `requestAnimationFrame` tween writing text; final value is in the DOM at frame 0 | |
| `PageTransition` | React Router `viewTransition` (already used by `GuidePage`) + `::view-transition-*`. Header and footer get `view-transition-name`, so they sit out of the root crossfade. Fallback: 250 ms fade-in keyed on the location. | |
| Active-room indicator slide | `view-transition-name` on the active item's underline; the browser morphs it between routes | no measuring code |
| Atlas shared-element expand | name set on the clicked card only (never 100 names), then the same View Transition | |
| Skeletons | CSS gradient sweep on a pseudo-element, `transform` only | |
| Nose thinking smoke | reuse the pure `lib/compounding/smoke.js` + a small canvas; draws only while busy | cost to be measured, it joins the Nose chunk |
| Text reveal in Arabic | split on word boundaries only; never letters. Line/whole-heading mask for long headings. | |
| RTL | one `--dir` variable (1 / -1) on `<html>`; every X movement multiplies by it; logical properties elsewhere | |

**Flag.** New flag `motion` in `lib/flags.js` (off in production until you say). The layer is attribute-driven: `<html data-motion>`; every new rule is scoped under `html[data-motion]`; primitives render plain children when it is off. Off = today's behaviour exactly (the old `.reveal`, the 180 ms hovers). Compounding keeps its own flag.

**Reduced motion.** One block turns the whole layer off: Reveal items are simply visible (no hidden state), no route transition, pins and parallax become static layouts, count-ups show the final value. This is the instant option in the brief.

**Low power.** Reuse `lowPower()` (Save-Data or ≤4 cores): no canvas smoke, no parallax.

**Prerender safety.** Server HTML is always the fully visible page. After hydration, only elements **below the fold** get a hidden state, and above-fold elements never fade (so the LCP element never animates and no-JS readers see everything).

**`/dev/motion`.** Extend the existing page (reduced / low-power switches, progress and fps readout, `forceMotion()`) with an RTL switch, a primitives sheet and the token table.

## 5. Where the brief and the codebase disagree (needs your call)

1. **CountUp on the Bench vs. your earlier rule.** The design-brief pass states "calculator figures never animate". The new brief asks for `CountUp` on results *and* "no motion that delays reading a number". Both cannot hold. Options: (a) Bench figures commit instantly and `CountUp` is used only for stats (Wardrobe stats, Salon counts, Atlas counts, Journal pattern) — **recommended**; (b) a 250 ms count on the result strip only; (c) as written.
2. **"Fade and rise" vs. the contrast failure.** `.reveal` has no fade because an on-fold section sat half-transparent and failed contrast on 393×659 phones (QA audit). The new `Reveal` fades, but only below the fold, and an axe run at mid-animation will gate it. If you want zero risk: movement only, as today.
3. **Nose is not a chat.** It is one question → catalog results (`nose/Nose.jsx`). "Messages stream in" has no target. Proposal: results enter staggered (`FragranceCard` list), the `shelf` block settles in after, the thinking smoke runs while `busy`.
4. **No Library glossary popovers exist.** The glossary is a section of `GuidePage`, not term popovers. Either animate the section's expand, or build popovers (a feature, not motion).
5. **Salon has no "review" action.** Reviews live in the Atlas (`atlas/Review.jsx`); Salon has follow, report, compose. Confirm animations go on follow, post, report.
6. **No toast component.** Adding one is a new UI primitive. Proposal: no toast; success/error animate in place through `Notice` and a per-action confirm (check mark draw, row settle). Say if you want a real toast region.
7. **Atlas and Salon are off in production**, and signed-in only. Checkpoint 4 screenshots for them need staging data and `?flag=atlas`/`?flag=salon`; the Salon needs the staging `salon_isolation` data.
8. **Branch.** The brief says `redesign/kyphira`. That branch is already in `main`. I will branch `redesign/motion` from `main` unless you object. Nothing is merged or deployed without your go-ahead.
9. **Theme.** The brief says "warm dark stone", but light is the default (your design-brief decision). Motion will be checked in both themes; the dusk shift stays inside the Compounding.
10. **Visual baselines.** Rebasing hover and fill timings (180 → 150 ms, 240 → 250 ms) changes no screenshot, but entrance states do. Snapshot baselines (macOS) will need regenerating at the end; the Playwright specs already run with reduced motion where it matters.

## 6. Plan for the next checkpoints

- **2.** `lib/motion/config.js`, the eight primitives, `html[data-motion]` CSS, header settle, nav indicator, sheet exit, route transition + fallback, interactive-state tokens, skeleton/empty/confirm states, flag, `/dev/motion`, unit tests (tokens, RTL sign, once-only, reduced), axe at mid-animation. Report with bytes and the same LCP/CLS/fps table.
- **3.** Home below the hero, Bench, Wardrobe.
- **4.** Library, Atlas, Salon, Nose, auth/account/rest, final performance pass, WebKit run.
