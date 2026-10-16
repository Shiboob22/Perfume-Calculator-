# Kyphira Design Prompt (for Claude Design)

Paste into Claude Design. Output is visual design, not production code.

---

## Task

Design the **Kyphira** website as a complete, high-fidelity, award-level visual system: the landing homepage and the six rooms inside it. Kyphira is a Cairo-built fragrance platform for people who make, wear and study perfume. Name roots: kyphi, the ancient Egyptian incense whose recipe was carved in the laboratory room of the Temple of Edfu.

## Concept: the laboratory room at dusk

Warm dark stone, resin-amber light, slow smoke. A perfumer's notebook, not a beauty ad. Modern, calm, precise, a little literary.

**Avoid:** hieroglyphs, pyramids, eyes of Horus, pharaoh imagery, papyrus textures, gold gradients, stock "luxury" clichés.

## Design system (build first)

- **Colour:** near-black warm ground (not pure black), two raised surface tones, one accent in resin amber, one muted text tone. Show tokens and contrast ratios (WCAG AA minimum).
- **Type:** editorial serif for headings, clean sans for UI, tabular figures for all measurements. Choose an Arabic pairing with matching weight and x-height. Show specimens side by side.
- **Details:** Roman numerals, catalogue numbers, hairline rules, generous space.
- **Components:** nav, buttons, inputs and numeric steppers, cards, chips, tabs, modals, toasts, tables, empty and loading states, the weight-scale progress indicator (grams, tabular figures).
- **Iconography:** thin line, consistent, direction-aware for RTL.

## Screens to design

Each at **desktop (1440)** and **mobile (375)**, in **English (LTR)** and **Arabic (RTL, fully mirrored)**.

1. **Homepage.** Hero built around "the Compounding": sixteen ingredient plates (I to XVI, English and Arabic names) arriving one by one, blending into amber, the room shifting from afternoon to dusk, ending in an ember and smoke that reveals the six rooms. Then room cards, a short method section, a Pro teaser, footer.
2. **The Bench.** Calculator with large numeric inputs, live results, units visible, resting timer, recipe and batch list.
3. **The Wardrobe.** Collection catalogue grid, bottle detail, wear log, what-to-wear picker.
4. **The Library.** Article index and a long-form reading page with glossary terms.
5. **The Atlas.** Fragrance index with filters, fragrance detail with notes, accords and house.
6. **The Salon.** Profile, public recipe cards, reviews and follows.
7. **The Nose.** AI advisor conversation, thinking state, Pro gate.
8. **Auth and settings** (one frame each, shared system only).

## Motion (specify, do not just animate)

For the homepage hero and one key moment per room, provide a **storyboard**: numbered keyframes showing the state at each scroll or interaction point, with duration, easing and what triggers it. Include a short motion spec table: tokens (fast 150 ms, base 250 ms, slow 600 ms, ambient 2 s or more), one standard ease-out, one ease-in-out. Character is quiet and precise; cinematic only in the homepage hero, Library openers and Salon profile header. If a motion piece is supported, also produce a short animated preview of the hero.

## Rules

- **Bilingual parity.** Arabic is designed, not translated. Mirror layout, icons, progress and scale. Check line height, diacritics and numeral style (choose Western or Arabic-Indic once and keep it).
- **Reduced motion.** Show the static alternative for the hero.
- **Accessibility.** AA contrast everywhere, visible focus states, minimum touch target 44 px.
- **Content realism.** Use real-feeling perfumery content (ingredient names, grams, dilution ratios, note names), never lorem ipsum.
- **Voice.** Short sentences. Numbers before adjectives. Banned words: revolutionary, ultimate, unlock, elevate.
- **Consistency.** Every screen uses the same tokens and components. No one-off styles.

## Deliverables

1. Design system sheet.
2. All screens listed above, four variants each (desktop and mobile, EN and AR).
3. Hero storyboard plus motion spec table.
4. A one-paragraph rationale for the key design decisions.

Ask before building if anything here is ambiguous. Do not fill space with generic decoration.
