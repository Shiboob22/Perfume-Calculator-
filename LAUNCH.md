# Launch checklist — Kyphira

Work top to bottom. **Owner** items need a decision or an account only you
hold; **Claude** items can be done in a session once the owner items they
depend on are settled. Nothing here touches production until step 4.

---

## 0. The rooms: what is live, what is flagged, in what order to switch on

Production today (2026-10-15) runs `main` at the Salon branch: the **Bench**
and the **Library** are live. **Wardrobe, Atlas, Salon and Nose are built but
off.** A room is off unless its flag is on; off, its address returns to the
Bench and its nav link is hidden. Flags do not protect data (row-level
security does that); they only decide what is shown.

| Room | Flag | Needs on production first | Owner decisions first |
|---|---|---|---|
| Wardrobe `/wardrobe` | `wardrobe` | nothing (0024 applied) | Arabic review; your scoring-weights review |
| Atlas `/atlas` | `atlas` | nothing (0025 applied); a nightly `atlas_refresh()` | catalog licence route (§1 #8, `docs/redesign/DATA-ROUTE.md`); Arabic review |
| Salon `/salon` | `salon` | **migration 0027** (approve the SQL; test `supabase/tests/salon_isolation.sql` passes 55 checks on staging) | privacy and terms wording for user posts (`docs/redesign/LEGAL-BRIEF.md`); who the editors are (rows in `admins`); Arabic review |
| Nose `/nose` | `nose` | nothing (no migration); `GEMINI_API_KEY` set | privacy line on Gemini; Free vs Pro; is 400 questions a day right; Arabic review |

**Suggested order**, one at a time, a day or two apart so a problem has one
suspect: **Wardrobe → Atlas → Nose → Salon.** Salon goes last because it is the
only room where strangers' words appear, so it needs the legal text, an
editor, and migration 0027.

**How to turn one on** (for everyone): Vercel → Settings → Environment
Variables → add `VITE_FLAG_<NAME>=1` (Production) → redeploy. To try one
yourself first, open any page with `?flag=<name>` (clear it with `?unflag=<name>`).
**To turn one off:** remove the variable and redeploy (or Instant Rollback).

**Switches and limits in Vercel env** (none of these are secrets):

| Variable | Effect | Default |
|---|---|---|
| `NOSE_ENABLED=0` | Nose answers 503 `nose_off` at once, nothing counted or sent | on |
| `NOSE_DAILY_CAP` | whole-site Nose questions a day (each is two Gemini calls) | 400 |
| `STOCK_ON_LOG=client` | stock is deducted from the browser again | server |

Per-user Nose limits are 8 an hour and 25 a day (`api/_lib/nose.ts`).

**Before turning any room on:** Supabase Auth → URL configuration must list the
room addresses. Add `https://<domain>/bench/**`, `/wardrobe/**`, `/atlas/**`,
`/salon/**` and `/nose` next to `/app/**` (also for
`https://scent-handbook-app.vercel.app`). Sign-in links that return to a page
not on the list fall back to the home page.

**Checked 2026-10-15 (Phase 8):**
- Production has migrations 0001–0026 (0026 is `profile_seller`); only the Salon's 0027 is missing.
- Supabase security advisor, production: no errors. Warnings that are intended:
  the four `atlas_*` views and the `atlas_*` functions are readable by signed-in
  users only (anon has no SELECT and no EXECUTE on any of them; checked);
  `recipe_by_slug` / `recipe_sitemap` are public on purpose (shared recipe
  pages, published rows only). "Leaked password protection" is moot: sign-in is
  email link or Google, there are no passwords. `admins`, `billing_events` and
  `rate_limits` have RLS on and no policy on purpose (service role only).
- Lighthouse mobile, production: Accessibility, Best Practices and SEO are
  100 on `/`, `/ar`, `/pricing` and `/library`. **Performance is 91, 93, 85 and 92 against the 95 target**
  (below). Simulated slow-4G mobile: first paint ~2.0 s, largest paint 1.9-4.0 s,
  no layout shift, blocking time 50-130 ms. The signed-in rooms are not
  scored by Lighthouse; they are covered by axe and the e2e suite.
- `e2e/launch.spec.js`: with no flags no unfinished room is reachable or
  linked; with all flags each opens from the nav; Arabic at 320 px has no
  sideways scroll and no axe violations in any room.

---

## 1. Decisions (owner)

| # | Decision | Where it's used | Status |
|---|---|---|---|
| 1 | The numbers table: densities, ranges, defaults, presets, rest days (`npm run numbers:diff`) | `src/lib/formulation.ts` | open |
| 2 | The plan feature map and Free batch cap (25 proposed) | `plans` table (one `UPDATE`) | open |
| 3 | Pour tolerance; density bounds; whether measured density / by-weight are Pro | calculator | open |
| 4 | Manual Pro vs payment events (`resolvePlan`) | `docs/billing.md` | open |
| 5 | Account deletion: immediate (built) or a grace period | `api/account.ts` | open |
| 6 | Rate limits: Ask 30/h, live lookups 20/10 min, batch logs 60/10 min, deletion 5/h, error reports 30/10 min | `api/_lib/rateLimit.ts` | **approved 2026-10-02** |
| 7 | Gemini: paid key (prompts not used for training), or keep the free tier and its disclosure | `api/ai.ts`, privacy page | open |
| 8 | Catalog data licensing (the Parfumo-derived catalog and live lookups). Route proposed in `docs/redesign/DATA-ROUTE.md`; Wikidata checked 2026-10-15 and is too small (369 perfume items) | `api/search.ts` | open — **blocks a commercial launch** |
| 9 | Review of every Arabic string, the Arabic guide drafts, and the Arabic byline | `src/i18n/messages/ar.js`, `src/content/` | open |
| 10 | Landing copy approval | `src/i18n/messages/*.js` → `site.home` | open |
| 11 | Neutral examples for the Choosing (Wardrobe) guides | Phase 3 | open |
| 12 | Label sizes: built with defaults 50×30, 70×40, 90×50 mm + custom | `LABEL_SIZES` in `src/lib/labels.js` | confirm or replace |
| 13 | Resting Journal: cadence (day 1 · rest start · rest end · end + 14), check-ins Free and outside the cap, patterns Pro | Phase 6 | **approved 2026-10-02** |
| 14 | Per-batch "peak day" rule for patterns: the earliest day a batch reached its best rating | `peakDay()` in `src/lib/calc/journal.ts` | review |
| 15 | Shared recipe names may name designer perfumes (trademark): with the lawyer, alongside `/terms` | Phase 6 | open, not blocking |
| 17 | Nose: Free or Pro (uses `ai.ask` today), daily site cap (400), privacy line on Gemini | `api/_lib/nose.ts` | open |
| 18 | Salon: who the editors are; privacy and terms for user posts; whether "public" may ever mean the open web | `docs/redesign/LEGAL-BRIEF.md` | open |
| 16 | Pricing page lines for the journal and recipe sharing (both plans) and patterns (Pro) | `site.pricing` | drafted 2026-10-03; approve with the landing copy (#10) |

## 2. Accounts and hosting (owner)

- [ ] **Vercel Pro.** Hobby is for non-commercial use only. Pro also gives
      longer log retention for the error reports.
- [ ] **Supabase Pro** for the production project. The free plan has no
      backups, and free projects pause after a week without use.
      Turn on daily backups (PITR if the budget allows).
- [ ] **Custom domain** in Vercel, then:
  - set `VITE_SITE_URL=https://<domain>` in Production env (canonical,
    hreflang, sitemap, OG);
  - add the domain to `ALLOWED_ORIGINS` in `api/batches.ts`, `api/inventory.ts`
    and `api/ai.ts`.
- [ ] **Email sending.** Supabase's built-in email is rate-limited (a few per
      hour) and not for production. Set up custom SMTP (Resend, Postmark or
      SES) in Supabase → Auth → SMTP, from an address on your domain. Then
      edit the magic-link email template (EN; AR if you want both).
- [ ] **Web Analytics:** Vercel project → Analytics → Enable.

## 3. Legal (owner, then a lawyer)

- [ ] Fill every `[OWNER: …]` in `src/content/legal.js`: legal name, contact,
      Gemini tier, backup retention, supervisory authority, liability and
      governing law.
- [ ] Lawyer review of `/privacy` and `/terms`, EN and AR.
- [ ] Tell the lawyer about the 2026-10-03 change (Apple sign-in removed).
      `/privacy` now reads, in "What we collect": "the sign-in provider you
      used (email link or Google)" (was "email link, Google or Apple"), and in
      "Who we share it with": "Google, if you choose it to sign in" (was
      "Google and Apple, if you choose them to sign in"). Arabic changed to
      match. Apple is not enabled in Supabase Auth on production or staging
      (checked 2026-10-03), so nobody can sign in with Apple.
- [ ] Set `draft: false` on both pages. That removes the banner and the
      `noindex`, and adds them to the sitemap.

## 4. Production database (owner approves, then apply)

**Done 2026-10-02** (owner approved): 0001–0011 applied in order, each atomic; pre-migration copies of the user tables and the catalog were kept in schema `backup_20261002`, then dropped on the owner's request; production schema fingerprint identical to staging; data counts unchanged (36 batches, 2 inventory, 14 notes, 81,823 catalog rows); owner is admin, Pro and onboarded. The steps below are kept for reference.

Migrations 0001–0011 have run on **staging** only. They add tables, columns,
policies and functions. They do not drop or rewrite user data, except in
**0002**, which sets `user_id NOT NULL` and replaces foreign keys. Read 0002
first.

1. [ ] Take a backup (Supabase dashboard → Database → Backups, or `pg_dump`).
2. [ ] Read each file in `supabase/migrations/0001…0011` and approve it.
3. [ ] Apply them in order, each in one transaction:
       `psql "$PROD" -1 -v ON_ERROR_STOP=1 -f supabase/migrations/00NN_*.sql`
       Then record the versions in `supabase_migrations.schema_migrations`,
       as was done on staging.
4. [ ] Run `supabase/tests/rls_isolation.sql` against production. It rolls
       back and must print `RLS_ISOLATION PASSED: 42 checks`.
5. [ ] Check that the owner is an admin (`select * from admins`) and on Pro
       (`select * from user_plans`).

### Phase 6

**Done 2026-10-03** (owner approved): 0012 and 0013 applied to production
through the Supabase connector (recorded as migrations); the new objects'
fingerprint matches staging, where `rls_isolation.sql` passes 55 checks (the
test itself runs on staging only); data counts unchanged.

### Phase 8

Migrations **0014–0016** have run on **staging** (advisors re-checked;
`rls_isolation.sql` passes 64 checks). All additive, no data rewritten:

- `0014_advisor_fixes` — four foreign-key indexes; `restock_inventory` gets a
  fixed `search_path`.
- `0015_batch_record` — `batches.lot`, `amount`, `unit` (nullable, checked).
- `0016_signup_sources` — `profiles.signup_ref`, `pro_waitlist.source`
  (nullable short slugs); RLS unchanged.

**Done 2026-10-04** (owner delegated the approval): applied to production
before the Phase 8 code deployed; new columns, checks, indexes and the
function's `search_path` confirmed; data counts unchanged (36 batches,
81,823 catalog rows; owner on Pro).

