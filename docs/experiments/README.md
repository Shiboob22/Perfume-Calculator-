# Experiments

Kyphira's traffic is too small for a real A/B test (5 % baseline, 20 % lift
needs about 8,200 visitors per variant). Until it grows we measure, change one
thing, and measure again.

**Primary metric: activation** — the share of new accounts that log a first
batch within 7 days of signing up. It is the step the product controls, and
Pro has no payments yet, so trials are not a business number.

Secondary: onboarding finished, a second batch on a later day (came back),
median hours to the first batch, sign-ups by source (`profiles.signup_ref`).
Top of the funnel: page views in Vercel → Analytics (`/`, `/pricing`,
`/bench`, `/ar/*`, guides). Custom events are not tracked.

## How to run a round

1. Run `scripts/funnel.sql` on production (read-only; counts only).
2. Note the last 4 weeks in a `BASELINE-<yyyy-mm>.md` with the Vercel page views.
3. Ship **one** change. Write it in the log below with the metric it should move.
4. After 4 weeks (or 20 new sign-ups, whichever is later) run it again.
5. With fewer than 20 sign-ups per window, read each account's path, not the
   percentage: a before/after at this size cannot show cause.

## Log

| Date | Change shipped | Should move | Before | After | What we learned |
|---|---|---|---|---|---|
| | | | | | |
