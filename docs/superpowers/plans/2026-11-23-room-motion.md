# Room Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One signature GSAP scene per app room, plus Lenis smooth scrolling in the reading rooms, behind a new `roommotion` flag, with no cost to public pages or the first script.

**Architecture:** A shared kit in `src/motion/gsap/` lazy-loads GSAP (core, ScrollTrigger, Flip) only when motion is allowed; `useRoomScene` runs a room's plain `build(ctx)` function inside `gsap.context` + `gsap.matchMedia`, and `useFlipList` animates list reorders. Each room owns a `scene.js`. Lenis gains a route allowlist and runs on `gsap.ticker` when GSAP is present.

**Tech Stack:** React 18, Vite 5, `gsap@3.13.0` (free, plugins included), `lenis@1.3.26` (installed), Vitest 3, Playwright.

**Spec:** `docs/plans/2026-11-23-room-motion-design.md`

**Spec correction (found while planning):** The Library (`/library`, `/library/:slug`) is a prerendered public page (`src/site/GuidesIndex.jsx`, `src/site/GuidePage.jsx`), not an app room. Decision 2 forbids GSAP on public pages, so the Library gets **no GSAP scene**: it gets Lenis only (public pages may load Lenis on demand, as home does), and its reading hairline stays the existing CSS `.read-progress`. The spec's Library row is dropped; everything else stands. Report this to the owner at handoff.

## Global Constraints

- Only `transform` and `opacity` move (GSAP props allowed: `x`, `y`, `xPercent`, `yPercent`, `scale`, `scaleX`, `scaleY`, `rotation`, `opacity`). Rotation at most 1 degree.
- Durations and eases come from `TOKENS` in `src/motion/config.js` (fast 150, base 250, slow 600, ambient 2000 ms; `out` `cubic-bezier(.22,1,.36,1)`, `inOut` `cubic-bezier(.65,0,.35,1)`; stagger step 60 ms, max 8; word 40 ms, max 14 words). No literal ms in scene files.
- Nothing bounces (no `back`, `elastic`, `bounce` eases). Entrances fire once.
- Whatever is on the first screen when a room mounts is never hidden: scenes animate elements below the fold, or on user changes.
- Calculator figures, `kx/ScaleDisplay`, `kx/benchClock`, `kx/Flacon` and hero3d are not touched.
- Hidden start states only via GSAP inside the context; never in CSS.
- GSAP loads only if `motionOn() && flagOn("roommotion") && !reduced() && !lowPower()`; never in `assets/index-*.js` or anything a prerendered HTML preloads; chunk at most 40 KB gzip.
- Lenis: reading rooms only (`/library*`, `/atlas*`, `/salon*`, `/wardrobe`, `/nose`, plus `/ar/` forms), wide screens (`min-width: 1024px`) with `(pointer: fine)`; phones native everywhere; home keeps its own call.
- RTL: every x move multiplied by `ctx.dir` (1 or −1). Whole-word reveals only (`splitWords`); no SplitText.
- `aria-live` text is never animated; focus never moves during a scene.
- One commit per task, message style `motion: …`, ending with the Co-Authored-By line.

## Review Focus

1. **Reduced motion switched on mid-session** while a room is open: every tween reverts and the room looks static. Test in Task 2.
2. **Rapid re-sorts** (clicking sort chips faster than the Flip finishes): the final DOM order and visible order match, no element left offset. Test in Task 5.
3. **Chunk fails to load** (offline, stale service worker): room renders normally, no thrown error, one log. Test in Task 1.
4. **A `<dialog>` sheet opened in a Lenis room**: wheel scrolls the sheet, not the page behind. Test in Task 4.
5. **Route change mid-tween** (leave a room during an entrance): no ScrollTrigger left alive, no console error. Test in Task 2 (unmount reverts) and Task 13 (e2e).

---

### Task 1: Flag, loader and eases

**Files:**
- Modify: `src/lib/flags.js` (add `"roommotion"` to `FLAGS`; update the header comment)
- Create: `src/motion/gsap/load.js`, `src/motion/gsap/ease.js`
- Test: `src/motion/gsap/load.test.js`, `src/motion/gsap/ease.test.js`
- Modify: `package.json` (`gsap` `3.13.0` exact in dependencies)

