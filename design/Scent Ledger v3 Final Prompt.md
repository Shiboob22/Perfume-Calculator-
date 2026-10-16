# Scent Ledger v3 — Final Build Prompt

Build **Scent Ledger v3**: a premium, editorial web app for diluting fragrance oil with 96% ethanol by weight (0.01 g precision). It grew from a printed handbook in three volumes (Application, Wardrobe, Formulation). The tone is a quiet bench handbook, not a SaaS dashboard: paper, ink, and one warm oil accent. English LTR and Arabic RTL editions.

## 1. Tokens
- Colours: paper `#F6F2EA` (page) · card `#FBF8F2` · sand `#EEE8DC` (secondary surfaces, hover) · rule `#D9D1C2` (hairlines) · ink `#100E0A` (text, frames) · ink-2 `#3A352D` (body) · mute `#5A544A` (labels) · forest `#1F4A36` (primary action, active, saved) · forest-dark `#163828` (hover) · oil `#C99A45` (single accent) · mist `#E4EBE5` (ethanol) · error `#9B2C1F` on `#FBF1EE` / `#F6E6E1`, border `#E5C9C1`.
- Type: Poppins 400/500 (UI, headings, tight tracking −0.02 to −0.04em) · Lora regular/italic (body copy, numerals I/II/III, italic display line) · IBM Plex Mono 400/500 (all numbers, tabular). Arabic: Tajawal (UI) + Amiri (body).
- Labels: 11–12px uppercase, 0.14–0.16em tracking, mute colour.
- Shape: square corners on all frames and buttons; 1px ink frames for primary objects, 1px rule hairlines inside. Offset paper shadow (`8px 8px 0 #EEE8DC`) only on the hero bench and recipe card.
- Motion: 180ms `cubic-bezier(.2,0,0,1)` for hover/colour; 420–520ms same curve for bottle fill, ratio bar and timeline bars. Respect `prefers-reduced-motion`.
- Targets ≥ 44px; focus ring 2px forest, 3px offset. Text contrast ≥ 4.5:1.

## 2. Icon system (custom drawn, React components)
- 24×24 grid, 2px safe padding, `fill="none" stroke="currentColor"`, round caps and joins.
- Stroke by optical size: 18px → 1.6 (drop secondary details), 24px → 1.5, 32px → 1.25, 44px+ → 1.1, 96px → 0.9.
- Exactly **one accent fill per icon** in oil (≤ 25% of the icon area). State icons swap the accent: forest for saved/today, red for error/flammable.
- Stroke colour inherits from context: ink by default, forest when nav is active, paper on ink surfaces.
- Featured icons sit in a square tile (48–60px, 1px ink border, card fill). Never in circles, never with gradients or drop shadows.
- Set (name → meaning → accent):
  - `Book` → Guides (ribbon bookmark)
  - `Balance` → Calculator / bench (left pan)
  - `Notebook` → Journal (bookmark tab)
  - `Seal` → Pricing / batch Ready (wax centre)
  - `ScaleDrop` → Principle I, weigh (drop)
  - `Steps` → Principle II, method (first step dot)
  - `Flacon` → Principle III, recipe card, brand (liquid)
  - `Bookmark` → Save idle · `BookmarkCheck` → Saved (forest fill, paper check) · `DiamondAlert` → Error (red)
  - `FlameTriangle` → flammable warning (red flame)
  - `Crosshair` → precision rule (centre dot)
  - `Hourglass` → batch Resting (lower sand)
  - `Drop` → check-in and density inputs (lower half; mist variant for ethanol)
  - `Today` → forest diamond with paper centre
  - `Copy`, `Link`, `Download`, `Arrow`, `Check`, `Plus`, `Bell` → line only, no accent
- Brand mark: flacon with solid ink cap and oil liquid line, wordmark "Scent Ledger" + italic Lora tagline "The bench handbook".

