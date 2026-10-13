# Deploying Scent Ledger — free, on your Mac

Your app is a Vite/React build plus a handful of Vercel serverless
functions in `api/` (batches, inventory, account, AI and so on). Supabase is
the database and sign-in; the functions are the only code that holds the
Supabase **service-role** key, so they need server-side environment variables
(step 4). That fits Vercel's free (Hobby) tier: a few terminal commands and
you get a real, live URL.

## 0. Prerequisites

Open Terminal and check you have Node installed:

```bash
node -v
```

If that errors instead of printing a version number, install Node first:
[nodejs.org](https://nodejs.org) → download the LTS installer → run it →
re-check `node -v`.

You'll also want a free [GitHub](https://github.com) account (for
step 2) and a free [Vercel](https://vercel.com) account — you can sign
up for Vercel using your GitHub account directly, so one signup covers
both.

## 1. Get the project onto your Mac

If you haven't already, put the `scent-handbook-app` folder somewhere
sensible, e.g. `~/Projects/scent-handbook-app`, then in Terminal:

```bash
cd ~/Projects/scent-handbook-app
npm ci
```

(Node 22 is what CI uses. Use `npm ci`, not `npm install`, so you get the
exact versions in `package-lock.json`.)

Sanity-check it runs locally first:

```bash
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`) — you should
see the real app. Ctrl+C to stop it once confirmed.

## 2. Put it on GitHub

This gives you auto-deploys later (push code → site updates itself) and
is the path Vercel is built around.

```bash
git init
git add .
git commit -m "Initial commit"
```

Then create a new **empty** repository at [github.com/new](https://github.com/new)
(don't check "Add a README" — you already have one), copy the commands
GitHub shows you under "…or push an existing repository from the
command line", and run them. They'll look like:

```bash
git remote add origin https://github.com/YOUR-USERNAME/scent-handbook-app.git
git branch -M main
git push -u origin main
```

## 3. Deploy on Vercel

Install the Vercel CLI once:

```bash
npm install -g vercel
```

Then from inside the project folder:

```bash
vercel
```

It'll ask a few questions — accept the defaults for all of them
(it correctly auto-detects a Vite project). First run also asks you to
log in (opens your browser, log in with GitHub).

This first `vercel` call deploys a **preview** URL. To get it deployed
to your permanent production URL:

```bash
vercel --prod
```

You'll get a real `https://scent-handbook-app-xxxx.vercel.app` link —
open it. It'll look right but **Search/Batches/Inventory will fail
silently** until the next step, because the build doesn't have your
Supabase credentials yet.

## 4. Add your Supabase credentials

Unlike the standalone HTML file, a proper Vite build bakes `VITE_` variables
in **at build time**, not read at runtime — so they need to live in Vercel's
dashboard, not just your local `.env`. The `api/` functions read their
variables at request time.

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard) → your
   project → **Settings → Environment Variables**.
2. Add these (values from Supabase dashboard → Project Settings → API):

   | Variable | Value | Public? |
   |---|---|---|
   | `VITE_SUPABASE_URL` | the project URL | Yes |
   | `VITE_SUPABASE_ANON_KEY` | the **anon / publishable** key | Yes — shipped to the browser by design; **not a secret and not access control** |
   | `SUPABASE_SERVICE_ROLE_KEY` | the **service_role** key | **No. Server-only.** Bypasses RLS. Mark it Sensitive in Vercel |

   Rules: never give a secret a `VITE_` prefix (Vite would ship it to every
   visitor), never commit real values, and never put the service-role key in
   a browser-side file. `npm run check:bundle` fails the build if a
   service-role key or other secret reaches `dist/`.
3. Use **separate Supabase projects for Preview and Production** (Preview
   variables → staging, Production variables → production), so a preview
   deployment never touches real users' data.
4. Make sure the project's database was created from
   `supabase/migrations/` (applied in order) and that Row Level Security is
   on for user data — the anon key can only be as safe as those policies.
   The database is set up with the migrations, **not** by running
   `supabase-schema-v2.sql`, which is historical and permissive. This
   guide does not tell you which migrations your project has applied: check
   (Supabase dashboard → Database → Migrations, or `supabase migration list`).
5. Redeploy so the build picks the variables up:
   ```bash
   vercel --prod
   ```

Reload your live URL — Search, Calculator, Batches, and Inventory
should now all work for real, from anywhere, on any device.

### Validate before you deploy

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build          # needs VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (CI uses placeholders)
npm run check:bundle   # fails if a secret reached dist/
npm run e2e            # Playwright against the build
```

Deploy to a Preview first and check that deployment, not localhost.

## 5. (Optional) Turn on Gemini AI — free

The Ask tab, "Ask Gemini" in Search, "Advise me" in the Calculator and
"AI insights" in Batches all use Google Gemini's free tier.

1. Open [aistudio.google.com/apikey](https://aistudio.google.com/apikey),
   sign in with a Google account, and click **Create API key**. No credit
   card needed.
2. In Vercel → your project → **Settings → Environment Variables**, add
   `GEMINI_API_KEY` with that key. **No `VITE_` prefix** — the key must
   stay on the server.
3. Redeploy (`vercel --prod`, or push to `main`).

Free-tier limits reset daily; when they run out the app says so and the
rest of the app keeps working. On the free tier Google may use what you
send to improve its products.

## After this: auto-deploy on every push

Once the GitHub repo is connected (Vercel does this automatically
during step 3's login if you deployed via a Git-connected flow — if not,
connect it from the Vercel dashboard: **Project → Settings → Git**),
every `git push` to `main` redeploys the live site automatically. From
then on your workflow is just:

```bash
git add .
git commit -m "whatever you changed"
git push
```

## What's actually free here

- **Vercel Hobby tier**: free for personal, non-commercial projects —
  covers this comfortably (generous bandwidth/build limits for a
  personal tool).
- **Supabase free tier**: free project with a real Postgres database,
  which is what you're already using.
- **GitHub**: free for public or private repos at this scale.

Nothing here requires a credit card.
