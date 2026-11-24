# Baseline, 2026-11-24

`scripts/funnel.sql` on production, all time (counts only):

| Sign-up week | Signed up | Onboarded | Logged a batch | Activated (7 d) | Came back | Median h to first | Source |
|---|---|---|---|---|---|---|---|
| 2026-09-14 | 1 | 1 | 1 | 1 | 1 | 22.7 | direct |
| 2026-09-21 | 1 | 0 | 0 | 0 | 0 | – | direct |

Two accounts in all. The first is the owner's. The second signed up and left
before onboarding: it never reached the Bench's Log button, so the first
stall to look at is **sign-up → onboarding**, not the Bench.

No sign-ups since 2026-09-21, none through an invite link.

## Top of the funnel: no data

Vercel's API answers "Web Analytics is not enabled for this project". The
`@vercel/analytics` script loads on every page, but nothing is recorded, so
there are no visit counts for `/`, `/pricing` or `/bench`. Turning it on is
the owner's (LAUNCH.md, "Web Analytics"): Vercel → project → Analytics → Enable. It is free
on Hobby for page views; custom events are not used.

## What this baseline can say

Nothing about rates: one person is not a percentage. Next round needs
traffic first (Analytics on, then the five-user test in `five-user-test.md`,
which brings five sign-ups of its own).
