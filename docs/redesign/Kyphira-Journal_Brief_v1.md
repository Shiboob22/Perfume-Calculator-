# Kyphira Journal: plan to make it award-level

Draft v1, 2026-11-14. For the owner's review. Nothing here is built.

## 1. Where the Journal is today

What works:

- One room at `/journal`: a batch list (four sorts, rest bar, "Note due"), a detail panel with a five-node timeline (day 0, 7, 14, 30, 90), a note editor (280 characters, 1–5 rating, seven tags) and a two-note compare.
- Built on real data (`batch_checkins`), RLS-scoped, EN/AR, accessible labels on the timeline and dots.
- Free sees its newest 3 batches; Pro sees all, plus reminders and patterns.

What stops it being award-level. These are the real problems, in order of harm:

1. **Two rest clocks.** The room says every batch is ready at day 90. The Bench's resting line, the old journal, the nav badge (`dueNow()`) and the order queue use the family rest days from `formulation.ts` (capped at 90). A user can see "ready" on the Bench and "Ready in 61 days" in the Journal for the same bottle. Nothing award-level can sit on two answers to "is it ready?".
2. **The reminder does nothing.** The bell stores `batches.remind` and stops (`TODO(reminders)` in `api/batches.ts`). The Journal's whole value is coming back on the right day; today nothing brings anyone back.
3. **Notes are lost offline.** Batch logs go through the outbox; notes (`upsertNote`) do not. The Journal is used at a bench, often with poor signal.
4. **No picture of change.** The data exists (ratings over days, tags over days) but the room shows text cards. The question users actually have, "when did this one peak?", has no visual answer.
5. **Learning stops at one batch.** Compare works between two milestones of the same batch. It does not compare batches of the same oil at different strengths or rests, which is where a blender learns what to make again.
6. **Split home.** Notes live at `/journal`; edit, share and delete live at `/bench/journal` ("Batches"). Two rooms for one bottle.
7. **Tags are ours, not the handbook's.** "harsh, sharp, rounder, sweeter, woodier, fading, ready" were made up for the prototype. They should be the owner's vocabulary.

## 2. What "award-winning" means here

The judging bars that fit a product like this (Apple Design Awards categories, Awwwards/CSSDA design and usability scores, Webby craft):

- **Interaction:** the main task takes seconds and feels like the bench, not a form.
- **Delight:** one moment people remember and show others.
- **Innovation:** something no other perfume app does.
- **Inclusivity:** EN/AR equal, screen reader complete, reduced motion complete, works one-handed.
- **Craft:** no seams. One truth per number, nothing that lies, nothing that breaks offline.

Our edge is the one no competitor has: a real record of a real batch, weighed on our Bench, with its exact strength, oil and rest. Fragrantica-style apps record opinions about bottles. Kyphira can record **how a bottle you made changed in time**. Every idea below builds on that.

## 3. The direction (my recommendation)

**The Journal becomes the batch's life story, and the reason to come back on the right day.** Three pillars:

1. **Smell today** — a short ritual: the room opens on what is due today, each note takes under 15 seconds, and a reminder brings you back.
2. **The curve** — every batch draws its own maturation curve from its notes; batches of the same oil overlay, so you see which strength and rest peaked best.
3. **Make the winner again** — the curve ends in one button that opens the Bench at the winning batch's settings.

