# Phase 6: The Salon (flagged, with moderation)

Branch `redesign/kyphira-p6-salon`, stacked on Phase 5. Flag `salon` (`?flag=salon`, or `VITE_FLAG_SALON=1`); off, `/salon` returns to the Bench and the nav has no Salon link. Signed-in only.

## What it is

People who choose to can share recipes and fragrance reviews, like and follow. Everything is private until a person turns their profile public, and "public" means visible to other signed-in Kyphira users, not to the open web.

- **Profile** `/salon/me`: handle (3–30 letters, digits, underscore), optional name and bio, a public switch (off by default). Turning it off hides the profile and every post at once. "Remove my Salon profile and posts" deletes the profile and the author's published posts.
- **Recipe post**: a snapshot of a saved recipe's latest version: bottle size, unit, strength, and the densities that were set. Never the recipe's private note, costs, stock, batches or supplier. "Open on the Bench" opens the blend in the calculator, where the safety copy lives. The Salon page itself carries the ethanol and "densities are starting points" notice.
- **Review**: one per person per fragrance, 1–5 stars, text. Fragrance picked through the Atlas search.
- **Feed** `/salon`: All, Recipes, Reviews, Following; 20 at a time. **Profile page** `/salon/u/<handle>`: counts, follow, report, their posts.
- **Reporting and moderation**: anyone can report a post or a profile (spam, abuse, unsafe advice, other). Editors (the `admins` table) get `/salon/moderation`: hide or restore a post, dismiss a report, suspend an author, lift a suspension. Nothing is deleted by moderation and every decision is logged (`salon_actions`).

## Database (migration 0027; staging 2026-10-14, production 2026-10-15)

Seven tables (`salon_profiles`, `salon_posts`, `salon_likes`, `salon_follows`, `salon_reports`, `salon_actions`, `salon_suspensions`), all with RLS and `ON DELETE CASCADE` from `auth.users`. Down file: `0027_salon.down.sql`.

Design points:

- **Tables answer to their owner only.** Other people's posts and profiles are read through `salon_feed` and `salon_profile` (SECURITY DEFINER, refuse anyone not signed in), which apply the visibility rule in one place (published, author public, author not suspended; authors always see their own with the status) and return counts, never the likers or follow lists.
- **Column grants.** A user can set a profile's handle, name, bio and public switch, and a post's title and body. Post status, suspensions and every moderation column are reachable only through editor functions.
- **No links anywhere** (display name, bio, titles, bodies): `salon_has_link()` rejects web addresses, `www`, emails and bare domains on common endings. A heuristic, not a guarantee.
- **Recipe snapshots are validated by a trigger**: only the five blend keys, numbers in range. A private field can't ride along.
- **Caps by trigger**: 10 posts a day, 300 likes a day, 500 follows, 20 reports a day; posting needs a public profile and an account at least a day old.
- **Auto-hide**: three reports on a post from accounts at least 7 days old hide it until an editor looks. Brand-new accounts' reports are recorded but don't count, so a handful of throwaway accounts can't silence anyone.
- **Review findings fixed** (an automated security review of the first commit): a suspension used to live on the profile row, which its owner could delete and re-create; it now lives in `salon_suspensions`, which no user can write. A hidden post can no longer be deleted by its author (it would let it be posted again); account deletion still cascades.

## Tests

- `supabase/tests/salon_isolation.sql`: 55 checks on staging, rolled back (private by default; column grants; links, bad snapshots, duplicate reviews; the daily post cap; account age; feed visibility; likes and follows; private/suspended hides everything; report rules; auto-hide with week-old versus new reporters; queue and moderation; non-editors refused; hidden posts undeletable; suspension survives a profile re-create; anon has nothing; account deletion cascades). Not covered: the likes, follows and reports caps (same trigger shape as the post cap).
- Vitest: logic in `src/lib/salon/` (paths, link rule, profile/post validation, snapshots, bench links).
- Playwright `e2e/salon.spec.js` (11 scenarios per project): flag off, feed and filters and the safety copy, private profile, like and report, making a profile (private first, link refused, public, removal), recipe post carries only the blend, review validation and the daily limit, follow and report a profile, not-found, the editors' queue (and non-editors refused), Arabic at 320 px with axe on five pages.

## Not done, on purpose

- **No public pages or SEO.** Posts are visible to signed-in users only. Page-level SEO for what people choose to publish is the next step if you want it; it needs a decision on whether "public" should mean the open web, and the privacy and terms text to say so.
- **No email or push notifications**, no comments, no blocking or muting, no editing of a post's numbers (a post's title and text can be edited by the database but the screen only deletes).
- **Moderation is by hand**: editors read the queue. No automated text screening beyond the link rule.
- Arabic is a draft for your review.
- The likes, follows and reports caps are not in the SQL test.

## For you

1. Salon privacy and terms wording (the lawyer's `/privacy` and `/terms` don't mention user posts yet).
2. Who the editors are: today, rows in `admins`.
3. Whether "public" should ever mean the open web (then SEO pages).
4. Production: migration 0027 was approved and applied 2026-10-15; the Salon stays flagged off.
