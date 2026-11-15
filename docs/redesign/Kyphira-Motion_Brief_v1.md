# Kyphira motion: plan to make the whole product move at award level

Draft v1, 2026-11-15. For the owner's review. Nothing here is built.

## 1. Where motion is today

What exists and works:

- **A token set.** 150 / 250 / 600 / 2000 ms, one ease-out, one ease-in-out, pinned by tests (`src/motion/config.js`, `index.css`).
- **A public-site layer** (`src/motion/`, flag `motion`, on): scroll reveals, word reveals, Lenis smooth wheel on the home page, page turns between guides (View Transitions).
- **Two showpieces.** The Compounding scroll scene (on) and the 3D pour hero (built, flag off).
- **Two app rooms with real motion.** The Bench (LCD roll, flacon pour, one clock) and the Journal (curve draw, timeline fill, saved-note settle).
- **Reduced motion** is respected everywhere it was checked. Low-power phones drop the heavy parts.

What stops it being award-level, in order of harm:

1. **The app is mostly still.** Outside the Bench and the Journal, rooms (Search, Nose, Wardrobe, Atlas, Salon, Library, Inventory, Account, Orders, Shop) change state with no movement. Things appear and disappear. A list re-sorts by jumping.
2. **No continuity between screens.** Tapping a batch, a fragrance or a tab cuts to the next view. Nothing tells the eye where it went or how to get back.
3. **Feedback is uneven.** Some buttons answer a press, some don't. Saving, logging, failing and going offline each look different from room to room.
4. **Loading is a blank or a pulse.** Five files use a spinner or pulse; none hold the shape of what is coming.
5. **Two token namespaces.** `--mo-*` (site layer) and `--dur-*` / `--ease-*` (app) carry the same numbers under two names. 54 keyframes live in four CSS files with no index.
6. **No user control.** Motion is all or nothing from the system setting. There is no in-app choice.
7. **Unverified in Arabic.** Some drawn motions name `left` as their origin (`.kx-track-fill`, `.kv-grow`). To check in M0 whether they run the right way in RTL.
8. **The 3D hero is finished but off.** The best motion we have is not live.

## 2. What "award-winning motion" means

Judges (Awwwards, CSSDA, Webby, Apple Design Awards) do not reward the amount of animation. They reward:

- **Meaning.** Each movement explains something: where a thing came from, what changed, what to do next.
- **Response.** The interface answers a touch at once (under 100 ms) and never makes the user wait for an animation.
- **One hand.** The whole product moves like one author made it.
- **A moment.** One or two movements people remember and show others.
- **Inclusion.** Reduced motion is a designed experience, not a switched-off one. RTL mirrors. Mid-range phones stay smooth.
- **Restraint.** Nothing that moves for its own sake.

My position: **"best UX" here is less motion than you might expect, placed exactly.** Kyphira is a bench tool. A blender has oil on one hand and a phone in the other. In the app, every movement must be short (250 ms or less for anything the user triggers) and must carry information. The public site is where we show off.

## 3. The direction (my recommendation)

**One idea: everything moves like matter on a bench.** Liquid pours and settles. Ink draws and dries. Weight lands and comes to rest. Paper turns. Nothing bounces, spins or sparkles. We already have this language in the Bench and the Journal; the plan extends it to every room and removes the seams.

Four pillars:

1. **Answer** — every touch gets the same quiet, instant response in every room.
2. **Carry** — the thing you tapped travels to where it opens, and travels back.
3. **Hold** — loading keeps the shape of the page; changes to lists are shown, not swapped.
4. **Mark** — one signature moment per room, and one for the whole product: *a logged batch is sealed and filed into the Journal.*

I would not build:

