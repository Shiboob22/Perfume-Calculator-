# Phase 7: The Nose (flagged)

Branch `redesign/kyphira-p7-nose`, stacked on Phase 6 (and `main`). Flag `nose` (`?flag=nose`, or `VITE_FLAG_NOSE=1`); off, `/nose` returns to the Bench and the nav has no Nose link. Signed-in only. **No database change** (no migration): limits use the existing `hit_rate_limit` counter.

## What it is

One question, one answer, nothing kept. A person describes the scent they want ("warm and woody for winter evenings, nothing too sweet"); the Nose shows up to five real fragrances from the Atlas catalog, each with the accords that matched and one short reason.

The AI is never the source of a fragrance or its notes:

1. **Read.** Gemini turns the question into filters: accords chosen only from the catalog's own 60 biggest accord names (a schema enum), accords to avoid, notes the person named, one family. It also labels the intent: recommend, health, blending, or off-topic.
2. **Find.** The server queries approved catalog rows by accord and ranks them itself (earlier accords weigh more, an avoided accord in a fragrance's first three removes it, ties break on rating then name, so the same question gives the same list).
3. **Word.** Gemini chooses among those rows (by id) and writes one sentence each. Any id outside the list is dropped; a sentence that makes a health, allergy, safety, longevity or compliment claim, or holds a link, is blanked (the matched accords still show). If the wording step fails or nothing valid comes back, the best-ranked rows are shown with their accords alone.

## Cost and limits (free Gemini key)

A question costs two Gemini calls. All counters are the existing `hit_rate_limit` function.

| Limit | Value | Answer |
|---|---|---|
| per user, per hour | 8 | 429 `nose_limit`, `Retry-After` |
| per user, per day | 25 | 429 `nose_limit` |
| whole site, per day | 400 (env `NOSE_DAILY_CAP`) | 503 `nose_busy` |
| kill switch | env `NOSE_ENABLED=0` | 503 `nose_off`, before anything is counted or sent |

The whole-site cap exists so the Nose can't use up the free quota that Ask shares. It is lower than the free tier's real ceiling, so raise it only after watching usage. Counters fail open (a database hiccup never blocks a person), like every other limit here. The Nose has its own limits and does not use Ask's 30 an hour. Entitlement: the same `ai.ask` as Ask (so whatever plan has Ask has the Nose; no pricing change made).

## Safety and privacy

- **No health claims.** Health, allergy, skin, pregnancy, children and "cures" questions (English and Arabic) are caught by a rule before any model is called, and by the model's intent label as a second net. The answer is a fixed pointer to a doctor or pharmacist. Blending questions point to the Bench.
- **Prompt injection.** The question and the candidate list are labelled data in both system prompts; the model's output is never trusted (ids, accords and intent are checked against what the server supplied).
- **Nothing kept.** The question is sent to Google's Gemini and is not stored by Kyphira. The log line holds only the outcome, milliseconds and pick count: never the question, the answer, a fragrance name or who asked. A test asserts it.
- **Disclosure on the page**: AI-assisted, catalog is the source, no health advice, question goes to Gemini.
- Google's free tier may use prompts to improve its products (see CLAUDE.md, Known problems). The privacy text needs a line on this before the Nose turns on.

## Tests

- `api/_lib/nose.test.ts` (27): refusals in EN and AR, preferences clamped to the vocabulary, ranking and tie-breaks, the answer held to the candidates, switches and caps.
- `api/_lib/__tests__/nose.test.ts` (16, Gemini stubbed): kill switch, each limit and the site cap, redirects with no model call, picks from real rows only, invented ids and claims dropped, locale, fallback when the wording step fails, "none", unreadable model answers, and what reaches the log.
- `e2e/nose.spec.js` (12 per project): flag, ask and results, starters, short question, health and blending pointers, none, each error code, Arabic at 320 px with axe.
- Flag, route and rewrite tests extended.

## Not done, on purpose

- **Not tried against live Gemini.** The key lives in Vercel; tests stub it. First real check: turn on `?flag=nose` on a deployed build and ask three questions in each language, then read the result and the Vercel log line.
- One question at a time; no conversation memory (cheaper, and a smaller injection surface).
- Recommendations come from accord matching, not from taste history. Wardrobe and Journal data are not sent to the Nose.
- Fragrances with no accords can't be found by it (about 1.2% of the catalog).
- Arabic is a draft for your review.

## For you

1. Add a Nose line to the privacy text (question goes to Google's Gemini; not stored by Kyphira). Ask your lawyer about the free tier's training terms.
2. Free or Pro? It uses `ai.ask` today. This is a pricing call, so I haven't changed it.
3. Is 400 questions a day the right ceiling for the free key? Watch the Gemini quota page after the first week.
4. Review the Arabic strings (`nose.*`).