## 5. Production configuration (owner)

- [ ] Supabase Auth → URL configuration:
  - Site URL: `https://<domain>`;
  - Redirect URLs: `https://<domain>/app/**` and
    `https://scent-handbook-app.vercel.app/app/**`.
- [ ] The Google OAuth app lists the same callback. (Apple sign-in removed 2026-10-03.)
- [ ] Vercel Production env holds:
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`;
  - `SUPABASE_SERVICE_ROLE_KEY` (Secret);
  - `GEMINI_API_KEY` (Secret), optionally `GEMINI_MODEL`;
  - `VITE_SITE_URL`;
  - `REPORT_EMAIL`: where "Report this recipe" on shared recipe pages
    writes to. Without it the link is left off the page.
- [ ] Staging Auth also allows preview redirects:
      `https://scent-handbook-*-shiboob22s-projects.vercel.app/**`. This is
      needed for the signed-in e2e run in step 6.

## 6. Verify before launch (Claude + owner)

- [ ] CI is green on the release branch: lint, typecheck, unit tests with
      100% coverage of `src/lib/calc`, build, bundle secret check, and
      Playwright (EN/AR, phone and desktop, axe WCAG 2.2 AA).
- [ ] Signed-in e2e against a preview with staging credentials:
      `E2E_BASE_URL=… E2E_SUPABASE_URL=… E2E_SERVICE_ROLE_KEY=… npx playwright test e2e/signed-in.spec.js`
