# Kyphira motion grammar

M0 of `docs/redesign/Kyphira-Motion_Brief_v1.md`. One page. The numbers live in `src/motion/config.js` (`TOKENS`) and nowhere else; `src/motion/grammar.test.js` fails the build when this page and the code drift apart.

## Character

Matter on a bench: liquid pours and settles, ink draws and dries, weight lands and rests, paper turns. Nothing bounces, spins or sparkles. Quiet and precise.

## The numbers

| Token | Value | Used for |
|---|---|---|
| `--mo-fast` (`--dur-fast`) | 150 ms | Press, hover, focus, colour change, a tooltip |
| `--mo-base` (`--dur-base`) | 250 ms | Anything the user triggers that moves: a sheet, a menu, a toggle, a row |
| `--mo-slow` (`--dur-slow`) | 600 ms | An entrance on view, a drawn line, a curve, a track fill |
| `--mo-ambient` (`--dur-ambient`) | 2000 ms | A loop (loading dots, a breath). Never faster than this |
| `--mo-ease` (`--ease-out`) | `cubic-bezier(.22,1,.36,1)` | Everything that arrives, answers or settles |
| `--mo-ease-io` (`--ease-in-out`) | `cubic-bezier(.65,0,.35,1)` | Things that travel, and loops |

`--dur-*` and `--ease-*` (the app's names) are aliases of `--mo-*` (the site layer's names). Tailwind's `transition`, `duration-fast|base|slow`, `ease-out` and `animate-pulse` read the same tokens.

## Rules

1. **A user's action never waits on a movement.** Input is live from the first frame. Anything the user triggers is at most `base` (250 ms). Only entrances on view and drawn lines use `slow`.
2. **Exits are faster than entrances.** Rule of thumb: an exit takes about two thirds of its entrance.
3. **Only `transform`, `opacity`, `filter` and stroke offsets move.** No keyframe animates size, position offsets, margin or padding (tested).
4. **Text is never left half-transparent.** An entrance on text moves; it does not wait at partial opacity (the contrast failure behind the `.reveal` rule). Fades are for things that are not text, or are over in `fast`.
5. **The fold never animates.** Anything on screen when the page opens is already in place.
6. **Calculator figures never animate.** The one exception is the Bench's LCD, whose numbers are owner-specified constants (`BENCH_MOTION` in `src/lib/calc/flacon.ts`).
7. **Every animation has a reduced-motion form.** Movement sits inside `@media (prefers-reduced-motion: no-preference)` (or `motion-safe:`), so reduced motion gets the end state at once. A loop is still, not slow (tested).
8. **Direction follows the page.** Anything that grows from an edge uses `--mo-dir` or a mirrored `[dir="rtl"]` origin (tested). Arabic starts at the right.
9. **Stagger is capped.** Siblings step by 60 ms, at most 8 steps, so a long list still finishes in time.
10. **No literal durations.** CSS spells no milliseconds except the 1 s / 1 ms scrub unit used by scroll-driven fallbacks (tested). Components use `duration-fast|base|slow` or `var(--dur-*)`.

## Jobs

| Job | Duration | Ease | Moves |
|---|---|---|---|
| Press, hover, tint | fast | out | colour, scale 0.98 |
| Sheet or menu in | base | out | translate from the edge |
| Sheet or menu out | fast | out | translate to the edge |
| Toggle, switch | base | out | translate, colour |
| Entrance on view | slow | out | rise 8 to 16 px (not fade, for text) |
| Line or curve drawn | slow | out | scale or stroke offset |
| Saved, settled | base | out | rise 4 px, then rest |
| Travel between screens (M2) | base | in-out | shared element |
| Loading mark | ambient | in-out | loop; still under reduced motion |

## Shared pieces (M1)

- **Press**: buttons, `[role="button"]` and links with `mo-press` (the bar, the wide tab row, link chips) step down 1 px and scale to 0.985 at once on press (`motion.css`). No easing: the answer is immediate.
- **Save state**: `kx/SaveState` (`working`, `saved`, `queued` for saved on this phone, `failed`), each arriving with `kx-settle`; `kx/Confirm` is the saved state. A field's error arrives the same way. No shake anywhere.
- **Sheets**: `kx/Sheet` rises in `base` and leaves in `fast`, keeping its last title and content while it leaves; the More sheet leaves in `fast` too. At once under reduced motion.
- **Where you are**: the phone bar has one room rule (`.kx-bar-ind`) that slides by transform to the room you open, toward the left in Arabic; still under reduced motion.

## Carry (M2)

