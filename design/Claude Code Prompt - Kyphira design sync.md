# Claude Code prompt: sync the app to the Kyphira design boards

Paste everything below into Claude Code, run from the `scent-handbook-app` repo root. Copy the board files into `Design/boards/` first (list at the bottom).

---

## Task

Bring the app's UI in line with the Kyphira design boards in `Design/boards/`. The boards are the source of truth for layout, tokens, copy and motion. Implement only the differences between the boards and the current app. Do not redesign anything the boards don't change.

Read `CLAUDE.md` first (project rules, flags, current phase), then `docs/redesign/DESIGN-BRIEF-AUDIT.md` (what is already done) and `Design/Kyphira_Brief_v5.md` (the brief the boards answer).

## Method (follow in order)

1. **Branch.** Create `redesign/board-sync` from the current redesign branch. Never touch `main`. Small commits, one per room.
2. **Gap list before code.** For each board, write a table to `docs/redesign/BOARD-SYNC.md`: board frame → app file → what differs (layout, token, copy, state, motion, RTL) → action (change / already matches / skip with reason). Show me this file and wait for my go-ahead before editing source.
3. **Implement room by room**, in this order: Design System tokens/components, Homepage (Compounding), Bench, Wardrobe, Library, Atlas, Salon, Nose, Account/Auth.
4. **Verify each room** before moving on (see Checks).

## Board → code map

| Board | App code |
|---|---|
| Design System | `src/lib/theme.js`, `src/index.css`, `tailwind.config.js`, `src/components/kx/*` |
| Homepage Board, Compounding | `src/site/Home.jsx`, `src/site/compounding/*`, `src/lib/compounding/config.js` |
| Bench Board | `src/components/FragranceBlendCalculator.jsx`, `calc/*`, `Batches.jsx`, `journal/*` |
| Wardrobe Board | `src/components/wardrobe/*`, `src/lib/wardrobe/*` |
| Library Board | `src/site/GuidePage.jsx`, `GuidesIndex.jsx`, `src/content/glossary.js` |
| Atlas Board | `src/components/atlas/*`, `src/lib/atlas/*` |
| Salon Board | `src/components/salon/*`, `src/lib/salon/*` |
| Nose Board | `src/components/nose/*`, `PerfumerChat.jsx` |
| Account Board | `Account.jsx`, `Onboarding.jsx`, `AuthGate.jsx` |

## Hard rules

- **Tokens:** use only the existing palette (dark: ground #15120F, surfaces #1E1A16 / #29231D, hairline #3B332B, text #EDE4D6, muted #A3968A, resin #D4924A). Add or change a token only if a board shows a value the app lacks, and say so in the gap list. No one-off colours or styles.
- **Type:** Newsreader (display), Hanken Grotesk (UI), Noto Naskh Arabic (Arabic display), IBM Plex Sans Arabic (Arabic UI). Tabular figures for every measurement.
- **Digits:** Western digits everywhere (owner decision). Keep it.
- **Bilingual parity:** every changed screen ships EN and AR together, RTL fully mirrored (icons, progress, scale, steppers). Use logical Tailwind utilities, not left/right. New Arabic strings are drafts: mark them `needsReview` as the repo already does.
- **Voice:** short sentences, numbers before adjectives. Banned: revolutionary, ultimate, unlock, elevate. Real perfumery content, no lorem.
- **Accessibility:** AA contrast (the contrast unit tests must stay green), visible focus ring, 44 px touch targets, reduced-motion static layout.
- **Motion:** use the board's motion spec: fast 150 ms, base 250 ms, slow 600 ms, ambient 2 s+, one ease-out, one ease-in-out. Calculator figures never animate. Cinematic motion only in the Home hero, Library openers, Salon profile header.
- **Flags:** respect `src/lib/flags.js`. Do not change flag defaults or production env. Do not apply migrations, edit Supabase, or touch `.env*`. No schema changes are expected; if a board needs one, stop and ask.
- **Don't break:** the calculation core (`src/lib/calc`, `formulation.ts`), golden tests, entitlements, the privacy guard (`scripts/private-terms.mjs`).
- Keep the brand from `src/brand.js`. Do not rename the repo or Vercel project.

## Checks (per room, before commit)

- `npm run lint`, typecheck, `npm test` (Vitest) all green.
- Playwright for that room (`e2e/<room>.spec.js`, plus `a11y.spec.js` and `viewports.spec.js`) at 375 and 1440, EN and AR. Update a spec only when the board intentionally changed the DOM, and say why.
- Screenshots of all four variants (375/1440 × EN/AR) saved to `docs/redesign/phase-board-sync/<room>/` with `scripts/screenshots.mjs`, compared side by side with the board frame. List any visible mismatch in `BOARD-SYNC.md` instead of hiding it.
- Visual snapshot baselines: regenerate only for screens you changed, and list them.

## Done means

- Every row of `BOARD-SYNC.md` is "matches", "done" or "skipped, with reason".
- All four variants of every room look like their board frames.
- Update the "Current phase" section of `CLAUDE.md` with a short entry (date, branch, what changed, what the owner must review, open items). No push, no merge, no deploy: stop with the branch ready for my review.

## Ask me before

- Changing any token value, any route, any flag, any copy that is not in a board.
- Anything a board shows that needs new data or a new API.

---

Board files to copy into `Design/boards/`: Design System, Compounding, Homepage + Board, Bench + Board, Wardrobe + Board, Library + Board, Atlas + Board, Salon + Board, Nose + Board, Account + Board (all `.dc.html`), plus `support.js`.