- Scroll effects, parallax or smooth-scroll inside the app (the site only).
- Bounce, confetti, celebration animations, animated mascots.
- Entrance animations on the first screen (current rule: the fold never animates; keep it).
- Animated calculator figures (current rule; the LCD stays the one exception).
- A motion library (GSAP, Framer Motion). CSS, the View Transitions API and the Web Animations API cover this plan, and the bundle check stays green.
- Sound in the app (the 3D hero keeps its own toggle).

## 4. Development plan

Each phase: own branch, small commits, EN + AR checked together, Vitest for pure code, Playwright for behaviour, reduced motion and RTL in every spec. Each phase ships alone.

### M0 — One language (foundation, no visual change)

- Inventory: every keyframe, transition and duration in the product, in one table (`docs/redesign/motion/INVENTORY.md`), each marked keep / merge / remove (removals are proposals for the owner).
- One token namespace. The app and the site read the same custom properties; the old names stay as aliases until nothing uses them.
- A short written motion grammar: which duration and ease for which job (press, enter, exit, travel, draw, settle), distances, stagger caps. Exits are faster than entrances.
- Tests: no literal milliseconds in any CSS file (today only `motion.css` is guarded); only `transform`, `opacity`, `filter` and stroke offsets animate; every animation sits behind the reduced-motion and motion-setting guards.
- RTL audit of every drawn or directional motion; fix origins with logical values.
- `/dev/motion` grows a gallery of app primitives (dev only).
- Acceptance: screenshots unchanged; tests green; the inventory approved.

### M1 — Answer (feedback, the whole app)

- One press response for every button, chip, tab, stepper and row (scale or tint, 150 ms, the same everywhere).
- One state language for actions: working, saved, saved on this phone (offline), failed. The Journal's ink-settle becomes the shared "saved".
- Sheets and dialogs open and close with the same movement, and close faster than they open (`useExit` exists; `kx/Sheet` adopts it).
- The bottom bar's active tab indicator slides between tabs.
- Form errors: the field is marked and the message rises in. No shake.
- Toggles, switches, the bell, the theme switch: one transition each.
- Optional (decision D5): a short vibration on Log and Save on Android. iPhone browsers cannot do this.
- Acceptance: a recorded pass through every room shows the same response everywhere; INP in the lab stays under 200 ms on a throttled mid-range profile.

### M2 — Carry (continuity between screens)

- Room-to-room navigation uses the View Transitions API through one helper (`src/motion/nav.js` already wraps it for the site). Browsers without it cut instantly, as today.
- Shared elements: a batch row becomes the batch detail; a fragrance card becomes its detail; a Journal "Smell today" card becomes the note sheet; a formula in the rail becomes the loaded Bench.
- Direction has meaning: deeper goes forward, back goes back, tabs cross-fade. Mirrored in Arabic.
- Scroll position is kept when coming back to a list.
- Acceptance: Playwright checks that the transition names exist and that reduced motion gets a plain cross-fade or a cut; no layout shift (CLS 0) on any transition.

### M3 — Hold (loading and change)

