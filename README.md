# Scent Ledger — unified system

One Supabase-backed React app: search, calculate, log batches, and track
inventory. Replaces the previous split between the HTML tool (local
database + localStorage personal log) and this app (Supabase search
only, dumb calculator) — everything now shares one database.

> **Status of this README.** It was first written for the original
> single-user "unified system" pass. **Current architecture**, **Setup**,
> **Configuration**, **Commands** and **Security model** below describe the
> app as it is now. Everything under **Historical notes** is kept for context
> only: its setup and security advice no longer applies, and
> `supabase-schema-v2.sql` must not be run (see the warning at its top).

## Current architecture

```
Browser (React + Vite SPA, prerendered public site)
  │  anon/publishable key only: reads what RLS and grants allow,
  │  signs users in with Supabase Auth
  ├──► Supabase Auth + Postgres (Row Level Security on user data)
  └──► Vercel serverless functions, api/*.ts  (service-role key, server only)
          user-data handlers verify the caller's session, then read/write scoped to that user
```

- **Public site and app:** a Vite/React build; the public pages are
  prerendered, the signed-in app lives under `/app`.
- **API handlers** (`api/*.ts`). The handlers that touch user data
  (`api/batches.ts`, `api/inventory.ts`, `api/account.ts`, `api/me.ts`, …)
  check the bearer token with Supabase Auth, take the user id from the
  *verified session* (never from the request body), check the user's
  plan/entitlements where a feature is gated, and scope every query by that
  user id. They use the service-role key, which bypasses RLS, so this check is
  the access control for those routes. A few endpoints are deliberately
  public (catalog reads such as `api/similar.ts`, shared recipe pages in
  `api/recipe.ts`, the client error log `api/log.ts`).
- **Database:** Supabase Postgres. The schema is defined by the numbered
  files in `supabase/migrations/`, applied in order (see Setup). User-owned
  tables have owner-only Row Level Security; `batches` and `inventory` are
  written only through the API (migration `0011`), not straight from the
  browser. Ordinary users cannot update or delete shared catalog rows;
  additions go through database functions.
- **Calculation core:** `src/lib/calc/` (pure functions, unit-tested);
  blending numbers live in `src/lib/formulation.ts`. Family oil densities
  there are provisional starting assumptions; a measured density for the
  actual oil takes precedence.
- **Tests:** Vitest (unit and API-handler tests), Playwright (end-to-end),
  and an RLS isolation script, `supabase/tests/rls_isolation.sql`.
- **CI:** GitHub Actions (`.github/workflows/ci.yml`) runs lint, typecheck,
  unit tests with coverage, the build, the bundle secret check and the
  Playwright suite.

## Setup

Requires Node 22 (what CI uses) and a Supabase project. Use a separate
**staging** project for development and previews; keep production for
production.

1. **Create the database from the migrations**, not from the SQL files in the
   repo root. Apply `supabase/migrations/0000_baseline.sql` and every later
   `NNNN_*.sql` file **in order**, with the Supabase CLI
   (`supabase db push` against a linked project) or by running each file in
   the SQL editor. Migrations are the schema's history: add a new numbered
   file for every change, never edit an applied one, and review any
   destructive SQL before running it.

   This README does not say which migrations your project has already
   applied; check before relying on a schema (Supabase dashboard → Database →
   Migrations, or `supabase migration list`).

2. **Install dependencies:**
   ```bash
   npm ci
   ```

3. **Configure the environment** (see the table below):
   ```bash
   cp .env.example .env.local
   # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (public values)
   ```
   The serverless functions in `api/` also need server-only variables; set
   those in Vercel (or in your shell for a local `vercel dev`), never in a
   `VITE_` variable.

4. **Run it:**
   ```bash
   npm run dev
   ```

## Configuration

| Variable | Where it is used | Secret? |
|---|---|---|
| `VITE_SUPABASE_URL` | browser, build | No: the project URL |
| `VITE_SUPABASE_ANON_KEY` | browser, build | **No, by design**: the anon/publishable key ships to every visitor |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | `api/` (optional fallbacks when the `VITE_` ones are not set) | No |
| `SUPABASE_SERVICE_ROLE_KEY` | `api/` only | **Yes. Server-only.** Bypasses RLS |
| `GEMINI_API_KEY` | `api/ai.ts` only | **Yes. Server-only** |
| `GEMINI_MODEL`, `STOCK_ON_LOG`, `VITE_SITE_URL`, `REPORT_EMAIL` | optional switches and settings (see `.env.example`) | No |
| `E2E_SUPABASE_URL`, `E2E_SUPABASE_ANON_KEY`, `E2E_SERVICE_ROLE_KEY`, `E2E_BASE_URL` | opt-in signed-in end-to-end journeys | `E2E_SERVICE_ROLE_KEY` is a secret: staging only |

Rules:

- **Never put a secret in a `VITE_` variable.** Vite inlines those into the
  browser bundle.
- **Never commit real values.** `.env*` is git-ignored except
  `.env.example`, which holds placeholders only.