**Interfaces:**
- Produces: `gsapAllowed({ on, flag, isReduced, low }?): boolean` (defaults read `motionOn()`, `flagOn("roommotion")`, `reduced()`, `lowPower()`); `loadGsap({ importer?, report? }?): Promise<{ gsap, ScrollTrigger, Flip } | null>` (cached; `importer` injectable for tests); `registerEases(gsap): void` registering `"kx.out"` and `"kx.inOut"` via `CustomEase`-free `gsap.parseEase` of a cubic-bezier function built from `TOKENS.ease`; `cubicBezier(x1, y1, x2, y2): (t: number) => number`; `parseBezier(str): [number, number, number, number]`.

- [ ] **Step 1: Write failing tests**

`load.test.js`:
- `gsapAllowed` false when any of on/flag false, isReduced true, low true; true only with on, flag, !isReduced, !low.
- `loadGsap` resolves `null` and never calls `importer` when not allowed.
- When allowed, calls `importer` once across two `loadGsap()` calls (same promise).
- When `importer` rejects, resolves `null` and calls the injected `report` once (`loadGsap({ importer, report })`); a second failure in the same session does not report again.

`ease.test.js`:
- `parseBezier(TOKENS.ease.out)` equals `[0.22, 1, 0.36, 1]`; `parseBezier(TOKENS.ease.inOut)` equals `[0.65, 0, 0.35, 1]`.
- `cubicBezier(...parseBezier(TOKENS.ease.out))` returns 0 at 0, 1 at 1, and is within 0.01 of 0.877 at t = 0.5 (check the actual value once and pin it).
- `registerEases(stub)` calls `stub.registerEase` with `"kx.out"` and `"kx.inOut"`.

- [ ] **Step 2: Run** `npx vitest run src/motion/gsap` — FAIL (modules missing).
- [ ] **Step 3: Implement.** `npm i gsap@3.13.0 --save-exact`. The default importer is `() => Promise.all([import("gsap"), import("gsap/ScrollTrigger"), import("gsap/Flip")])`; register plugins and eases once after load. The default `report` posts `{ kind: "gsap-load" }` through the existing client error reporter used by `ErrorBoundary` (`/api/log`). `cubicBezier` solves x for t by Newton iterations (8) with bisection fallback.
- [ ] **Step 4: Run** `npx vitest run src/motion/gsap src/lib/flags` — PASS.
- [ ] **Step 5: Commit** `motion: roommotion flag and a lazy GSAP loader with the token eases`.

### Task 2: `useRoomScene` and `useFlipList`

**Files:**
- Create: `src/motion/gsap/useRoomScene.js`, `src/motion/gsap/useFlipList.js`, `src/motion/gsap/testing.js`, `src/motion/gsap/index.js`
- Modify: `src/motion/gsap/load.js` (add `__setGsapForTests(mod | null)`)
- Test: `src/motion/gsap/hooks.test.jsx`

**Interfaces:**
- Consumes: `loadGsap()` (Task 1).
- Produces:
  - `useRoomScene(ref: RefObject<Element>, build: (ctx) => void | (() => void), deps?: any[]): void` where `ctx = { gsap, ScrollTrigger, Flip, tokens: TOKENS, dir: 1 | -1, root: Element, s: (ms) => number }` (`s` converts ms to seconds). Runs inside `gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", …)` scoped to `root`; reverts on unmount and on deps change.
  - `useFlipList(ref: RefObject<Element>, key: unknown, selector = "[data-flip]"): void` — `Flip.getState` in a layout effect before commit of a changed `key` (capture during render via a ref, play in `useLayoutEffect`), then `Flip.from(state, { duration: s(base), ease: "kx.out", absolute: false, nested: true })`. Kills an in-flight Flip before starting the next.
  - `stubGsap(): { gsap, Flip, ScrollTrigger, calls: Array<{ fn, targets, vars }> }` and `assertSceneRules(calls): void` (throws on a prop outside the Global Constraints list, a rotation over 1, an ease outside `kx.out` / `kx.inOut` / `"none"`, or a duration not equal to a token in seconds or a token × stagger).
  - `index.js` re-exports all of the above.

