-- =====================================================================
-- 0009 billing seam: where a payment provider plugs in later. No provider
-- is connected. See docs/billing.md for the flow.
--   user_plans.source ('manual' | 'provider') already exists (0003);
--   provider_customer_id / current_period_end are filled by the webhook;
--   billing_events keeps every provider event once (idempotent), readable
--   and writable by the service role only.
-- =====================================================================

alter table public.user_plans
  add column provider_customer_id text,
  add column current_period_end timestamptz;

create table public.billing_events (
  id bigint generated always as identity primary key,
  provider text not null,
  event_id text not null,
  type text,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, event_id)
);

alter table public.billing_events enable row level security;
revoke all on table public.billing_events from anon, authenticated;
-- No policies: only the service role (the webhook) touches this table.
