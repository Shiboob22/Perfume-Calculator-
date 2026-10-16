# Design brief audit (UI/UX)

Date 2026-10-16. Base: `main` @ `64d1301`. Branch `redesign/design-brief-pass`.
Brief: "Kyphira Design Brief (UI/UX)", the laboratory room at dusk. Checked room by room against its sections 1–8, at 390 px first, EN and AR.

Owner's answers before the pass (2026-10-16): light stays the default theme (decision 4 of 2026-10-14 holds; dusk lives in the dark edition and the hero); the Nose stays Free; in scope: the Nose cites the user's Wardrobe, a Library glossary, one digit style.

## Already met (no change)

- Fraunces (headings), Inter Tight (UI), IBM Plex Mono (figures), IBM Plex Sans Arabic + Amiri; catalogue numbers (`kx/Card`), Roman numerals on guide parts, hairline rules.
- Arabic: letter-spacing reset under `dir="rtl"`, spaced capitals off, taller display line height, arrows mirrored (`IconArrow` flips), progress bar from the right.
- Smoke (`SmokeField`, `SmokeLine`): Canvas 2D, slow, `aria-hidden`, still under reduced motion, stops off-screen.
- UI transitions at 180 ms; every motion off under `prefers-reduced-motion`.
- No banned words (revolutionary, ultimate, unlock, elevate) in EN copy or content.
- Lighthouse accessibility 100 on Home and a guide (Phase 0); axe in Playwright on every public page.

## Gaps, and what this pass does

| # | Brief | Found | Fix |
|---|---|---|---|
| 1 | §1, §3 One accent, resin amber, for focus, primary action and key numbers only | Light edition's action and focus are forest green (`amber` key = `#1F4A36`), so paper has two accents (forest + oil). 45 places use the action colour as text, so the fill cannot simply turn resin (resin text on paper is 2.6:1). | Light action fill → resin `#C8893A` with ink text (6.5:1); focus → resin text shade `#7A581B` (5.8:1 on paper); `forest` alias → resin text shade. Text uses move to a new text-safe `actionText` token. Ready/rested states use verdigris, warnings ember. Contrast tests updated. Dark edition unchanged (already resin). |
| 2 | §4 Bench: fastest path to a result; large numeric inputs | On a phone the grams sit ~1,900 px below the batch-size field. Inputs are 14 px mono (iOS Safari zooms any field under 16 px on focus); labels 11 px. | A compact live result (oil g, alcohol g, total) pinned under the inputs on phones, linking to the full readout. Numeric inputs 18 px, labels 13 px. |
| 3 | §5 Never animate numbers so they're slower to read | `.readout` fades each new figure in from 25 % opacity (160 ms). | Figures change at once; nothing animates the digits. |
| 4 | §5 UI transitions 150–250 ms | Bars and fills ease over 480 ms. | 240 ms (the ambient smoke and page turn stay longer). |
| 5 | §4 Bench: a quiet resting timer that stays on screen | Rest days show only inside the Journal. | One line at the top of the Bench: the batch resting soonest to be ready, with day *n* of *m*, linking to the Journal. Hidden when nothing rests. Free, like the Journal list. |
| 6 | §4 Wardrobe: catalogue grid | One-column list, no numbers. | Two/three-column grid on wider screens, a catalogue number per bottle. |
| 7 | §4 Wardrobe: what to wear is one question, one answer | Three fields up front (temperature, time, occasion) and three equal picks. | One question (occasion) up front; temperature and time folded under "Weather and time". One answer large; two alternatives under it, quieter. |
| 8 | §4 Wardrobe: wear log in two taps | "Wore this" opens a form, then Save: two taps. Met; sprays and note stay optional. | No change. |
| 9 | §4 Atlas: a consistent fragrance card, note and accord chips | Atlas results, Nose picks and Salon reviews each draw their own card; `Chip` lives in `wardrobe/ui`; accord links on a fragrance page have their own style. | `kx/Chip` and `kx/FragranceCard` (name, facts line, accord chips, optional link), used by Atlas results and Nose picks. |
| 10 | §4 Salon: notebook pages, not a social feed | Card with chips, a like *button* with a count, middle-dot meta. | A ruled page: date and kind as a running head, serif title, the recipe as a labelled grid, the like as a quiet text control. |
| 11 | §4 Library: narrow measure; §6 more Arabic line height | Body measure 44 rem at 19 px (~80 characters). Arabic body uses the English line height (1.7). | Measure ~66 characters; Arabic body line height 1.9. |
| 12 | §4 Library: glossary terms linked inline | No glossary. | `src/content/glossary.js`: terms whose definitions are the handbooks' own sentences already published in the guides, each with its source guide. First use in a guide links to the term; definitions show in place (a `<details>`, no script needed). Terms the guides don't define are listed below for the owner. |
| 13 | §4 Nose: cites the user's Wardrobe | Answers come from the catalog only. | After reading the question, the server also ranks the asker's own owned bottles (linked to the catalog: by accords; unlinked: by family) with the same rules; up to 3 shown under "Already on your shelf". No extra AI call, no migration, nothing stored. |
| 14 | §6 Numeral style decided once | Per-user Western / Arabic-Indic toggle. | Western digits everywhere, in both languages (figures match the scale). Toggle removed from the More sheet and Account; the saved `profiles.digits` value is kept, just no longer read. |
| 15 | §8 Voice | Middle-dot meta strings in Wardrobe and Atlas facts lines (Phase 7 rule). | Facts become a labelled list or sentence where touched by this pass. |

## Glossary terms without a handbook definition (owner to supply)

The glossary quotes the guides and nothing else (`src/content/glossary.js`, tested verbatim). In this pass: reference density, concentration, volatility, projection, sillage, olfactory radius. The guides use these terms without a sentence that defines them; each needs a line from you (or from the books) before it can join:

- **Tare** (the bench steps say what to do, not what it is)
- **Longevity** (the guide lists what extends it)
- **Maceration / rest** (rest days come from `tiers.js`, not a handbook; a known content gap)
- **Perfumer's alcohol / 96% ethanol**
- **Fragrance oil / concentrate**
- **EDT, EDP, EDP Intense, Extrait** as named strengths (the Formulation volume names them; the Application volume says they are "not simply strength levels")
- **Accord**, **top / heart / base notes**, **dry-down**
- **Pulse points**, **layering**

The Arabic glossary follows the Arabic guide drafts, so it waits on the same review.

## Quality gates

Screenshots (EN/AR, phone first) in `docs/redesign/phase-brief/`, Lighthouse accessibility per room, and the Krug walkthrough are recorded at the end of the pass.