## 3. Global chrome
- Header (all pages): brand left; nav right with 18px icon + label — Guides, Calculator, Journal, Pricing — then a hairline divider and "العربية". Active item is forest with a 1px forest underline.
- Footer (ink): italic Lora line about the three-volume handbook, flacon mark, credit "Hisham Shiboob · Scent Ledger", and the flame icon + "Ethanol is highly flammable. Keep away from flame, heat and children."
- Bench state (bottle, strength, densities) is shared between Home and Calculator.

## 4. Pages
**01 Home**
- Hero: eyebrow "III · Formulation — The bench"; H1 "Weigh it. / Pour it. / *Let it rest.*"; Lora intro; primary forest button "Open the calculator →", secondary underlined "Read the guide" with Book icon.
- Bench widget (framed card with offset shadow): header with Balance icon + "No. 015"; bottle size segmented (10/30/50/100 mL), strength segmented (15 EDT, 20 EDP, 25 Intense, 30 Extrait); animated flacon fill; oil and ethanol grams in Plex Mono; footer with red flame warning and "Full bench →".
- Three principles with 60px icon tiles (ScaleDrop, Steps, Flacon) and Lora italic numerals I/II/III.
- Guide library: three rows (numeral, title, description, minutes, arrow).
- Pricing teaser band: Seal icon, "Free, and Pro", "Compare plans →".
- FAQ: details rows with square Plus tile.

**02 Calculator**
- Left form: bottle size + custom mL input; strength; densities with Drop icons (oil 0.95, ethanol 0.81 g/mL, editable).
- Right results: large animated flacon; oil and ethanol grams (44–72px mono); oil/ethanol ratio bar with "x : y by weight" and density readout.
- Actions: Save batch (idle forest → Saved "open journal" mist/forest → Error red "Couldn't save — retry"), Copy recipe (→ "Copied"), Recipe card. Any input change resets Save to idle.
- Tinted safety callout with FlameTriangle below.

**03 Guide (article template)**
- Eyebrow with Book icon "Guide II of III · 8 min"; 104px title; italic standfirst.
- Sticky contents rail (i–iv) with forest active bar; "Try it on the bench" button with Balance icon.
- Body in Lora 19px/1.7, drop cap, mono formula block between ink rules, worked-example table.
- Precision rule callout: card fill, 56px forest-bordered tile with Crosshair, "Precision rule 3 / 5", italic rule.
- Safety: red-tinted note with FlameTriangle.
- Prev / Next footer.

**04 Journal (Pro)**
- Left list "Batches" with count; each row has a 36px tile: Hourglass (resting) or forest Seal (ready), name, day x/y, spec, status. Selected row: sand fill + forest left bar. "+ New batch".
- Right panel: name, spec and grams, large "day / target d".
- Timeline: 30 bars growing with time (oil past, forest today, rule future); Drop marks over check-in days, forest Today diamond; legend.
- Notes list with Drop icon, mono day and Lora text; empty state in italic. Check-in form with disabled state until text is entered.

**05 Recipe card (public)**
- Sand page; framed card with offset shadow; "Recipe card · No. 014"; title "Fig & *Cedar*"; author/date; 96px Flacon.
- Spec row (Bottle / Strength / Rested), oil and ethanol grams, ratio bar, quote introduced by a Drop.
- Actions: Copy link (Link icon), Download card, "Make this recipe →" (forest).

**06 Pricing**
- H1 "The bench is free. *The journal is Pro.*"
- Free panel (card, Balance tile, "0", forest CTA) beside Pro panel (ink surface, Notebook tile, oil "Not on sale yet" tag, email waitlist with Bell → success line with oil Check).
- Feature table with forest Check icons and em dashes.

## 5. Arabic edition
Mirror layout with `dir="rtl"` and logical properties. Do not mirror the icons except directional ones (Arrow, prev/next). Numbers stay in Plex Mono, Western digits. Replace uppercase tracking with 0 letter-spacing; raise line-height to 1.3 on display type.

## 6. Deliverables
- Pages above as responsive layouts (fluid from 360px to 1440px, max content width 1280px).
- Icons exported as individual React components (`<IconBook size={24} />`) reading `currentColor`, with `size` driving stroke width per the optical table.
- No emoji, no gradients, no rounded cards, no left-border accent cards.
