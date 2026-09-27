# Billing

The app is **free for now and billing-ready**. Plans and entitlements are
real; no payment provider is connected. The owner moves people to Pro
by hand.

## Today

- The `plans` table holds `free` and `pro`: their features and the batch cap
  (see `0003_plans.sql`). The pricing page and `can()` both read it, so
  changing a plan is one `UPDATE`, with no redeploy.
- `user_plans` holds one row per user who is not on plain Free. No row means
  Free.
- To give someone Pro, run this in the SQL editor:

  ```sql
  select set_user_plan('someone@example.com', 'pro');   -- source = 'manual'
  select set_user_plan('someone@example.com', 'free');
  ```

- The Pricing page's "Join the Pro waitlist" button adds the signed-in user
  to `pro_waitlist`. To see who is waiting:

  ```sql
  select u.email, w.locale, w.created_at
  from pro_waitlist w join auth.users u on u.id = w.user_id
  order by w.created_at;
  ```

## The seam (where a provider plugs in)

| Piece | Where | State |
|---|---|---|
| Provider interface | `api/_lib/billing.ts` → `BillingProvider` | defined |
| Provider choice | `getProvider()` | returns `null` (billing off) |
| Webhook | `POST /api/billing/webhook` | answers **501** until a provider is set |
| Event log | `billing_events` (unique per provider + event id) | service role only |
| Plan rule | `resolvePlan()` (tested in `billing.test.ts`) | see the pending decision below |
| Customer link | `user_plans.provider_customer_id`, `current_period_end` | filled by the webhook |

### Flow once a provider is connected

1. The user taps "Upgrade". The app calls a new `POST /api/billing/checkout`,
   which calls `provider.checkoutUrl(user, 'pro')` and redirects. **Our user
   id goes in the provider's metadata.**
2. The provider calls `/api/billing/webhook`. The adapter's `verify()` checks
   the signature over the **raw** body (the webhook turns off body parsing)
   and translates the payload into a `BillingEvent`.
3. `applyEvent()` stores the event once in `billing_events`, applies
   `resolvePlan()` to `user_plans`, and marks the event processed.
   - An event that was already processed is a no-op.
   - An event that is stored but not yet processed (an earlier attempt
     failed) is applied again.
4. `/api/me` reads the plan as before. Nothing else in the app changes.

### Writing an adapter

- Set `status` from the subscription's **current state**, not the event's
  name. Providers deliver events out of order; a late "cancelled" must not
  undo a newer renewal. When in doubt, fetch the subscription from the
  provider inside `verify()`.
- Map the provider's price or product id to our plan id (`'pro'`) in the
  adapter. Never trust a plan name sent by the client.
- Keep the webhook secret and API key in Vercel env (Production only), never
  in `VITE_*`. `npm run check:bundle` fails the build if a key reaches the
  browser bundle.
- Test with the provider's test mode against the **staging** Supabase project
  (Vercel Preview is already pointed at it).

## Owner decisions pending

1. **Manual grants vs provider events.** Current rule: a plan the owner gave
   by hand (`source = 'manual'`, not Free) is never changed by a provider
   event. So ending a subscription doesn't cancel a comp, and a comped user who
   also subscribes stays `manual`. The alternative: the latest event always
   wins.
2. **Which provider.** This decides tax handling, since a merchant of record
   such as Paddle or Lemon Squeezy handles VAT, while Stripe leaves it with
   you.
3. **Prices and currencies**, including whether there is an annual plan.
4. **What happens to Pro-only data on downgrade.** Today nothing is deleted.
   Inventory and Ask are hidden; batches over the cap stay readable, and
   logging a new one is blocked.