- Skeletons shaped like the real content for Search results, the Journal list, Batches, Inventory, the Nose shelf, Orders. They hold the final height, so nothing jumps (the Journal's CLS fix, applied everywhere).
- List changes are shown: re-sorting the Journal, filtering Atlas chips, adding or removing an inventory row or a cart line. Rows slide to their new place (FLIP, a small pure helper with tests).
- Counts and badges change with a short settle, not a swap (never the calculator figures).
- Optimistic saves where the outbox already makes them safe (notes, batch logs).
- Empty states arrive like content, not like errors.
- Acceptance: CLS 0 signed in on every room; a re-sort of 60 batches holds 60 fps on a 4× throttled CPU in a recorded trace.

### M4 — Mark (one signature per room)

The product's signature: **Log this batch.** The flacon is capped, the label is written on, and the bottle travels to the Journal tab, whose badge takes it. About 900 ms, skippable by any tap, a plain confirmation under reduced motion. This is the moment for the award film.

One per room, each small:

- **Journal:** Ready day. The 90-day track completes and the batch card turns from resting to ready.
- **Nose:** thinking shows accords gathering; answers arrive in order of match.
- **Wardrobe:** Tonight's answer is set down like a bottle on a shelf.
- **Atlas:** choosing a family re-arranges the shelf instead of reloading it.
- **Salon:** publishing a post turns the page.
- **Library:** the page turn between guides (exists) extends to the glossary.
- **Search:** the result you open grows from its row.
- **Upgrade:** the blurred cost card clears when Pro starts (exists in the tour; make it the real moment).
- Acceptance: each signature is under 1 s, never blocks input, has a reduced-motion form, and is drawn in EN and AR.

### M5 — The public site

- Decide the 3D pour (D3): the owner reviews the open items (Arabic strings, dark ground, drop paths) and it goes live, or it stays off. It is the strongest award asset we have.
- The Compounding scene and the pour are checked on a real mid-range Android phone, not only in the lab.
- Pricing, guides index and the shop get the M1–M3 language (they have reveals today, not feedback).
- Acceptance: Lighthouse mobile on Home stays at today's scores or better (Performance EN 97 / AR 90, CLS 0).

### M6 — Control, proof and submission

- **A motion setting** in More and Account: Full, Calm, Off (D2). Calm keeps feedback and cross-fades and drops travel, signatures and scroll scenes. The system's reduced-motion setting starts the user on Calm. Stored on the device.
- A recorded check on the owner's iPhone and one mid-range Android: every room, EN and AR, Full and Calm.
- Numbers for the submission: INP, CLS, frame rate on the signature moments, bundle size before and after.
- A 45-second film, six stills, and a public page, "How Kyphira moves" (the grammar, with live examples). Juries read these.

## 5. How we will know it works

| Measure | How | Target |
|---|---|---|
| INP (response to a tap) | Lab trace, 4× CPU throttle, every room | under 200 ms |
| CLS | Lighthouse, signed in, every room | 0 |
| Frame rate on travel and signatures | Recorded trace on a mid-range Android | 55 fps or more |
| Up-front JavaScript added | `check-bundle.mjs` | under 6 KB gzipped for the whole plan |
| Reduced motion and RTL | Playwright on every phase | every motion has both forms |
| Consistency | The M0 test suite | no literal durations, one namespace |

Field numbers from real users would need a small reporting call or a paid Vercel feature (D7). Lab numbers are enough to build and to submit.

## 6. Decisions for the owner

- **D1** Order. My proposal: app first (M0 to M4), site after. The site already moves; the app is where users spend their time.
- **D2** The motion setting (Full, Calm, Off) in More and Account.
- **D3** The 3D pour hero: review and switch on, or leave off.
- **D4** No motion library. Confirm.
- **D5** Vibration on Log and Save on Android: yes or no.
- **D6** The product signature: "a logged batch is sealed and filed into the Journal". Confirm, or name another moment.
- **D7** Field measurement of response times: lab only (my proposal), or add reporting.
- **D8** The public "How Kyphira moves" page: yes or no.

## 7. Risks

- **Too much.** The main risk of a motion project is adding movement that slows a bench tool. Guard: the 250 ms cap on user-triggered motion, every signature skippable, and the Calm setting.
- **View Transitions support.** Older browsers get a cut. That is today's behaviour, so nothing is lost.
- **Old specs.** Exit animations keep elements in the page a little longer; some Playwright specs will need to wait for them. Reduced motion in the test config keeps most of them unchanged.
- **Mid-range phones.** Shared-element travel over long lists can drop frames. Guard: the low-power check already in `src/motion/env.js` falls back to a cross-fade.
- **Arabic.** Direction must mirror everywhere. M0 audits it before anything new is built.
- **The no-fade rule.** The QA audit made `.reveal` move without fading because a faded section failed contrast. New entrances follow the same rule: text never sits at partial opacity.
