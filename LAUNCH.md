# Launch checklist — The Scent Handbook

Work top to bottom. **Owner** items need a decision or an account only you
hold; **Claude** items can be done in a session once the owner items they
depend on are settled. Nothing here touches production until step 4.

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
| 8 | Catalog data licensing (the Parfumo-derived catalog and live lookups) | `api/search.ts` | open — **blocks a commercial launch** |
| 9 | Review of every Arabic string, the Arabic guide drafts, and the Arabic byline | `src/i18n/messages/ar.js`, `src/content/` | open |
| 10 | Landing copy approval | `src/i18n/messages/*.js` → `site.home` | open |
| 11 | Neutral examples for the Choosing (Wardrobe) guides | Phase 3 | open |
| 12 | Label sizes: built with defaults 50×30, 70×40, 90×50 mm + custom | `LABEL_SIZES` in `src/lib/labels.js` | confirm or replace |
| 13 | Resting Journal: cadence (day 1 · rest start · rest end · end + 14), check-ins Free and outside the cap, patterns Pro | Phase 6 | **approved 2026-10-02** |
| 14 | Per-batch "peak day" rule for patterns: the earliest day a batch reached its best rating | `peakDay()` in `src/lib/calc/journal.ts` | review |
| 15 | Shared recipe names may name designer perfumes (trademark): with the lawyer, alongside `/terms` | Phase 6 | open, not blocking |
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
  schema. Don't reverse migrations by hand; restore the backup from step 4
  only if data is wrong.

## 8. After launch

- **Errors:** Vercel → Logs, filter `client_error` (browser reports) and
  status ≥ 500 (functions).
- **Latency:** Supabase → Logs → edge logs (see the notes in `CLAUDE.md`).
- **Pro waitlist:** see the query in `docs/billing.md`.
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