- [ ] **Step 1: Write failing tests** (`hooks.test.jsx`, React Testing Library + the stub injected via a `__setGsapForTests(mod | null)` export in `load.js`):
  - With GSAP `null`: `build` is never called; `useFlipList` does not throw on key change.
  - With the stub: `build` receives `dir === -1` when `document.documentElement.dir === "rtl"`, else `1`; `ctx.s(600) === 0.6`.
  - Unmount calls the matchMedia's `revert` once.
  - **Review Focus 1:** firing the reduced-motion media query `change` to `reduce` calls `revert`.
  - `assertSceneRules` throws on `{ width: 10 }`, `{ rotation: 2 }`, `{ ease: "back.out" }`, `{ duration: 0.3 }`; passes on `{ y: 16, opacity: 0, duration: 0.6, ease: "kx.out" }`.
- [ ] **Step 2: Run** `npx vitest run src/motion/gsap/hooks.test.jsx` — FAIL.
- [ ] **Step 3: Implement** the two hooks and `testing.js` with the signatures above.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `motion: useRoomScene and useFlipList, with a scene-rules test helper`.

### Task 3: Bundle guard and service worker

**Files:**
- Modify: `scripts/check-bundle.mjs` (after the three.js block), `scripts/build-sw.mjs:25`

**Interfaces:**
- Consumes: built `dist/`.
- Produces: build fails if GSAP (match `/GreenSock|gsap\.registerPlugin|_gsScope/`) is in any preloaded script (same `preloaded` set as three.js); fails if any chunk containing GSAP exceeds 40 × 1024 bytes gzipped (`zlib.gzipSync`). `globIgnores` adds the GSAP chunk pattern (name the chunk via `/* @vite-ignore */`-free `import()`; set `build.rollupOptions.output.manualChunks` in `vite.config.js` so `gsap` lands in `assets/gsap-*.js`, then ignore `"assets/gsap-*.js"`).

- [ ] **Step 1:** Temporarily add `import "gsap"` to `src/main.jsx`, run `npm run build && node scripts/check-bundle.mjs` — expect FAIL naming the entry file. Remove the import.
- [ ] **Step 2:** Run `npm run build && node scripts/check-bundle.mjs` — PASS; print the gsap chunk's gzip size and record it in the commit message (spec open item 1).
- [ ] **Step 3: Commit** `motion: keep GSAP out of up-front scripts and the SW precache (N KB gzip)`.

### Task 4: Lenis allowlist and ticker sync

**Files:**
- Modify: `src/motion/smooth.js`, `src/motion/useSmoothScroll.js`, `src/App.jsx` (call the room hook), `src/site/GuidesIndex.jsx`, `src/site/GuidePage.jsx`, `src/components/kx/Sheet.jsx`, `src/components/tour/BenchTour.jsx`
- Test: `src/motion/smooth.test.js`

**Interfaces:**
- Produces: `roomSmoothAllowed(pathname: string, { wide?: boolean, fine?: boolean, ...smoothAllowed args }): boolean`; `SMOOTH_ROUTES: RegExp` = `/^(\/ar)?\/(library|atlas|salon)(\/|$)|^(\/ar)?\/(wardrobe|nose)$/`; `useSmoothScroll({ pathname?: string })` — with `pathname` it runs only when `roomSmoothAllowed`; `pauseSmooth(): () => void` (stops the live Lenis, returns resume; counts nested pauses). `startSmoothScroll` drives Lenis from `gsap.ticker` (with `lagSmoothing(0)`) when a loaded GSAP module is already cached, else its own rAF.

