# Brief for the lawyer: what Kyphira now does that the draft `/privacy` and `/terms` do not yet cover

Status 2026-10-15. The draft pages (`src/content/legal.js`) predate the Wardrobe, Atlas, Salon and Nose. Four rooms are still off (flags), so none of this is live for users yet; each needs its wording settled before its flag goes on. Plain description of behaviour only; no legal conclusions are drawn here.

## Salon (user-generated content; migration 0027, not yet on production)

- People can publish recipe posts and fragrance reviews and follow each other. Posts are visible **only to other signed-in Kyphira users**, never to the open web or search engines. A profile is private until its owner turns "public" on; turning it off hides everything at once; "remove my profile and posts" deletes them.
- A recipe post shares only the blend (size, strength, the densities the user set). Never private notes, costs, stock or batches.
- No links anywhere (a heuristic filter). Daily limits: 10 posts, 300 likes, 500 follows, 20 reports.
- Anyone can report a post or a profile; three reports from accounts at least 7 days old hide a post until an editor looks. Editors (rows in `admins`) can hide, restore, dismiss, suspend and lift suspensions; every decision is logged and nothing is deleted by moderation.
- Account deletion cascades to all of a user's Salon data.
- Questions: terms for user content (licence granted to Kyphira, takedown process, repeat infringers), who is responsible for unsafe recipes (the Salon page carries the ethanol-flammability and "densities are starting points" notice), recipe names that contain trademarks (already open, LAUNCH #15), minimum age, and whether "public" should ever mean the open web.

## Nose (AI assistant; no migration)

- A signed-in user types a description of a scent. The text is sent to **Google's Gemini** to be read and to choose among fragrances Kyphira found in its own catalog. Kyphira does not store the question or the answer; the server log keeps only the outcome, timing and count (no text, no user).
- Health, allergy, pregnancy, children and "cures" questions are turned away with a pointer to a doctor or pharmacist. The page says it gives no health advice.
- The free Gemini tier's terms may allow Google to use prompts to improve its products (also an open item for Ask, LAUNCH #7). Options: a paid key, or the current disclosure.
- Questions: wording of the disclosure, whether a consent step is needed, and the effect of sending text to a US provider.

## Atlas and the catalog

- See `DATA-ROUTE.md`: the catalog's source rights are unresolved and this blocks a commercial launch of the Atlas.
- Atlas contributions: a signed-in user may suggest a fragrance; it is pending until an admin approves it. Questions: who owns a contribution and who is responsible for it.
- Optional anonymous wear counts ("wear opt-in", `profiles.wear_stats_opt_in`, off by default): the Atlas shows a fragrance's owner and wearer counts only when at least 10 opted-in people with accounts older than 7 days have it, as rounded bands (10, 25, 50, 100, 250+), never individuals; occasions only where at least 10 people share one.

## Wardrobe

- A private list of the user's bottles and a wear log. Nothing leaves the account; it is included in the data export and removed with the account. Typed temperature only (no location).

## Existing items still open

- All `[OWNER: ...]` placeholders in `src/content/legal.js`; Arabic text of both pages; supervisory authority and liability wording; backups and retention once Supabase Pro is on; `REPORT_EMAIL` for shared recipes.
