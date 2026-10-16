# Kyphira exact: board → app map

Branch `redesign/kyphira-exact` (local, not pushed). Boards: `Design/boards/*.dc.html` plus `Design/boards/support.js`, the brief `Design/Kyphira_Brief_v5.md`, logo files `Design/boards/assets/`.
Written 2026-10-16 before the work, updated as each room was built. Screenshots: `docs/redesign/phase-kyphira-exact/<room>/<width>-<lang>.png` (dark edition, made by `scripts/screenshots.mjs` with `KYPHIRA_ROOMS=1`).

## Decisions taken (and why)

| Question | Decision |
|---|---|
| Light or dark by default | **Light stays the default.** `CLAUDE.md` records it as the owner's decision (2026-10-16), and the earlier sync brief repeats it. The boards are the dark edition, which already holds the boards' colours exactly. Every screenshot is the dark edition. Flipping the default is one line (`index.html` and `tailwind.config.js`); not done without your word. |
| Content the boards show but the app does not have | Not invented. See "Not built" below. |
| Fake figures on the boards (412 terms, 12,480 fragrances, 2,150 recipes, 1.2 yr, 1/3 free questions) | Replaced by real counts where the app has them (guides, glossary terms, owned bottles, wearings), otherwise by a true statement. |
| Nose "PRO" badge and Pro gate after three answers | Not built. Owner decision (2026-10-16): the Nose stays Free; limits are the server's (`nose_limit`). |
| Newsletter form in the footer and home page | Not built. There is no backend for it and the repo's rule is no anonymous email field (waitlist stays a link). |
| Password sign-in, Create account tab, Forgot it, Show password | Not built. The auth provider is magic link plus Google; the brief says to keep it. |
| Migrations, env, flags, schema | None touched. |

## Design system (board "Design System")

| Item | App | Was | Now | Status |
|---|---|---|---|---|
| Colour tokens | `src/lib/theme.js` | dark palette already equal to the board | adds `afternoon` #3A2B1E (hero only) and `resinHover` #E3A866; contrast tests green | done |
| Type | `tailwind.config.js`, `src/index.css` | Newsreader, Hanken, Noto Naskh, Plex Arabic already in | no monospace any more: `font-mono` resolves to Hanken Grotesk with tabular figures, `tabular-nums` on `body` | done |
| Radius | `SHAPE`, 125 `rounded-none` | square | 2 px (`rounded-sm`) everywhere; circles only for the ember and avatars | done |
| Focus | `src/index.css` | 2 px, 3 px offset | 2 px resin, 2 px offset; ink outline on resin fills (`.on-resin`) | done |
| Motion tokens | `MOTION` in `theme.js`, CSS variables | 180/320/480 ms | fast 150, base 250, slow 600, ambient 2 s+, the board's ease-out and ease-in-out | done |
| Nav | `src/components/SiteChrome.jsx` | brand + tagline + icon links | wordmark, six room tabs with the resin rule under the current one, 44 px language button, Sign in and Pro (site) or Account, Sign out, theme (app); phone: menu with Roman numerals (site) | done |
| App section tabs | `AppNav.jsx` | framed icon row | underlined tabs; the phone bottom bar is kept (the board has none for the app, and the e2e specs rely on it) | done |
| Footer | `SiteChrome.jsx` | ink band | mark, "Built in Cairo.", the handbook line and safety line, rights, EN/AR switch | done (no newsletter, see above) |
| Components | `src/components/kx/` | Button, Card, Field, Chip, Notice, ScaleReadout | new `RoomHeader`/`RoomPage`, `Tabs`/`TabLinks`, `Stepper`, `WeightScale`; `Chip` takes `pressed`/`count`; `FragranceCard` is a ruled row | done |
| Catalogue numbers, Roman numerals | `src/lib/catalogue.js` | — | `roman()`, `cat()` with tests | done |
| Logo | `kx/KyphiraLogo.jsx` | symbol, horizontal, stacked | adds `wordmark` from the board's SVG, drawn in `currentColor` | done |
| Toast, modal, table, empty and loading states | `Notice`, `EmptyState`, per-room tables | existing | restyled through the tokens only; no new component was needed | matches |

## Rooms