- [ ] **Step 1: Write failing tests:** `roomSmoothAllowed` true for `/atlas/x`, `/ar/salon`, `/library/some-guide`, `/wardrobe`, `/nose`; false for `/bench`, `/journal`, `/app/account`, `/wardrobex`; false when `wide` or `fine` is false. `pauseSmooth` twice then one resume keeps it paused; both resumes restart it.
- [ ] **Step 2: Run** `npx vitest run src/motion/smooth.test.js` — FAIL.
- [ ] **Step 3: Implement.** `wide`/`fine` default from `matchMedia("(min-width: 1024px) and (pointer: fine)")`. `App.jsx` calls `useSmoothScroll({ pathname })` (re-run on pathname change). Library pages call `useSmoothScroll({ pathname })` too. `Sheet.jsx` calls `pauseSmooth()` on open, resume on close. `TourLayer` does the same while shown. Lenis option `prevent: (node) => node.closest("dialog")` so wheel inside a sheet stays native (**Review Focus 4**).
- [ ] **Step 4: Run** `npx vitest run src/motion` — PASS (existing `smooth.test.js` cases still pass).
- [ ] **Step 5: Commit** `motion: Lenis in the reading rooms on wide screens, paused under sheets and the tour`.

### Task 5: List Flips (Journal, Batches, Search)

**Files:**
- Modify: `src/components/journal/JournalRoom.jsx` (batch list), `src/components/Batches.jsx`, `src/components/PerfumeSearch.jsx`
- Create: `src/components/journal/scene.js`
- Test: `src/components/journal/scene.test.js`, extend `e2e/journal-room.spec.js`

**Interfaces:**
- Consumes: `useFlipList`, `useRoomScene`, `stubGsap`, `assertSceneRules` (Task 2).
- Produces: `data-flip` on each list row (`data-flip-id` = batch id / fragrance id). Journal `scene.js` exports `noteSaved(ctx, dotEl): void` — the milestone dot `scale` 0 → 1 over `slow`, `kx.out`.

- [ ] **Step 1: Write failing tests:** `scene.test.js` — `noteSaved` on the stub passes `assertSceneRules` and tweens only `scale`. e2e (**Review Focus 2**): with `?flag=motion&flag=roommotion`, click Newest, Size, Maceration within 300 ms; after 1 s the visible row order (by `boundingBox().y`) equals the DOM order, and every row's computed `transform` is `none`.
- [ ] **Step 2: Run** both — FAIL.
- [ ] **Step 3: Implement.** Journal `key` = `${sort}:${dir}`; Batches `key` = its filter; Search `key` = result ids joined.
- [ ] **Step 4: Run** `npx vitest run src/components/journal && npx playwright test e2e/journal-room.spec.js` — PASS.
- [ ] **Step 5: Commit** `motion: Flip reorders in the Journal, Batches and Search lists`.

### Task 6: Bench

**Files:** Modify `src/components/calc/BlendEditor.jsx`, `src/components/calc/StrengthTiers.jsx`, `src/components/FragranceBlendCalculator.jsx` (the "Logged as No." line near `:334`); Create `src/components/calc/scene.js`, `src/components/calc/scene.test.js`.

**Interfaces:**
- Produces: `rowIn(ctx, el)` (y `distance.s` → 0, opacity 0 → 1, `base`), `rowOut(ctx, el): Promise<void>` (reverse, resolves on complete; component removes the row after), `tierRing(ctx, ring, target)` (`Flip.fit(ring, target, { duration: s(base), ease: "kx.out" })`), `stamp(ctx, el)` (scale 1.04 → 1 and opacity 0 → 1, `slow`; no bounce).

- [ ] **Step 1: Write failing tests:** each function on the stub passes `assertSceneRules`; `rowOut` resolves when the stub's `onComplete` fires; without GSAP (`ctx` null) the component removes the row immediately (component-level test in `BlendEditor` via RTL).
- [ ] **Step 2: Run** `npx vitest run src/components/calc` — FAIL.
- [ ] **Step 3: Implement.** No change to any figure, `ScaleDisplay`, `Flacon` or `benchClock` import.
- [ ] **Step 4: Run** `npx vitest run src/components/calc && npx playwright test e2e/bench-saas.spec.js e2e/bench-motion.spec.js` — PASS.
- [ ] **Step 5: Commit** `motion: Bench blend rows, tier ring and the logged stamp`.

### Task 7: Wardrobe