- [ ] Lighthouse (mobile) at ≥ 95 in all four categories on `/`, `/ar`, a
      guide and `/pricing`.
- [ ] Manual pass on a real phone, EN and AR:
  - sign in;
  - onboarding;
  - calculate, then log a batch;
  - log a batch offline, then reconnect;
  - bench mode;
  - Batches;
  - export;
  - delete a test account.
- [ ] `GET /api/ai` shows the Gemini key configured and the models answering.

## 7. Launch (owner)

**Merged and deployed 2026-10-02** (fast-forward of `main` to the release branch). Sign-in links that fall back to the home page are forwarded to `/app`, but still add the `/app/**` redirect URLs in §5.

1. Merge the phase PRs in order: 1 → 2 → 3 → 4 → 5.
2. Watch the production deployment go green, then open `/`, `/ar` and `/app`.
3. Sign in as the owner; check the plan is Pro and the batches are intact.

**Rollback:**
- The app: Vercel → Deployments → previous → *Instant Rollback*.
- The database: migrations are additive, so the old app runs against the new
  schema. Don't reverse migrations by hand.
- **Backups.** `backup_20261014` (a copy of every user table and the user-added
  catalog rows, taken before migrations 0021-0025; no access for the API
  roles) is still in the production database; drop it with
  `drop schema backup_20261014 cascade` once you no longer need it. It is not a
  substitute for a restorable `pg_dump` or Supabase Pro daily backups (§2):
  until one of those exists, wrong or lost data may not be recoverable.
  Export your own account from `/app/account` before risky changes.

