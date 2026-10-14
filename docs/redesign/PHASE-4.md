# Phase 4 — The Wardrobe (flagged)

Branch `redesign/kyphira-p4-wardrobe` (off `redesign/kyphira-p3-bench`). The room is **off by default** behind the `wardrobe` flag.

## The flag (`src/lib/flags.js`)
- On at build time with `VITE_FLAG_WARDROBE=1`, or on one device by opening any page with `?flag=wardrobe` (`?unflag=wardrobe` clears it), so the room can be tried on a deployed preview without a rebuild.
- Off: `/wardrobe` returns to `/bench`, and the nav has no Wardrobe link.
- A flag decides only what is *shown*. All Wardrobe data is private to its owner by RLS, so turning it on in a browser exposes nothing.
- Nothing was flipped on any deployment.

## What was built
- **Collection:** owned bottles and decants (name, optional catalog link, size, fill level, price and currency, purchase date, family, reach, wardrobes, note), edit, delete (second tap, takes its wear log with it), fill-level slider, wear count and cost per wear.
- **Today (what to wear):** temperature, time of day, occasion in; the top three of *your* bottles out, each with the reasons for its score, plus the handbook's spraying principle (and fewer sprays when it is hot). "Wore this" logs the occasion, time, temperature, sprays and a note.
- **Statistics:** most and least worn, by season (hemisphere switch), by temperature band, by occasion, running low, cost per wear.
- **Lists:** wish list and tested list; "I own it now" moves a bottle across. A wish-list bottle can't be worn (database rule) and is never suggested.
- **The method as data** (`src/lib/wardrobe/framework.js`): the Five Wardrobes as categories, the temperature bands (30+, 20–30, 15–20, below 15), the eight occasions, the four social-distance bands, the decision tree. No bottle of yours is named anywhere in code, copy or tests.
- **Data:** `0024_wardrobe.sql` (+ down): `wardrobe_bottles`, `wear_log`; owner-only RLS; a wear row can only point at the same user's bottle; caps of 300 bottles and 20,000 wearings; value checks. In the export. **Staging only.**

## Where the code reads the handbook, and where it is my judgment (please review)
- **From the handbook:** the cluster names, the temperature bands, the occasion list and which wardrobes serve each, the rule of restraint, the social-distance bands, rotation discipline ("you'll overuse your all-rounder"), "wear slightly less than your first instinct", the Cairo heat principle.
- **Mine:** the point values (e.g. hot weather +3 for fresh, -3 for amber), the projection ceiling per occasion (office/client/relaxed: personal; most others: social; nightlife: statement), half weight for a wardrobe guessed from a family, the rotation penalties (−3 worn today, −2 within 3 days, +1 after 14 days). They sit at the top of `suggest.js`, one number each. Every point is shown to the user as a sentence, so a wrong weight is visible, not hidden.

## Not done
- **Atlas link:** the picker finds bottles in the existing 81.8k-row catalog; the Atlas room is Phase 5.
- **Live weather:** the temperature is typed. A weather lookup is a third-party service and sends a location: your call (open question 2).
- **Your own collection as demo data:** not seeded (needs your explicit approval; the empty state is designed instead).
- **Library Wardrobe guides** ("Choosing") still wait on your neutral-example approval.
- **Community wear stats on fragrance pages:** aggregate, privacy-reviewed, Phase 5/6.
- **Wardrobe visual-regression snapshots:** signed-in screens are covered by axe, overflow at 320 px and e2e, not pixel snapshots.
- Hemisphere choice isn't saved between visits.
- Not pushed; migration 0024 not on production.

## Tests
Vitest 571 passed. Playwright (local Chrome) 282 passed, 34 skipped (macOS visual baselines). New: 42 Wardrobe logic tests (picker, rotation, restraint, stats, form checks), 9 flag tests, 6 e2e scenarios on phone and desktop (flag off and on, ?flag link, add bottles, ranked pick with reasons, logging, statistics, wish list, bad values, and Arabic at 320 px with axe on all four sections). ESLint 0 errors; `tsc` clean. RLS: 15 Wardrobe checks pass on **staging** (also added to `supabase/tests/rls_isolation.sql`).

Two real bugs the tests caught while writing: `Number(null)` and `Number("")` are 0, which read an unknown fill level as "empty" and a blank temperature as 0 °C.

## Lighthouse (mobile)
Not run: the room is signed-in and flagged. Public pages unchanged since Phase 2.

## Risks and open questions
1. **Free or Pro?** Built Free, capped (300 bottles). Pricing is your call.
2. **Weather:** typed only (recommended for now), or a free no-key weather lookup (sends the city to a third party)?
3. **Review the scoring numbers** above, and the Arabic strings (drafts).
4. **Production:** 0021–0024 pending your SQL approval and the backup.
