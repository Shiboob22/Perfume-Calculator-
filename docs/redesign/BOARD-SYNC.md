# Board sync: gap list

Date 2026-10-16. Branch `redesign/board-sync` (cut from `claude/kyphira-board-sync-04ae5d` @ `b51b25f`, which holds the board dark palette and typefaces). Nothing in `src/` has been edited. This file is the plan; source work starts after the owner's go-ahead.

Sources: `Design/boards/*.dc.html` (from "Scent handbook app project.zip"), `Design/Kyphira_Brief_v5.md`, `docs/redesign/DESIGN-BRIEF-AUDIT.md`.

**How this was made.** I read each board's markup, tokens, copy tables and motion specs, and the app code it maps to (`theme.js`, `index.css`, `kx/*`, `config.js`, room components). I have not yet rendered the boards next to the app; every row marked *check* gets a screenshot comparison when its room is built, and mismatches are listed here after. Board demo numbers (12,480 fragrances, 2,150 recipes, 412 glossary terms) are mock data and are never copied.

Actions: **change** (do it), **matches**, **skip** (reason given), **ASK** (blocked on an owner decision; nothing built until answered).

---

## Decisions needed before I edit source

| # | Question | Board says | App / rule today | My recommendation |
|---|---|---|---|---|
| Q1 | Homepage hero: scroll or autoplay? | A timed 9.2 s autoplay with Skip / Replay, then scroll takes over (`Homepage Board`, `Compounding`) | Scroll-driven Compounding, six stages, CSS scroll timelines, on in production | Keep scroll-driven (it is live and tested). Take the board's *content*: plate order, 240 ms stagger feel, ember breath 3.2 s, headline "16 materials. 1 ember. 6 rooms.", Skip control. Skipping an autoplay that doesn't exist = a "Skip to rooms" link. |
| Q2 | Raw-material formula mode on the Bench | "Raw materials" mode: 16 lines (Frankincense, Labdanum, Iso E Super…), weigh-and-tick, Roman numeral per line | CLAUDE.md: "no raw-material formula builder", "Not from-scratch perfumery" | Skip. Build only the weigh-and-tick behaviour on the dilution recipe lines, which Bench mode already has. |
| Q3 | "Fragrance blend" mode (mix catalog fragrances by parts, then dilute) | Mode toggle, search catalog, parts per fragrance, ethanol 96% with water 4% line | Single concentrate per batch. Calc core is off limits; the board uses ethanol 0.807, the core uses 0.81 | ASK. This is new calc logic + a new data shape. Also Atlas "Use in a blend" and Salon "Open in the Bench" depend on it. Skip unless you want it as its own phase. |
| Q4 | The Nose: chat that writes formulas, behind a Pro gate | Conversation with generated recipe cards ("Resin Study", grams), thinking state, Pro gate at 3 messages | Describe-a-scent → real catalog picks (Gemini only chooses among server-found rows). Free (owner, 2026-10-16). Quota 8/h, 25/day. No recipes generated. | ASK. Generated formulas = new API and AI policy; the Pro gate contradicts "Nose stays Free". I'll take the board's look (thinking state, shelf panel, quota meter with the *real* limits) and leave the behaviour. |
| Q5 | Corner radius | 2 px everywhere, no shadows | Square corners (0 px) since v3; offset paper shadow on hero bench and recipe card | Token change. Recommend 2 px on controls, cards, chips, inputs; drop the offset shadow in the dark edition only. Say yes/no. |
| Q6 | Motion tokens | fast 150, base 250, slow 600, ambient ≥2 s; ease-out (.22,1,.36,1), ease-in-out (.65,0,.35,1) | `MOTION` 180 / 320 / 480, one ease (.2,0,0,1); `.fill-anim` 240 | Token change. Your brief says use the board's. I'll add the two eases and four durations as CSS variables + `MOTION`, and move existing transitions onto them. Say yes/no. |
| Q7 | Phone navigation | 375 frames show a header with a menu button | Fixed bottom bar (Search, Calculator, Nose, Journal, More), 2026-10-16 | Keep the bottom bar (route/nav change is yours to approve). Board's menu sheet content = the More sheet. |
| Q8 | Account: password sign-in | Email + password, show/hide, "Forgot?" | Magic link + Google only; no passwords in Supabase Auth config | Skip the password fields; take the layout (form left, panel right). Needs your call if you do want passwords. |
| Q9 | Newsletter field in the Home footer | Email field + Subscribe | Public waitlist is a link on purpose (no anonymous email field) | Skip (needs a new API and privacy text). |
| Q10 | Light edition | Boards show dark only | Light is the default (owner) | Keep light default. The dark edition already carries every board colour; light is not redrawn from the boards. |

