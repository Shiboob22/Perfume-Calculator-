# Kyphira animation pass: critique (2026-10-18)

Build recorded: branch `redesign/kyphira` at `cce8fcd`, `vite` dev server, all six flags on, motion on (not reduced), light theme. Filmstrips (10 viewport frames per page, scrolled with a real browser): `before/<page>-<en|ar>-<1440|375>-fNN.png`, 46 page/language/width sets, `scripts/motion-record.mjs`. Rooms are shown through `/dev/<screen>` (no session), so their data states are empty or errored; judged on layout and motion only. Console: only the known local-key 401s.
Not recorded: the Vercel preview (not deployed from this branch), real phone, dark theme (done in later steps).

Read as a harsh creative director against an Awwwards bar. Scores 1 to 5.

| Page | First impression | Type | Composition | Motion | Scroll rhythm | Micro | Perf feel |
|---|---|---|---|---|---|---|---|
| Home | 3 | 3 | 2 | 2 | 2 | 2 | 4 |
| Library, guide | 3 | 4 | 3 | 2 | 3 | 2 | 4 |
| Pricing | 2 | 3 | 2 | 1 | 2 | 2 | 4 |
| Bench | 3 | 3 | 3 | 2 | 3 | 3 | 5 |
| Wardrobe, Atlas, Salon, Nose | 2 | 2 | 2 | 1 | 2 | 2 | 4 |
| Account, onboarding | 2 | 2 | 2 | 1 | 2 | 2 | 4 |

Verdict: tidy, fast and honest, but it reads as a well-made editorial template. The hero is a headline and a card; the "scene" is five ordinary stacked bands (5,485 px in all; the oil and alcohol stages are 368 px tall) with small drift-ins. Nothing is pinned, nothing has light or depth, nothing answers the pointer. Arabic is clean but gets the same flat treatment.

## The ten biggest gaps, ranked by visible impact

1. **No pinned story on the homepage.** The six-stage Compounding was replaced in v7 by five stacked sections; `Pin` exists and no page uses it. Scroll has no beat, no focal point that holds. *Fix:* one pinned, scrubbed sequence (about 320 svh): the reading 84.50 g splits into oil 23.75 g and alcohol 60.75 g on a beam, the two pans settle, the figure is rebuilt as the batch. CSS `view()`/`scroll()` timelines first, 388 B-style JS fallback where unsupported, static composed layout under reduced motion.

2. **Flat paper, no depth or light.** Every surface is a flat card on a flat ground; no layering, no light source, no texture. The brief's "resin light that responds to scroll and cursor" is absent. *Fix:* a light layer (soft resin radial) whose position and strength are CSS variables set from scroll progress, and from the pointer on fine pointers; layered believable shadows on cards; sparing SVG-noise grain; ember glow in the dark theme.

3. **Type is not the hero.** The h1 is 104 px at 1440 and everything below it is ordinary; section titles are ~52 px; only guide openers reveal by masked words, and the home headline (LCP) never animates. No cropped scale, no scale contrast. *Fix:* oversized figure type (the reading is the display, cropped by the edge), masked whole-line reveals on every section title (EN by line, AR by whole line), optical alignment of figures and units, tighter leading tokens; the h1 itself stays static for LCP and gets a post-paint settle on the italic line only.

4. **No first-load moment.** The site opens cold on the page. Brief: a short, skippable intro under 1.5 s, once per session, that hides font and asset loading. *Fix:* a session-gated veil on the home page only: the beam draws and a pan settles to the first reading, 900 ms, removed on first input or tap, text already in the DOM and readable under it, no effect on LCP or CLS, skipped under reduced motion and on repeat.

5. **Nothing answers the pointer.** Only a hover lift. No magnetic buttons, no card tilt, no refined cursor or press states, nothing within the 100 ms feel target beyond colour. *Fix:* shared `Magnetic` and `Tilt` primitives (pointer-fine only, 6 px / 3 degrees max, off for touch and reduced motion), 100 ms press-and-release states on Button, Chip, Card; custom focus ring kept.

6. **Rooms are plain inside.** The beam header is good, but the bodies (Wardrobe, Atlas, Salon, Nose, Account) are forms and lists with one header rise each. No scroll rhythm, no entrance for results, no shared-element move except the Atlas card. *Fix:* each room gets its one key moment on shared primitives (list stagger on results, card-to-detail morph where data allows, Nose answer settle, Account meter fill); the Bench and Atlas stay instant and readable, motion only around the numbers.

7. **No atmosphere: ember and smoke are gone.** v7 removed the canvas; the hero has zero canvases and the "ember" is a CSS dot. The brief wants smoke and ember that react to scroll velocity and clear into navigation. *Fix:* one small canvas scene (ember plus a few plumes) driven by progress and velocity as uniforms, DPR capped at 1.5, paused off-screen, FPS monitor that downgrades to a static SVG, loaded lazily below the fold so the first script stays within budget.

8. **Orientation is local, not global.** A reading hairline exists on guides; nothing else says where you are on a long page. The grams scale lives only in the home scene. *Fix:* one progress hairline under the site header on every long page (mirrors in RTL), and the grams scale as the home page's scroll gauge that ends on 84.50 g, hooked to the same variable.

9. **Section changes are hard cuts.** Paper, card and sand bands butt against each other; the page changes colour by cut, not by light. *Fix:* section-to-section palette and light transitions through CSS variables on `scroll()`/`view()` ranges (paper to dusk resin to paper), contrast checked at every stage, AA kept for amber on dark.

10. **Parallax and horizontal motion unused; `/dev/motion` short of the brief.** `Parallax` is shipped and unused, so no layer has real depth; the rooms list is a static grid. `/dev/motion` lacks stage markers and an on-page scroll readout. *Fix:* transform-only parallax on three hero layers (different speeds, under 40 px), the six rooms as a horizontal strip once on desktop (vertical on phones and RTL-mirrored), and the extended `/dev/motion` (progress readout, stage markers, reduced-motion, RTL, low-power and FPS toggles).

## Ranking logic

1 and 2 change the first ten seconds on the page most people land on. 3 and 4 are what a reviewer notices before scrolling. 5 and 6 decide whether the tool rooms feel as good as the home. 7 to 10 are the finish that makes the first six look deliberate.

## Hard limits this pass must hold

LCP under 2.5 s on `/` and `/ar` (last: 2.4 and 2.5 s in production), CLS 0, first script no worse than 178,026 B gzip (budget 170 KB; already 8 KB over, so new code goes in lazy chunks), 60 fps, AA contrast, native scroll only, entrance once per view, scrubbed always reverses.
