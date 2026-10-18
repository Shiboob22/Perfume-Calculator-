# Kyphira Animation Excellence Pass (Claude Code)

A second pass on the existing redesign (direction A, with B's ember in the dark theme). Branch `redesign/kyphira` only. Read `docs/` and the latest phase reports first.

---

## 1. Role

You are the lead creative developer at a studio known for award-winning animated websites. You are known for three things: a look that reads as expensive, an experience that feels effortless, and scroll-driven animation that is precise, fast and meaningful. Your job is to raise Kyphira from "well animated" to "studio grade", without hurting speed, accessibility or the working tools.

## 2. Step 1: Critique before you code

1. Run the app (and open the latest Vercel preview if available). Use browser tools or Playwright to record the homepage and each room at 1440 and 375 px, in English and Arabic.
2. Review it as a harsh creative director against an Awwwards-level bar. Score each page on: first impression, typography, composition, motion quality, scroll rhythm, micro-interactions, performance feel.
3. Write `docs/redesign/animation-pass/critique.md`: the 10 biggest gaps, ranked by visible impact, each with a concrete fix. Do not pad it.
4. Then implement the fixes in rank order. Do not stop for approval after the critique.

## 3. The bar: look

- **Typography as the hero.** Oversized display type, tight and deliberate leading, strong contrast of scale, masked line reveals, optical alignment. Arabic gets equal craft (whole-line reveals, correct joining, matched weight).
- **Depth and light.** Layered surfaces, soft resin-amber light that responds to scroll and cursor, grain or noise used sparingly, believable shadows. No flat cards on flat black.
- **Composition.** Intentional asymmetry, generous silence, cropped scale, consistent baseline rhythm. No template layouts.
- **Imagery and texture.** Where visuals are needed, use generated shader, canvas or SVG material (smoke, resin, glass, liquid) that belongs to the concept. No stock photos, no Egyptian clichés (hieroglyphs, pyramids, eyes of Horus, pharaoh imagery, papyrus, gold gradients).
- **Polish details.** Custom focus rings, refined cursor states on desktop, consistent radii, pixel-aligned hairlines, tabular figures for all measurements.

## 4. The bar: experience

- **First load.** A short, confident intro that hides font and asset loading. Under 1.5 s on a fast connection, skippable, never repeated within a session. Content must be readable without waiting for it.
- **Orientation.** The user always knows where they are: the active room indicator, the grams weight scale, reading and scroll progress.
- **Rhythm.** Alternate dense and quiet screens. Every scroll beat has one clear focal point.
- **Interaction.** Hover, focus, press and release feel physical and consistent. Buttons and cards respond within 100 ms. Magnetic or tilt effects only on pointer devices, subtle, never on touch.
- **Transitions.** Route changes feel continuous: shared elements morph where the data allows (card to detail), otherwise a short crossfade. No blank flashes.
- **Tools stay tools.** The Bench and Atlas must remain instantly readable and fast. Show off around the numbers, never in front of them.

## 5. The bar: scroll-driven animation

**Principles**
- Native scroll stays native. No scroll-jacking, no hijacked wheel or touch, no momentum libraries that change how scroll feels.
- Animation is a pure function of scroll position (scrubbed), so it reverses perfectly and stops when the user stops.
- One idea per scroll beat. If a section needs explaining, it is too busy.

**Implementation order of preference**
1. CSS scroll-driven animations (`animation-timeline: scroll()` and `view()`, `animation-range`) for transforms, opacity, clip and colour.
2. GSAP ScrollTrigger (or equivalent) only for what CSS cannot do: pinned sequences, timelines with multiple coordinated parts, canvas or WebGL uniforms. Feature-detect and use it as the fallback for browsers without scroll-timeline support. Report the byte cost of anything added.
3. Canvas or WebGL for smoke, ember and light, driven by scroll progress as a uniform, paused off-screen, with a static fallback.

**Patterns to deliver (use where they serve the concept, not all everywhere)**
- Pinned story sequence on the homepage with scrubbed stages and a palette shift tied to progress.
- Layered parallax with real depth (transform only, small distances, different speeds per layer).
- Masked text and image reveals tied to `view()` ranges.
- Scroll-linked counters and the grams weight scale.
- Ember and smoke that react to scroll velocity and direction (subtly) and clear into navigation.
- Horizontal scroll section, once at most, only if it improves the story, with a vertical fallback on mobile.
- Section-to-section colour and light transitions, using CSS variables.
- Progress hairlines and reading indicators.

## 6. Performance and accessibility (hard limits)

- 60 fps on a mid-range phone. Animate `transform` and `opacity` where possible; avoid layout-triggering properties; use `will-change` sparingly and remove it after use.
- CLS 0. LCP under 2.5 s on `/` and `/ar`, no regression from the previous pass. Keep the first-load script within the existing budget; lazy-load heavy scenes below the fold.
- Cap device pixel ratio for canvas and shaders; reduce quality automatically on low-power or low-FPS devices (simple FPS monitor with a graceful downgrade).
- `prefers-reduced-motion`: replace scrubbed and pinned scenes with a composed static layout. Parallax, smoke and magnetic effects off.
- Content is real DOM text in logical order. Animation never gates content. Visible focus always. AA contrast at every stage, including amber on dark.
- Full RTL parity. Mirror direction of reveals, horizontal motion, scale and smoke. Animate Arabic by whole words or lines only.
- Entrance animations play once per view. Scrubbed ones always reverse.

## 7. Deliverables

1. `docs/redesign/animation-pass/critique.md` and a before/after screenshot set (EN and AR, 1440 and 375).
2. The upgraded homepage and all six rooms plus auth and settings, using the shared motion tokens and primitives (extend them; do not create one-off styles).
3. Extended `/dev/motion` page: scroll-progress readout, stage markers, toggles for reduced motion, RTL, low-power mode and FPS display.
4. Short screen recordings of the homepage scroll and one key moment per room.
5. A report: what changed, bundle delta, LCP and CLS on `/` and `/ar`, FPS on a throttled mobile profile, accessibility score, browser support matrix, trade-offs.
6. Update the README motion section.

## 8. Process and hard stops

Work autonomously in this order: critique, homepage, Bench, Wardrobe, Library, Atlas, Salon, Nose, auth and settings, hardening. Commit per step with a short note.

Stop and ask me only for:
- merging to main or deploying to production;
- deleting data or any non-additive migration;
- buying domains or creating paid resources;
- an irreversible decision that could reasonably go two ways.

Otherwise decide, note the decision in the report, and continue. Do not verify motion only by reading code: look at it in a real browser, scrub the scroll in both directions, and re-screenshot after every fix. If something is unchecked, say so.

## 9. Definition of done

- The critique's top 10 gaps are fixed or explicitly explained.
- Homepage and every room hold up at 1440 and 375, in EN and AR, with reduced motion on and off.
- Performance at or above the previous pass; accessibility 95 or higher; no console errors; core tests pass.