---

## 1. Design System (`Design System.dc.html`)

App: `src/lib/theme.js`, `src/index.css`, `tailwind.config.js`, `src/components/kx/*`.

| Board frame | App file | What differs | Action |
|---|---|---|---|
| I Colour: ground #15120F, surfaces #1E1A16 / #29231D, hairline #3B332B, text #EDE4D6, muted #A3968A, resin #D4924A, hover #E3A866 | `theme.js` `dark` | Identical | matches |
| Ok #9DB38A, Alert #E07A62 | `dark.verdigrisText`, `dark.danger` | Same values, different names | matches (no new token) |
| Afternoon #3A2B1E, "hero only" | `compounding/config.js` `STAGE_LIGHT.afternoon` is light paper #EDEAE3 | Board's afternoon is a brown dusk-tinted ground; the app's is bright | ASK with Q1: the app's afternoon is deliberately light-edition-independent; the board's looks different. Check in Homepage room. |
| Contrast table (13 pairs) | `theme.test.js` contrast tests | All pass in the app's dark palette | matches |
| II Type: Newsreader 300/400, Noto Naskh Arabic, Hanken Grotesk 400/500/600, Plex Arabic | `index.css`, fonts | Loaded in 5ab9894 / b51b25f | matches |
| Type scale: Display 76/1.05, H1 56/1.1, H2 34/1.15, Body 17/1.55 (AR 1.85), UI 14, Caption 12 caps +0.14em (AR 13, no tracking), Figures tnum | `theme.js` `TYPE`, `index.css` | Display/title are clamp()-based; body AR line height 1.95 vs board 1.85; caption AR size | change: align Caption AR to 13 px no tracking; keep 1.95 AR body (audit, longer measure) unless you say otherwise; add `font-variant-numeric: tabular-nums` check on all figures. |
| Roman numerals, catalogue numbers `K·014 R·0318 A·12480 B·0042` always LTR | `kx/Card`, guides | Present on Card and guide parts. Room headers (R·0318, W·0012, L·0007, A·12480, S·0042, N·0001, U·0042) not all present | change (per room, below): add the catalogue tag to each room header, `dir="ltr"`. |
| III Space scale 4–128; grid 12 col/48 margin/24 gutter; mobile 4 col/16/12 | Tailwind spacing, `PublicLayout` | Mobile gutter in app is 16 ✓; desktop 48 margin to check | check |
| Radius 2 px | `SHAPE` (all `rounded-none`) | | ASK (Q5) |
| Rules: 1 px hairline, no shadows | `FRAME` offset shadow | | ASK (Q5) |
| Focus: 2 px resin outline, **2 px offset**; 2 px *text* outline on resin fills | `index.css:124` offset 3 px, one colour | Offset 3→2; on resin fills the ring should be the text colour | change |
| Targets 44 px; 48 px primary actions and inputs | `kx/Button` sizes, `Field` | Primary 48 px / inputs 48 px: check `Button` `md`, `Field` heights | change |
| IV Nav: wordmark, six rooms, `ع`, Pro button; active = 1 px resin underline | `AppNav.jsx`, `SiteChrome.jsx` | Active indicator and 44 px item height to check | check |
| Buttons: primary resin / secondary hairline / text resin / disabled #29231D on muted | `kx/Button` | Disabled uses opacity 50 %, board uses surface-2 fill + muted text | change |
| Inputs: 48 px, surface-1, error border Alert + message in Alert | `kx/Field` | Error styling to check | check |
| Numeric stepper 64 px high, 32 px figure, 64 px buttons, 0.25 g step, mirrors in RTL | `Bench` inputs (44 px buttons, 24/18 px figures) | Bench uses its own stepper buttons | change: new `kx/Stepper` (the sibling session's `Stepper.jsx` is in another worktree and not merged here; I'll write it once, here). 0.25 g step is the board's; calc core untouched, only the UI step size. |
| Weight-scale progress (ticks, label, "Next: …", "x g left", RTL mirror, `role=progressbar`) | `kx/ScaleReadout.jsx` | Exists for the readout; the tick scale with Next line is Bench-mode specific | check |
| Card "material plate" (numeral, K·118, Arabic name, grams, dilution) | `kx/Card` | Plate layout is for Compounding plates, which exist in `compounding/parts.jsx` | matches (Compounding) |
| Chips: 44 px, pressed = surface-2 + resin border + count | `kx/Chip` | Count slot and `aria-pressed` state | change |
| Tabs: 48 px, 2 px resin underline when selected | wardrobe/library tabs | Underline weight/height to check | check |
| Table: sticky header caps 12 px, hover surface-1, `min-width:640` + scroll | guides tables, Journal | Hover row | check |
| Modal 400 px max, close 44 px, catalogue no. over title | no shared modal | Dialogs are ad hoc | change only if a room uses one; otherwise skip |
| Toasts: ok/alert with Undo | none shared | Bench Save notices are inline | skip (no shared toast; add only if a room needs it) |
| Empty ("0 bottles" dashed card + action) and loading (skeleton bars + 2 px progress) | `EmptyState.jsx` | Dashed border, serif count line | change |
| V Icons: 24 px grid, **1.25 px** stroke; direction-aware list marks Forward, Back, Chevron, Library, Log | `components/icons/` | Stroke by optical size (app) vs flat 1.25 (board) | ASK (small): flat 1.25 px, or keep optical sizing? Recommend flat 1.25. |
| VI Motion tokens + RTL (slides and progress run right to left) | `MOTION`, `index.css` | | ASK (Q6) |
| VII Voice, banned words | EN strings | Already tested | matches |

