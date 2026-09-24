# Gemini AI integration — design

Date: 2026-09-25 · Status: approved

## Goal

Connect The Scent Handbook to Google Gemini on the **free tier** (Google AI
Studio API key, no billing) and use it in four places: a perfumer chat, a
search fallback for unknown perfumes, blend tips in the Calculator, and
insights over batch history.

## Constraints

- Free tier only. Models with a free tier today: `gemini-3.8-flash`,
  `gemini-3.5-flash-lite` (and others). Google Search grounding is **not**
  free, so it is not used.
- Free-tier prompts may be used by Google to improve its products. The owner
  accepted sending all batch data (names, recipes, notes, costs).
- The API key must never reach the browser. Anything prefixed `VITE_` is
  baked into the client bundle, so the key lives in `GEMINI_API_KEY` and is
  read only by a Vercel function.
- Free quotas are small (per-minute and per-day, per model). No Gemini call
  may fire automatically on keystrokes.

## Architecture

One Vercel function, `api/ai.ts`, self-contained like the other `api/*.ts`
files. `POST { task, ...input }`.

- **Auth**: Supabase bearer token required (401 otherwise), verified with the
  same `auth.getUser()` pattern and CORS allowlist as `api/batches.ts`.
- **Gemini call**: plain `fetch` to
  `v1beta/models/{model}:generateContent` with `x-goog-api-key`. No SDK.
- **Model**: `GEMINI_MODEL` env, default `gemini-3.8-flash`. On HTTP 429,
  retry once with `gemini-3.5-flash-lite` (quotas are per model).
- **Context**: for `chat` and `insights` the server loads the caller's last
  30 batches with the service-role client filtered by `user_id`. The client
  never supplies batch context.
- **Input caps**: chat history trimmed to the last 20 turns, each turn to
  2000 characters; names to 120 characters.

Client wrapper `src/lib/aiApi.js` exposes `askPerfumer`, `lookupFragrance`,
`blendTips`, `batchInsights`.

## Tasks

| Task | Input | Output | UI |
|---|---|---|---|
| `chat` | `messages: [{role: 'user'\|'model', text}]` | plain text | New **Ask** tab (`PerfumerChat.jsx`). History lives in component state and is lost on reload. |
| `lookup` | `name` | JSON (schema-constrained): `known`, `name`, `tier` ∈ 5 tiers, `top_notes`, `middle_notes`, `base_notes`, `accords` | Search tab. When a query has no results, show an **Ask Gemini** button. The estimate renders in the existing detail panel, sourced *Gemini · AI estimate*, with a **Save to catalog** button. `known: false` shows "Gemini doesn't recognise this perfume" instead of invented notes. **Add to Inventory** is hidden until the estimate is saved (it needs a row id). |
| `tips` | `name`, `tier`, `concentration_pct`, `total_ml` | ~120 words plain text | Calculator. **Advise me** button under the readout. |
| `insights` | none | short plain text | Batches tab. **AI insights** button in the header. |

System prompts carry the five tiers from `src/lib/tiers.js` (label, density,
default concentration, rest guidance) so answers agree with the calculator.

### Save to catalog

Owner chose "ask each time". Saving upserts into `fragrances` from the
browser (authenticated users already have insert rights via
`auth_insert_fragrances`) with `source = 'Gemini (AI estimate)'` and
`ignoreDuplicates`, so it never overwrites an existing curated row.

## Errors

| Condition | Status | Message shown |
|---|---|---|
| `GEMINI_API_KEY` unset | 503 | AI is not configured yet. |
| 429 on both models | 429 | Free AI quota used up — try again later. |
| Unparseable lookup JSON | 502 | Gemini returned an unreadable answer. |
| Other Gemini failure | 502 | Gemini request failed. |

Each surface shows its error inline; the rest of the tab keeps working.

## Out of scope

- Persisting chat history.
- Streaming responses.
- Search grounding (paid).

## Verification

- `npm run build` passes; `api/ai.ts` type-checks.
- With a key: exercise each task through the deployed app.