**Files:** Modify `src/components/wardrobe/Collection.jsx`, `src/components/wardrobe/Today.jsx`; Create `src/components/wardrobe/scene.js`, `scene.test.js`.

**Interfaces:** `data-flip` on grid items (`useFlipList` key = active filters); `answerWords(ctx, words: Element[])`: y `distance.s` → 0, opacity → 1, `slow`, stagger `tokens.stagger.word` ms, capped at `maxWords` (words past 14 shown at once). Words come from `splitWords` rendered as `<span>` with `aria-hidden` and the full sentence in an sr-only span.

- [ ] **Step 1: Write failing tests:** `answerWords` with 20 elements tweens 14 and sets the other 6 visible; RTL leaves x untouched (it moves y only); `assertSceneRules` passes.
- [ ] **Step 2–4:** run `npx vitest run src/components/wardrobe` FAIL → implement → PASS, plus `npx playwright test e2e/wardrobe.spec.js`.
- [ ] **Step 5: Commit** `motion: Wardrobe grid regroup and the Tonight answer`.

### Task 8: Atlas

**Files:** Modify `src/components/atlas/Pyramid.jsx`, `src/components/atlas/Browse.jsx`, `src/components/atlas/ResultRow.jsx`, `src/components/atlas/FragrancePage.jsx`; Create `src/components/atlas/scene.js`, `scene.test.js`.

**Interfaces:** `pyramidDraw(ctx, bands: Element[])`: `scaleX` 0 → 1 from inline start (`transformOrigin` left, or right when `dir === -1`), top → middle → base, ScrollTrigger `start: "top 88%"`, `once: true`, `slow` with `step` stagger; skipped (left as is) for bands already in the first screen at mount. `cardToPage`: on result click store `Flip.getState(card)` in a module-level `pendingCardState`; `FragrancePage` on mount `Flip.from(pendingCardState, { targets: heroEl, duration: s(slow), ease: "kx.inOut" })` then clears it. Results list uses `useFlipList` (key = filter chips).

- [ ] **Step 1: Write failing tests:** `pyramidDraw` uses `transformOrigin` ending in `right` when `dir === -1`; uses `once: true`; never tweens `width`; skips bands whose `getBoundingClientRect().top < innerHeight` at call time.
- [ ] **Step 2–4:** `npx vitest run src/components/atlas` FAIL → implement → PASS, plus `npx playwright test e2e/atlas*.spec.js`.
- [ ] **Step 5: Commit** `motion: Atlas pyramid draw, result reorders and card to page`.

### Task 9: Salon

**Files:** Modify `src/components/salon/Feed.jsx`, `src/components/salon/Compose.jsx`; Create `src/components/salon/scene.js`, `scene.test.js`.

**Interfaces:** `pagesIn(ctx, selector = "[data-page]")`: `ScrollTrigger.batch` with `once: true`, each page y `distance.m` → 0, rotation `0.6 * dir` → 0, opacity 0 → 1, `slow`, stagger `step`, `max`; pages on the first screen untouched. `composeIn(ctx, el)`: y `distance.l` → 0, `base`.

- [ ] **Step 1: Write failing tests:** rotation is `0.6` with `dir 1`, `-0.6` with `dir -1`; `assertSceneRules` passes; batch uses `once: true`.
- [ ] **Step 2–4:** `npx vitest run src/components/salon` FAIL → implement → PASS, plus `npx playwright test e2e/salon*.spec.js`.
- [ ] **Step 5: Commit** `motion: Salon notebook pages and the composer`.

### Task 10: Nose

**Files:** Modify `src/components/nose/Nose.jsx` (shelf and match cards; the existing thinking dots stay); Create `src/components/nose/scene.js`, `scene.test.js`.

**Interfaces:** `matchesIn(ctx, cards: Element[])`: per card y `distance.s` → 0 and opacity, then its `[data-accord]` bars `scaleX` 0 → 1 (origin by `dir`), cards staggered `step` up to `max`, all `slow`. The answer's `aria-live` region is outside the animated elements.