I would not build: social feeds in the Journal (the Salon exists), streaks or badges (cheap for a craft product), AI-written tasting notes (the user's nose is the point; Gemini may summarise later, never write the note).

## 4. Development plan

Each phase: own branch, PR, preview, EN + AR strings together, Vitest for pure code, Playwright for the room. Phases are ordered so each one ships alone.

### J0 — One truth (foundation, no migration)

- One rest model in `restTracker.ts`: the ready day comes from the batch's family rest days (`formulation.ts`), capped at 90, the same function the Bench and the order queue use. Milestones become relative: **Day 0, Week 1, Ready day, Ready + 14, Day 90** (the older family schedule, already mapped by `notesByMilestone()`). *Owner decision D1.*
- The nav badge counts the room's own "needs a note", not `dueNow()` (closes the open item from the Journal sort brief).
- A test that Bench, Journal, order queue and nav badge give the same ready date for the same batch.
- Notes through the outbox with client ids (`api/checkins.ts` is already idempotent on id); a "saved on this phone, will send" state.
- Acceptance: one ready date everywhere; a note written in airplane mode arrives after reconnect; no change to stored data.

### J1 — Smell today (the ritual)

- Room opens on a **Today** strip when anything is due: one card per batch, oldest window first, "Smell No. 042 — Week 1".
- **Quick note** sheet (`kx/Sheet`): rating, tags, one line, Save; full editor stays one tap away. Target: 3 taps for a note.
- The owner's tag vocabulary replaces ours (*D2*); stored as keys so old notes keep reading.
- Bench handbook QC fields as optional quick checks at Day 0 and Ready day: colour, clarity, sediment (only if the owner's QC checklist covers them; *D3*).
- Empty and finished states written properly: "Nothing to smell today. Next: No. 038 on 21 Nov."
- Acceptance: median note time under 15 s in a recorded test on a phone; axe 0 violations EN/AR × light/dark.

### J2 — Reminders that arrive

- Email first (Resend is already set up for the Shop): one daily digest per user at their local morning, only when something is due, one-click unsubscribe, Pro (`journal.reminders`, already gated).
- Web push second, for the installed app (iOS 16.4+ home-screen apps, Android, desktop). Needs a VAPID key pair and a subscriptions table.
- The job runs from an existing function (`api/checkins.ts?job=reminders`, protected by a cron secret): we are at 12 of 12 Hobby functions. Vercel Cron on Hobby runs once a day, which is enough for a digest.
- Migration: `push_subscriptions` (owner RLS, cascade on user delete, in `EXPORT_TABLES`), `reminder_sends` (dedupe, so nobody gets two emails for one milestone).
- Owner to do: sending domain for Resend, a `/privacy` paragraph on reminder emails and push.
- Acceptance: a staging user with a batch at Week 1 gets one email that morning and none the next.

### J3 — The curve (the memorable moment)

- Per batch: a small drawn curve under the timeline, rating against day, points where notes exist, tag words written along it. Ink on paper, drawn once on view, still under reduced motion. Pure geometry in `src/lib/calc/` (tested); SVG in the component.
- Per oil: **Your batches of this oil** overlays every batch of the same fragrance, coloured by strength tier. Text equivalent for screen readers: "No. 031 at 25 % peaked at Ready + 14 (5 of 5)."
- "Peaked at" uses the user's own notes only, worded as their history (same rule as `journal.insights`). No claims about maceration chemistry: that is not in the handbooks.
- Patterns (`JournalPatterns.jsx`) move here and become visual.
- No migration.
- Acceptance: curve matches stored ratings exactly (unit test on real staging rows); screenshot set EN/AR, light/dark, 375/1440.

### J4 — Make the winner again

- From the per-oil view: **Make again at these settings** opens `/bench` with oil, strength, size and family (the existing Make again path), plus a line in the Bench: "Your best No. 031 rested to Ready + 14."
- Batch compare across batches (not only milestones): two batches side by side, strength, rest, ratings, tags.
- No migration.

### J5 — One home for the bottle

- The batch detail panel gets the record actions now at `/bench/journal`: edit record, share recipe, batch card, label, delete. `/bench/journal` stays as a list and redirects its detail links to `/journal?batch=`. No feature removed (*D4* on the label "Batches" in the More sheet).
- Seller tie-in (Pro, `profiles.sells`): batches with queued orders show "3 bottles promised, ready on 21 Nov" from the order queue.

### J6 — Polish and proof (award submission work)

- Motion pass on the room within the existing tokens: timeline fill, note saved (ink settles), curve draw. All off under reduced motion; LCD rules unchanged.
- Bottle photo per note (optional): private storage bucket, owner RLS, resized in the browser. *D5*, it costs storage on the free Supabase plan.
- Arabic review of every new string by the owner; real VoiceOver and TalkBack pass on the owner's phone.
- Lighthouse mobile on `/journal` signed in: Accessibility 100, CLS 0.
- A 30-second screen film and five stills for submissions.

## 5. How we will know it works

Measured from the database (no new tracking needed; Vercel custom events need a paid plan):

| Measure | Today (to read before J0) | Target after J2 |
|---|---|---|
| Batches with 2+ notes | read from `batch_checkins` | 50 % |
| Notes written inside their milestone window | read | 70 % |
| Users who note a batch 7+ days after logging it | read | 40 % |
| Make again from the Journal | 0 | 1 in 5 repeat batches |

## 6. Decisions for the owner

- **D1** Rest model: family rest days capped at 90 (my recommendation, matches the Bench and order queue) or 90 days for everyone (the prototype's).
- **D2** The tasting tag list, in your words, EN and AR.
- **D3** Which QC checks from your checklist belong in the Journal.
- **D4** Fold `/bench/journal` into `/journal` (keeps every feature, removes the second room).
- **D5** Bottle photos: yes or later (storage cost).
- **D6** Free vs Pro for the new parts. My proposal: Smell today, quick notes, the single-batch curve and offline notes Free; reminders (already Pro), the per-oil overlay and cross-batch compare Pro. Free keeps everything it has now.
- **D7** Reminder sending domain and the `/privacy` text.

## 7. Risks

- Hobby function limit: reminders must ride on an existing function. If a 13th is ever needed, it is a paid plan.
- Push on iPhone works only for home-screen installs; email stays the main channel.
- Changing the milestones (D1) moves where old notes appear; `notesByMilestone()` already maps them, and a test will pin every existing note to a milestone before the change ships.
- Curves on one or two notes mean little: the curve shows only from three notes, with a plain line before that.