## 8. After launch

- **Errors:** Vercel → Logs, filter `client_error` (browser reports) and
  status ≥ 500 (functions).
- **Latency:** Supabase → Logs → edge logs (see the notes in `CLAUDE.md`).
- **Pro waitlist:** see the query in `docs/billing.md`. Where people join
  from, in totals only:
  `select coalesce(source, 'account') as source, count(*) from pro_waitlist group by 1 order by 2 desc`.
- **Sign-up sources**, in totals only (never per person):
  `select coalesce(signup_ref, 'direct') as ref, count(*) from profiles group by 1 order by 2 desc`.
- **Stock on log:** if Pro logs report stock problems, set `STOCK_ON_LOG=client`
  in Vercel and redeploy; the app goes back to deducting from the browser.
- **Reported recipes:** unpublish one with
  `update shared_recipes set published = false where slug = '<slug>'`
  (the page goes within 5 minutes; the owner can share it again).
- **Email reminders for due check-ins:** a fast-follow once SMTP (§2) is
  set up. Today the app shows them on the Batches tab only.
- **Pending catalog entries** added by users:
  `select * from fragrances where status = 'pending'`. Approve with
  `update … set status = 'approved'` as an admin.
- **Once a month:** check the Supabase backups exist; check the rate-limit
  table stays small (`select count(*) from rate_limits`).