## 2. Homepage and the Compounding

App: `src/site/Home.jsx`, `src/site/compounding/*`, `src/lib/compounding/config.js`.

| Board frame | App file | What differs | Action |
|---|---|---|---|
| Hero autoplay 9.2 s: plates arrive 240 ms stagger, blend, amber, ember, rooms reveal, Skip→Replay, reduced motion static | scroll-driven six stages | Q1 | ASK; if "keep scroll": take copy + timing feel only |
| Headline "16 materials. 1 ember. 6 rooms." + sub "A working room for people who make, wear and study perfume. Built in Cairo." | `Home.jsx` hero copy | Different words | change (EN + AR), after Q1 |
| Counter "00 / 16" and grams | `.cmp-read`, weight scale in grams | Same idea, 10 px mono readout | check; board has 16 px+ tabular Hanken |
| Sixteen plates I–XVI with EN + AR names | `compounding/parts.jsx`, `config.js` list | Owner already marked the sixteen as "to review" | check plate list against board; differences listed, not silently replaced |
| Rooms I–VI cards: number, name, one-line description, figure ("2,150 public recipes") | `Home.jsx` rooms | Descriptions differ; board figures are mock | change copy; **figures are real or omitted** (e.g. no "12,480") |
| The Nose card carries a `Pro` badge | `flags`, Nose is Free | Contradicts decision | skip badge (Q4) |
| Method section: 3 steps + recipe card R·0318 | `MethodSequence.jsx`, `WorkedExample.jsx` | Layout/copy compare | check |
| Pro teaser: numbered features I.., two CTAs | `Home.jsx` / `PlanCards` | Copy and CTA pair | change after reading `Pricing`; Free/Pro split not touched |
| Footer: copyright, EN / العربية, newsletter | `SiteFooter` | Newsletter | skip (Q9) |
| Ember breath 3.2 s loop, smoke 5.4 s loop, ambient ≥2 s | `SmokeField`, `CanvasSmoke` | Loop lengths | change to board values where they differ; reduced motion still static |

