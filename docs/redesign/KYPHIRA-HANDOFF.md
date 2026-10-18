# Kyphira master brief: handoff

Branch `redesign/kyphira`, reset to `main` (`aa1982b`) on 2026-10-18, then gap-closed. 17 local commits, **not pushed, not merged, not deployed.** Gap audit: `KYPHIRA-MASTER-GAP.md`.

## What was done (the gaps, closed)

| Gap | Result | Commit |
|---|---|---|
| Primitives not used in rooms | Bench: staggered Journal rows, resting-card reveal. Wardrobe: staggered collection, one-moment answer, status confirm. Library: word-by-word title, paragraph reveals, CSS glossary popovers. Atlas: staggered results and browse, shared-element title, detail reveal. Salon: staggered feed, follow/status confirm. Nose: staggered picks, message and shelf rise, error and Pro-gate reveal | ee2e118, 1d44df4, 618306e, cc85aeb, 31f8195, c3b5dd9 |
| Homepage v2 keyframes unused | Principles and FAQ rise, FAQ rule grows, quote credit fades (`kRise`, `kGrow`, `kFade`) | 81b04d4 |
| No design sheet | `/dev/design`, `/ar/dev/design` | d6916e3 |
| Metrics stale | Re-measured: `METRICS-2026-10-18.md` | 7eb851c |
| Handoff | README section, this report, screenshots in `phase-kyphira/` | this commit |

Also: e2e axe checks now wait (max 1.5 s) for time-based entrances, because axe could read a half-faded colour.

## Quality gates

Vitest 704 pass. Playwright (desktop + phone): 422 pass, 72 skipped after the Salon room; 421 pass plus one load-flaky visual after the home keyframes (passes alone). Not re-run in full after the Nose room (its specs and `a11y` pass) or after `/dev/design` (dev only). Lighthouse mobile: accessibility 100, SEO 100, CLS 0 on all pages measured.

## Needs the owner

1. **Merge and deploy** `redesign/kyphira` (brief section 9: not done without your go-ahead). Re-run the phone profile on a compressed preview first.
2. **First script 180.8 KB gzip** (+4 KB vs baseline, 10.8 KB over the 170 KB budget); phone LCP is 0.1 to 0.5 s slower than the baseline. Decide whether to split the Compounding scene or Arabic font CSS out.
3. Review in a real browser: the Atlas/Library shared-element title transition, the home keyframes with scroll timelines, the Arabic hairline direction.

## Not done, on purpose

- No `kPulse` / `kDrift` on the home page (nothing to attach them to).
- Wardrobe card-hover detail, Atlas chip-select animation, Salon compose confirm and Moderation/MyProfile statuses are not wired.
- Nose ambient smoke: the existing thinking dots stay.
- Auth and settings pages get only the global behaviour; no per-page motion.
- Recordings: none made. App routes (need a session), WebKit/Firefox and real-phone metrics: not measured.
- Pre-existing lint warning in `Batches.jsx` (`useEffect` missing dep `refresh`).

## Screenshots

`docs/redesign/phase-kyphira/` (public pages EN/AR, signed-in screens against the fake API, phone and desktop, reduced motion on so full-page shots show everything). Earlier board-sync shots: `phase-board-sync/`.