- [ ] **Step 1: Write failing tests:** bars tween only `scaleX`; at most 8 stagger steps for 12 cards; no target is inside an `[aria-live]` element (fixture DOM).
- [ ] **Step 2–4:** `npx vitest run src/components/nose` FAIL → implement → PASS, plus `npx playwright test e2e/nose*.spec.js`.
- [ ] **Step 5: Commit** `motion: Nose matches and accord bars`.

### Task 11: Selector

**Files:** Modify `src/components/Selector.jsx`, `src/components/selector/Results.jsx`; Create `src/components/selector/scene.js`, `scene.test.js`.

**Interfaces:** `stepChange(ctx, outEl, inEl, forward: boolean)`: out to `xPercent: -8 * dir * (forward ? 1 : -1)` and opacity 0, in from the mirror, `base`, `kx.inOut`; focus is set by the component (existing behaviour), not the scene. `progressTo(ctx, bar, ratio)`: `scaleX` to ratio, `base`. `resultsIn(ctx, rows)`: rank order, stagger `step`, `max`.

- [ ] **Step 1: Write failing tests:** `stepChange` signs flip with `dir` and with `forward`; `progressTo` tweens `scaleX` only.
- [ ] **Step 2–4:** `npx vitest run src/components/selector` FAIL → implement → PASS, plus `npx playwright test e2e/selector.spec.js`.
- [ ] **Step 5: Commit** `motion: Selector steps, progress and ranked results`.

### Task 12: Account

**Files:** Modify `src/components/Account.jsx`; Create `src/components/account.scene.js`, `account.scene.test.js`.

**Interfaces:** `accountIn(ctx)`: plan meter fill `scaleX` 0 → value (origin by `dir`), ruled section rules `scaleX` 0 → 1, `slow`, only for elements below the first screen at mount.

- [ ] **Step 1–4:** test (`scaleX` only, first-screen skip) FAIL → implement → PASS, plus `npx playwright test e2e/account*.spec.js`.
- [ ] **Step 5: Commit** `motion: Account plan meter and ruled sections`.

### Task 13: End-to-end spec, recordings and docs

**Files:**
- Create: `e2e/room-motion.spec.js`, `docs/redesign/room-motion/` (recordings, REPORT.md)
- Modify: `docs/redesign/MOTION-SPEC.md` (interaction table rows for each scene), `CLAUDE.md` (Current phase entry: branch, flag off in production, Library correction, chunk size), `src/lib/flags.js` header comment if not done in Task 1

**Interfaces:** Consumes all earlier tasks.

- [ ] **Step 1: Write the spec** — for each of `/bench`, `/journal`, `/wardrobe`, `/atlas`, `/salon`, `/nose`, `/app/selector`, `/app/account` (and `/ar/…` where routed), at 375 and 1440 with `?flag=motion&flag=roommotion` on the fake API used by the existing room specs:
  - no console errors; first-screen elements have computed opacity 1 at `domcontentloaded`;
  - with `reducedMotion: "reduce"`: no request matching `/assets\/gsap-/`;
  - 1440 `/atlas`: `html.lenis` present; `/bench`: absent; 375 `/atlas`: absent; open a `Sheet` on `/atlas` → `html.lenis-stopped` present;
  - **Review Focus 5:** start on `/atlas`, navigate to `/bench` within 200 ms of load; no console error and `window.ScrollTrigger?.getAll().length` is 0 (expose `ScrollTrigger` on `window` only in dev builds — otherwise assert no error only).
- [ ] **Step 2: Run** `npm run build && npx playwright test e2e/room-motion.spec.js` — PASS. Then the full suite `npm run e2e` (flag off): no new failures; visual baselines unchanged.
- [ ] **Step 3: Run** `npm run lint && npm run typecheck && npx vitest run` — all green.
- [ ] **Step 4:** Record EN/AR webm per room with the flags on into `docs/redesign/room-motion/recordings/`; write `REPORT.md` (what each room does, chunk size, Library correction, open feel items).
- [ ] **Step 5: Commit** `motion: room motion e2e, recordings and docs`. Push the branch; the owner reviews the Vercel preview with `?flag=motion&flag=roommotion`. `VITE_FLAG_ROOMMOTION` is not set in production.