## 3. The Bench

App: `FragranceBlendCalculator.jsx`, `calc/*`, `BenchMode.jsx`, `Batches.jsx`, `journal/*`.

| Board frame | App | What differs | Action |
|---|---|---|---|
| 2a–2d header: "I · The Bench", "Weigh a formula.", R·0318 | calculator header | Title/tag | change (EN+AR); `Weigh a formula.` kept only if it fits dilution; else ASK |
| Inputs: batch size stepper ±5, unit toggle g/ml, basis w/w vs v/v, concentration ±1 % | calculator | Same controls, different look | change (Stepper, 48 px) |
| Results: Concentrate / Ethanol 96% / Total batch, tabular, units visible | readout | Layout/labels | change labels only; numbers from `calculate()` |
| "of which water (4 %)" and ethanol 0.807 | calc core uses 0.81 | Different constant | skip (calc core is off limits); no water line unless owner supplies the rule |
| Mode toggle Raw materials / Fragrance blend | none | Q2 / Q3 | ASK / skip |
| Formula table with weigh-and-tick lines, Roman numeral, grams, %; scale bar "Weighed 14.40 / 20.00 g", "Next: …" | `BenchMode.jsx` checklist | Board couples ticks to a weight scale | change: scale + Next line on Bench mode (250 ms ease-out per tick, 150 ms row tint) |
| Resting card: day dial 0–42, started / opens dates, "Remind me", "Log a shake" | `RestingLine`, Journal timeline | Reminders need SMTP (not built); "shake" log is new data | change the display (days left, dates); skip Remind me (no SMTP) and Log a shake (new data), unless you approve |
| Batches list: B·0042, name, g, status (Resting / Ready), ratio 1 : 4 | `Batches.jsx` | Ratio chip, catalogue no. | change |
| Storyboard 2e/2f: scale fill 250 ms ease-out, row tint 150 ms, figures instant, stepper hold-repeat 120 ms, resting marker static | `.fill-anim` 240 | Hold-to-repeat on stepper new; figures already never animate | change |
| Mobile 375: result strip, steppers | phone result strip (audit) | Compare | check |

## 4. The Wardrobe (flag on in production)

App: `src/components/wardrobe/*`, `src/lib/wardrobe/*`.