- Use the service-role key only in server code (`api/`), and only for the
  Supabase project it belongs to.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript checks for `api/` and `src/` |
| `npm test` | Vitest unit and API-handler tests (`npm test -- --coverage` for coverage) |
| `npm run build` | Production build: plans refresh, client + SSR build, prerender, service worker |
| `npm run check:bundle` | Fails if a service-role key, Gemini key or other secret reached `dist/` |
| `npm run e2e` | Playwright against the production build (run `npm run build` first) |
| `npm run numbers:diff` | Lists where the blending-number sources disagree |

Before deploying, run `lint`, `typecheck`, `test`, `build`, `check:bundle`
and `e2e`, and see **DEPLOYMENT.md**.

## Security model

- **The anon/publishable key is not a secret and is not access control.** It
  is meant to be in the browser. What a visitor can do with it is decided
  entirely by Row Level Security policies and table grants. A public key is
  never a substitute for user isolation.
- **Every user-owned table needs owner-only RLS** (`auth.uid() = user_id`),
  and API handlers must take the user id from the verified session and scope
  every query by it. A `user_id` sent by the client is never proof of
  ownership.
- **The service-role key bypasses RLS.** Keep it server-side only. Code that
  uses it is responsible for authentication and authorization itself.
- **The Gemini key stays server-side** (`api/ai.ts`).
- **Isolation is tested**, not assumed: `supabase/tests/rls_isolation.sql`
  creates two throwaway accounts and checks that neither can read or change
  the other's rows. Run it against **staging**, never production.
- **Error messages:** a handler must not return database messages, SQL or
  stack traces to clients. Answer an unexpected failure with a fixed generic
  500 and log the detail on the server (never the token, a key or the request
  body); keep intentional answers (401, 403, 400, 503 for timeouts) as they
  are. `api/inventory.ts` (`serverError()`) and `api/batches.ts`
  (`failFrom()`) follow this; not every older handler does yet.

## Folder structure (current, abridged)

```
.
├── api/                      Vercel serverless functions (service role: each user-data handler must authenticate)
│   └── _lib/                 shared helpers and their tests (not routes)
├── src/
│   ├── lib/calc/             calculation core (pure, unit-tested)
│   ├── lib/formulation.ts    every blending number (provisional family densities)
│   ├── lib/selector/         fragrance selector engine
│   ├── components/, site/    app screens and the prerendered public site
│   └── i18n/                 English and Arabic strings
├── supabase/
│   ├── migrations/           the schema's history: apply in order
│   └── tests/rls_isolation.sql
├── e2e/                      Playwright specs
├── scripts/                  build, bundle-secret check, numbers diff
├── supabase-schema-v2.sql    HISTORICAL, do not run (see its header)
├── .env.example              placeholders only
└── CLAUDE.md                 working notes and project history
```

## Historical notes (original unified-system pass)

### What each tab did (original description)

- **Search** — unchanged: reads the scraped `perfumes` table
  (Fragrantica-style note/accord data). Selecting a result hands its
  name to the Calculator tab.
- **Calculator** — now looks up the fragrance name against the
  `fragrances` table as you type (auto-classifying family/tier, same 5
  tiers as the HTML tool: Fresh, Floral, Woody, Gourmand, Amber). If
  the name isn't in the database yet, it's added automatically the
  first time you log a batch for it — the app's own way of building
  the database, instead of asking Claude to hand-edit source code.
  Personal log fields (oil type, price/gram, notes) now save to
  Supabase instead of browser localStorage, so they follow you across
  devices.
- **Batches** *(new)* — every batch you log is a permanent record: date,
  fragrance, concentration, exact weights/volumes, cost, notes. This is
  now an actual production history, not just one-off math.
- **Inventory** *(new)* — stock on hand per fragrance oil, in grams.
  Logging a batch automatically subtracts the oil grams used. Restock
  manually with the "Add stock" field; a low-stock threshold (default
  10g, editable per fragrance) flags anything running low.

- **Ask** *(new)* — chat with Gemini about blending. It knows the five
  families and your last 30 batches. Search, Calculator and Batches also
  gain Gemini buttons (look up an unknown perfume, advise on a blend,
  summarise your batch log). All calls go through `api/ai.ts`; needs
  `GEMINI_API_KEY` (see DEPLOYMENT.md step 5).

### An outdated security note (do not follow)

The first version of this README said the schema granted the anon key full
read/write on the tables, and called that acceptable because the project was
private and single-user. **That advice is wrong for a multi-user app and has
been superseded by the Security model above.** The original
`supabase-schema-v2.sql` policies (`using (true) with check (true)`) let any
holder of the public anon key read and change every user's rows; do not run
that file or copy that pattern.

### What didn't make it into the original pass

The HTML tool's canvas-drawn PNG/JPG receipt export was **not** ported
to this app in this round — that's a real feature gap, not an
oversight I'm hiding. The HTML tool still works standalone (with its
own local database and localStorage log) if you want receipt export
today; porting that to the unified system is a reasonable next step if
you want it.
