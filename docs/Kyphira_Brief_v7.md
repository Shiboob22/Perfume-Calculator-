# Kyphira Total Creative Redesign (Claude Code)

Replaces the visual and motion direction of earlier briefs. Function, data, routes and redirects stay. Everything the user sees is open for reinvention. Work on branch `redesign/kyphira` only.

---

## 1. Role

You are a creative director, product designer and creative developer in one. Your job is not to polish the current app. Your job is to make Kyphira look and move like nothing else in perfumery or software, and to ship it.

## 2. What stays and what goes

**Stays (do not break):** features, Supabase data and schema (additive migrations only), auth, routes `/bench`, `/wardrobe`, `/library`, `/atlas`, `/salon`, `/nose`, all legacy 301 redirects with query parameters, the brand config, English and Arabic parity.

**Goes (treat as disposable):** the current layouts, components, colours, type, spacing, icons, transitions and page structure. Do not inherit habits from them.

## 3. Brand frame

- **Kyphira** (kee-FEER-ah, كيفيرا): a Cairo-built perfume platform, named for kyphi, the ancient Egyptian incense whose recipe was carved in the laboratory room of the Temple of Edfu.
- **Audience:** people who make, wear and study perfume. They value precision, craft and atmosphere.
- **Feeling:** a perfumer's notebook, a laboratory at dusk, smoke, resin, weight, time. Precise, calm, a little literary.
- **Voice:** short sentences, numbers before adjectives. Banned words: revolutionary, ultimate, unlock, elevate.
- **Forbidden imagery:** hieroglyphs, pyramids, eyes of Horus, pharaoh imagery, papyrus textures, gold gradients, stock luxury clichés, generic dark-mode SaaS templates.

## 4. Creative rules

1. **No templates.** If a layout could belong to any other site, discard it.
2. **One big idea, executed everywhere.** The whole site is built around a single idea (for example: scroll as time in the lab, smoke as navigation, weight as the unit of interface). State it in one sentence and make every page prove it.
3. **Break the grid on purpose.** Use scale, cropping, asymmetry and silence deliberately. Large type and empty space are tools.
4. **Typography leads.** Choose a distinctive editorial display face and a quiet UI face, plus an Arabic face of equal character. Arabic is designed, not translated.
5. **Motion has meaning.** Every animation expresses the idea (weight, smoke, dissolve, time). No effect exists for decoration. Quiet and precise by default; cinematic moments are rare and earned.
6. **Tools stay clear.** The Bench and Atlas are working tools. Be bold in presentation, never at the cost of readability, speed or accuracy of numbers.

## 5. Process

**Phase 0. Audit (short).**
Inventory routes, components, existing animation, and baseline bundle size, LCP, CLS and accessibility. Inventory your tools (browser, design connectors, Playwright) and say which you will use. If Claude Design, Figma or Canva is available, use it for exploration and import the result; otherwise explore in code.

**Phase 1. Three directions.**
Create `/dev/directions` with three genuinely different creative directions, each a single scrolling board containing: the big idea in one sentence, palette, type pairing (EN and AR), a homepage hero composition, one room screen (Bench), a motion sketch of the hero, and a mood description. They must differ in concept, not just colour. Recommend one with reasons. **Stop here and wait for my choice.** This is the only creative approval gate.

**Phase 2. Design system.**
For the chosen direction: tokens (colour with AA contrast, type scale, spacing, radii, elevation, light), components (nav, buttons, inputs, numeric steppers, cards, chips, tabs, modals, toasts, tables, skeletons, empty states, the weight-scale progress indicator in grams), iconography, and the motion token file (durations, easings, stagger, distances). Publish all of it at `/dev/design`.

**Phase 3. Foundation.**
Implement tokens as CSS custom properties, font loading, i18n with RTL mirroring (layout, icons, progress, scale), shared layout, and the motion primitives: `Reveal`, `TextReveal`, `Stagger`, `Parallax`, `DrawLine`, `CountUp`, `Pin`, `PageTransition`. Route transitions use View Transitions where supported with a crossfade fallback.

**Phase 4. Homepage.**
Build the signature scroll experience from the chosen direction. Native scroll only, motion driven purely by scroll position, a clear sequence from first screen to the six rooms, ending in a handoff to the live Bench. Include a static alternative for reduced motion.

**Phase 5. The six rooms plus auth and settings.**
Redesign each room fully in the new language with its own signature moment (see section 6). Every page gets entrance, interaction and transition behaviour from the shared system.

**Phase 6. Hardening.**
Performance, accessibility, RTL, reduced motion, cross-browser, tests for core flows, bundle review.

**Phase 7. Handoff.**
README section on the design system and motion config, final report, screenshots, short screen recordings, follow-up list.

After Phase 1 approval, continue through the phases without asking for confirmation. Commit per phase with a short report.

## 6. Signature moment per room

- **Bench:** numbers feel weighed. Results count in, the resting timer is a calm presence, nothing delays reading a value.
- **Wardrobe:** the collection as a catalogue you handle. Adding a bottle and logging a wear each have a small, satisfying confirmation.
- **Library:** an editorial reading experience with a cinematic opener, reading-progress line and living glossary.
- **Atlas:** filtering feels like distilling; results reflow smoothly; a fragrance expands from its card.
- **Salon:** profiles and public recipes read like notebook pages, with a cinematic profile header.
- **Nose:** a conversation with an ambient presence while it thinks; the Pro gate is calm and honest.

## 7. Non-negotiables

- **Performance:** 60 fps on a mid-range phone, animate `transform` and `opacity` where possible, CLS 0, LCP under 2.5 s and no regression from baseline. Pause off-screen animation. Report numbers.
- **Accessibility:** real DOM text, logical keyboard and screen-reader order, visible focus, AA contrast at every stage, 44 px touch targets. Animation never gates content.
- **Reduced motion:** instant or opacity-only changes; pinned and parallax scenes become static layouts.
- **Bilingual parity:** full RTL mirroring. Animate Arabic by whole words or lines, never letter by letter. Pick Western or Arabic-Indic numerals once.
- **Entrances play once** per view.
- **Real content:** perfumery names, grams, dilution ratios, notes. No lorem ipsum.
- **Feature flag** for the new motion layer, and a `/dev/motion` page with toggles for reduced motion, RTL and low-power mode.
- **No scroll-jacking.**

## 8. Hard stops (ask me only for these)

- the Phase 1 direction choice;
- merging to main or deploying to production;
- deleting data or any non-additive migration;
- buying domains or creating paid resources;
- a conflict between this brief and the repo that changes scope.

Otherwise decide, record the decision in the phase report, and continue. Do not change the production domain. Do not scrape third-party sites. Do not commit secrets.

## 9. Phase report

What changed; routes and files touched; tools used; metrics (bundle delta, LCP, CLS, FPS on a throttled mobile profile, accessibility score); EN and AR screenshots at 375 and 1440 px; trade-offs. Short and factual.

## 10. Definition of done

Every route in the Phase 0 inventory is redesigned, built and animated; EN and AR pass at both sizes; accessibility 95 or higher; performance at or above baseline; core flows tested; no console errors.