- **Direction**: going deeper into a room (Atlas to a fragrance, the Bench to its batches) comes in from the end edge; coming out of it, from the start edge; another room, or the same page, is a cross-fade. The old view leaves on `fast`, the new arrives on `base`, 16 px along the reading direction (`--mo-dir`: the left in Arabic). Worked out from the two paths (`navDirection()` in `src/motion/carry.js`); browser back and forward read the history position.
- **Shared element**: the source is marked `data-mo-share="<key>"`, the destination `data-mo-share-to="<key>"`. They take the one name `mo-share` only while the transition runs, one at a time, and only when both are on screen; it travels on `base` with the in-out curve. Today: a Journal row's name into the batch detail, a fragrance card's name into its Atlas page (the card carries the name, so the heading is there before the page loads), a formula's name in the Bench rail into the Bench's name field.
- **Coming back**: browser back and forward return to where that page was scrolled (kept per history entry for the tab), waiting for a list that loads after the route, and giving up if the reader scrolls first.
- **Fallbacks**: reduced motion is a cut; a browser without View Transitions gets the page fade it had; a low-power phone gets the cross-fade without travel or shared element.

## Hold (M3)

- **Loading keeps the shape**: `kx/ListSkeleton` is one ruled row per expected item (a mark, a name, a line of facts, the rest bar for batches), in the Journal, Batches, Inventory and Orders. It holds the height, so nothing jumps when the rows arrive; its lines sweep on the ambient loop with the motion layer on and are still under reduced motion. Screen readers hear "Loading" only.
- **A change of order is shown**: `useFlip()` (`src/motion/flip.js`) slides each row that moved from its old place to its new one, on `base` with the in-out curve, by transform; a new row settles in like text (whole by 60 % of `base`). Only rows on screen before or after move, so a long list costs a screenful. Used by the Journal's sorts, Inventory rows and the shop cart. A cut under reduced motion.
- **A count settles**: the nav's due badge settles in when its number changes (`kx-settle`), sitting in the tab's corner so it moves nothing. Never the calculator figures.
- **Optimistic where the outbox makes it safe**: a quick note from Smell today is in the Journal at once ("Saving…"), then saved or saved on this phone; a busy server (429, 5xx) queues it like no connection; a refusal takes it back out and keeps the words for the next try.
- **Empty states arrive like content** (`kx-settle`, or the `Stagger` of `EmptyState`).

## Mark (M4)

- **The product's signature, "a logged batch is filed into the Journal"** (`fileBatch()` in `src/motion/signature.js`): when a batch is logged on the Bench or in Pour along, a small capped flacon presses its cap home, its label is written ("No. 072", in the page's language and direction), and it travels on an arc to the Journal tab, which takes it with a 4 px settle. 900 ms (the slow step and two fast ones). From the flacon when it is on screen, else from the Log button; to the Journal tab on screen, else to "Open the Journal" (the wide tab row scrolls away). Never in the way: `aria-hidden`, no pointer events, any tap or key finishes it; the status line says "Logged as No. 072" at once either way. Reduced motion, the layer off or a low-power device: the words only. A duplicate log (the same batch sent twice) does not play it.
- **Journal, Ready day**: the first time a batch is opened after its 90 days (once per batch, on the device), verdigris draws over the full track just behind its fill and "Ready" settles in; done by 850 ms.
- **Search**: the result you open grows from its row into the detail's heading (M2's `carry()`); on a phone the detail opens below the list, off screen, so it is a plain swap.
- **Wardrobe**: tonight's answer is set down from above (`Reveal from="down"`), not risen.
- **Nose**: the answers already arrive in order of match (`Stagger`), unchanged.
- **Upgrade**: the cost card's blur already clears on the slow step when the plan changes on the page (the tour uses the same transition), unchanged.

## The public site (M5)

- **Guides index**: the Essays / Glossary tabs are one width each with one rule under the open tab that slides between them by transform (`.kx-bar-ind`, `data-mo-ind="guides"`, the phone bar's rule; from the right in Arabic). The panel settles in after a switch, not when the page opens. A search or filter that keeps some guides slides them to their new places (`useFlip` on the Wearing contents and the Blending sequence, only rows on screen); "No guides found" settles in.
- **Pricing**: the two plan links answer a press (`mo-press`).
- **Shop**: loading keeps the shape of the products and of the order summary (`kx/ListSkeleton`); "Added" settles in on the card; the phone cart bar's count is keyed by the count and settles; the checkout's "fix the fields" line settles. The cart lines already slide (M3).
- **3D pour (D3)**: not switched on. Stills for the owner's review in `docs/redesign/motion/m5/hero3d/` (README there).
- Not done: the check on a real mid-range Android phone (owner, with M6's recorded check); a Lighthouse run (the home page did not change).

## Where each piece lives

- Tokens and primitives (site layer): `src/motion/`
- App keyframes and utilities: `src/index.css`
- The Bench's own constants: `src/lib/calc/flacon.ts`, `src/components/kx/Flacon.jsx`, `ScaleDisplay.jsx`
- Home scenes: `src/site/compounding/` (own sheets, own report)