| Board | App files | What changed | Not built / differs | Status |
|---|---|---|---|---|
| Homepage Board, Homepage, Compounding | `src/site/Home.jsx`, `HomeSections.jsx`, `compounding/Hero.jsx`, `src/lib/hero/timeline.js`, `src/content/hero.js` | The 9.2 s autoplay as a pure function of time (tested): 16 plates, blend to amber, dusk, ember, smoke, headline, six rooms; Skip jumps to the resting frame then becomes Replay; resting frame in the prerender; reduced motion shows it at once with no smoke, no breath, no control; ember fades with the first 60% of the scroll exit; paused off-screen and in hidden tabs. Rooms grid, method card, Pro section | Room cards use real figures; Pro list is the app's real Pro features; no Pro badge on the Nose; the old scroll scene (six stages) and its `/dev/motion` page were replaced (the dev page now scrubs the new hero). The FAQ stays below Pro (SEO content the boards do not show) | done |
| Bench Board, Bench | `FragranceBlendCalculator.jsx`, `journal/BenchSide.jsx` | Room header, mode tabs, batch-size and concentration cards with steppers (44 px targets), the three-figure strip, the Formula with tick lines and the weight-scale progress, the Resting card and the latest batches beside it | The board's **Raw materials** mode (a formula builder from raw materials) and its fragrance-blend-by-parts mode are not built: the product is not a raw-material formula builder (`CLAUDE.md`). The four existing modes (Bottle, Oil on hand, Change strength, Several bottles) are the tabs. The calculation core is untouched; no result animates | done, with the gap |
| Wardrobe Board, Wardrobe | `wardrobe/Wardrobe.jsx`, `Collection.jsx`, `lib/wardrobe/stats.js` | Header with the bottle count, tabs, family chips with counts, plates with a fill rule, the selected bottle beside them (remaining, notes from the catalogue when linked, wears, last worn, opened, sprays stepper, Log a wear), edit and delete kept | The board's "Wear log" and "Tonight" tabs are the app's Today, Statistics and Lists tabs. "≈ 0.4 ml per spray" is not shown (no source for the constant) | done |
| Library Board, Library | `site/GuidesIndex.jsx`, `GuidePage.jsx`, `content/glossary.js` | Header, Guides and Glossary tabs, featured guide, section chips with counts, ruled list with catalogue numbers, search kept; reading page with the cinematic opener (glow, three title lines, resin hairline, standfirst, 3.2 s once, still under reduced motion), section numerals, evidence and callouts kept | The board's seven essays and 412 terms are placeholders: the page lists the 15 real guides and the 6 terms the handbooks define. The glossary card in the margin is not built (terms already link to the definitions at the foot of the guide) | done |
| Atlas Board, Atlas | `atlas/Atlas.jsx`, `Search.jsx`, `ResultList.jsx`, `FragrancePage.jsx`, `Pyramid.jsx` | Filter sidebar with family and era chips that apply at once, ruled result rows with catalogue numbers, fragrance page with accords, notes, house card, Add to Wardrobe, Use in a blend, related | **Sort A–Z / Year** is not built: `atlas_search` has no sort argument (a database change). Accord bars with values are not shown: the catalogue stores accord names, not strengths. The total in the headline ("12,480 fragrances") is not known without a query, so the headline is "Find a fragrance." Result numbers are positions, not stored ids | done, with two gaps |
| Salon Board, Salon | `salon/Salon.jsx`, `Profile.jsx`, `Feed.jsx`, `PostCard.jsx` | Profile header with the three-step arrival and ambient glow, monogram, stats, Follow (+1/−1 at once), Share, Recipes and Reviews tabs, recipe cards in a grid with a strength bar | Recipe cards show size, strength, density and family (the post's snapshot), not ingredient lines: posts do not hold them. Tab counts per kind and a Following tab are not built (no per-kind counts in the API). Privacy model untouched | done, with the gap |
| Nose Board, Nose | `nose/Nose.jsx` | Header, conversation thread (this screen only), the thinking card while a request is open and gone when it ends (no fake delay), picks as ruled rows, shelf side card from the user's own Wardrobe, composer with starters | The "free questions 1/3, resets in 6 h" card is not shown: the API does not report usage. The Pro gate frame is not built (the Nose is Free). The board's formula card (Resin Study) is not built: the Nose returns catalogue fragrances, not formulas | done, with gaps |
| Account Board, Account | `AuthGate.jsx`, `Account.jsx` | Sign-in split with the glow, mark and "Weigh. Rest. Wear."; settings with a side list (Units and language, Plan, Data and account); destructive actions keep their typed confirmation | No password, no Create account tab, no Profile or Notifications panes (no such data in the app; the Salon profile is edited in the Salon) | done, with gaps |

## Bilingual

Every new string has an Arabic version in `src/i18n/messages/ar.js`. The room names, hero copy, rooms-grid copy and method steps are the boards' own. **Drafts for the owner's review** (written here, not on a board): the Pro list on the home page, the Bench side-column labels, Library headline, tabs and glossary line, the Atlas headline/era/house-card labels, Salon headline and Share, Nose headline, placeholder and thinking line, Wardrobe headline and detail labels, Account pane names, sign-in side line.

## Checks run

See "Verification" at the foot of this file.