| Board frame | App | What differs | Action |
|---|---|---|---|
| Tabs Collection / Wear log / Tonight; header W·0012 | tabs Today / Collection / … | Names and order | change tab labels/order (routes unchanged; ASK if a tab name changes a URL) |
| Collection grid: numeral, family, name, house, ml left / size | `Collection.jsx` numbered grid (audit #6) | Card contents, ml bar | check |
| Bottle detail: remaining / size, notes by tier, wears, last worn, opened date, **spray stepper with "≈ ml"**, "Log a wear" + Undo | bottle view | Spray ≈ ml and Undo | change if data exists (`sprays` already optional); "≈ ml" = sprays × 0.1 ml is a board constant → ASK before showing a derived figure as fact |
| Wear log: 28-day strip, table (date, bottle, occasion, °C, sprays), stats (wears this month, most worn, avg sprays) | `Stats.jsx`, `Lists.jsx` | Strip and table layout | change |
| Tonight: temperature stepper + occasion chips, ranked picks with "why", "Wear this" | one-question picker (temperature folded) | Board shows temperature up front again | change: temperature stepper visible with occasion (board over audit #7); one answer large kept |

## 5. The Library

App: `src/site/GuidePage.jsx`, `GuidesIndex.jsx`, `src/content/glossary.js`.

| Board frame | App | What differs | Action |
|---|---|---|---|
| Index: tabs Essays / Glossary, featured article, category chips with counts, rows (cat · min) | `GuidesIndex.jsx` | No glossary tab; featured card | change: Glossary tab from the existing glossary entries only (the board's 412 terms are mock and invented; app has only verbatim handbook terms) |
| Article: cat, minutes, date, drop headline, reading progress, numbered sections, pull quote, table, recipe inline R·0318 | `GuidePage.jsx` | Layout details, in-text terms "underlined in resin, open in place" | change: in-place popover is a `<details>`/disclosure, no script (already in-place per audit; restyle to resin underline) |
| Opener motion (cinematic allowed) | chapter opener | Compare | check |
| Glossary count "Showing 8 of 412" | | Mock | skip count; show the real number |

## 6. The Atlas (flag on, signed-in only)

| Board frame | App | What differs | Action |
|---|---|---|---|
| Index: family chips with counts, era chips (before 1980, 1980–99, 2000–09, 2010+), sort A–Z / Year, clear filters, result rows with A·number | `Search.jsx` year from/to fields, `ResultList.jsx` | Era chips vs numeric fields; family counts need data | change: era chips map to the existing from/to; family counts only if the API already returns them (else omit; no new API) |
| Title "12,480 fragrances." | | Mock | real count if the existing search answer carries it; else no number |
| Detail: accords as bars with %, notes pyramid, house, country, "In the Atlas", same family, Add to Wardrobe | `FragrancePage.jsx`, `Pyramid.jsx` | Accord bars animate 3 s on open (board `play`) | change (bars 600 ms ease-out, static under reduced motion); "In the Atlas (house count)" only if available |
| "Use in a blend" | none | Q3 | skip |

## 7. The Salon (flag on, signed-in only)

| Board frame | App | What differs | Action |
|---|---|---|---|
| Profile header (cinematic): avatar initials, name, handle, place, bio, stats, Follow, Share; S·0042 | `Profile.jsx` | Header layout; stats | change |
| Tabs Recipes / Reviews / People with counts | Feed tabs (all/recipe/review/following) | Different tab set | ASK-small: board adds a People tab (needs a followers list API); build Recipes and Reviews, skip People unless an endpoint exists |
| Recipe card: materials list in grams, saves count, "Save recipe", "Open in the Bench" | `PostCard.jsx` (like, notebook page) | "Saves" and "Open in the Bench" are new | skip Save/Open (Q3, new data); keep like |
| Review: rating x / 5, text, date, "helpful" count | review post | | check |

## 8. The Nose (flag on in production)

See Q4. Rows once answered:

| Board frame | App | What differs | Action |
|---|---|---|---|
| Header "Ask. It has read your shelf." N·0001, shelf line + usage line | `Nose.jsx` | Copy | change copy |
| Conversation with recipe card | one-shot result list | Q4 | skip (behaviour) |
| Thinking state "Reading your shelf" | spinner/text | | change (ambient 2 s, static under reduced motion) |
| Shelf sidebar: owned bottles with last worn | `Shelf` (below the picks) | Placement, last-worn | change layout; last worn only if Wardrobe data is already read |
| Free usage "1 / 3", resets note, Pro gate | quota 8/h, 25/day | Q4 | change to real limits (8 / 25), no Pro gate |

## 9. Account and Auth

| Board frame | App | What differs | Action |
|---|---|---|---|
| Auth: form left, panel right (title, meta), K·0000 | `AuthGate.jsx` (split with WorkedExample) | Compare; password fields | change layout/copy; skip passwords (Q8) |
| Settings: profile (avatar initials, name, handle, bio), units/prefs, toggles, plan usage, export, delete with confirm, "Saved" | `Account.jsx` sections (Plan, Preferences, Data, Delete) | Profile editing is in the Salon profile, not Account; usage shows mock 1/3 and 6/10 | change visual structure; plan usage shows real caps; profile editing stays where it is unless you say move it |
| U·0042 catalogue tag | | | change |

---

## Order of work after go-ahead

Design System (tokens that Q5/Q6 approve, Stepper, Chip, Button, focus, empty states) → Homepage → Bench → Wardrobe → Library → Atlas → Salon → Nose → Account. One commit per room, checks per room as listed in the brief, screenshots to `docs/redesign/phase-board-sync/<room>/`, CLAUDE.md "Current phase" entry at the end. Snapshot baselines regenerate only for changed screens.

## Mismatch log

(Filled in during implementation.)
