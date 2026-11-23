-- 0037 · Journal J2b, web push (docs/redesign/Kyphira-Journal_Brief_v1.md).
--
-- push_subscriptions: one browser or installed app that agreed to be nudged when a batch
-- reaches a Journal milestone. The push carries no content (api/_lib/webpush.ts); the
-- endpoint is the address of the browser's push service. p256dh and auth are the keys a
-- payload would be encrypted to: kept so a future message can carry words, unused today.
--
-- Written only through /api (the Pro gate lives there); the owner may read their own rows
-- (RLS, for the data export). Cascades with the account. A subscription the push service
-- reports gone is deleted by the daily job.
--
-- Additive and re-runnable: a new table. No existing row changes.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null check (char_length(endpoint) <= 600 and endpoint like 'https://%'),
  p256dh text check (p256dh is null or char_length(p256dh) <= 200),
  auth text check (auth is null or char_length(auth) <= 100),
  created_at timestamptz not null default now(),
  unique (endpoint)
);

create index if not exists push_subscriptions_user on public.push_subscriptions (user_id);

comment on table public.push_subscriptions is
  'Web push subscriptions (0037) for Journal reminders. Written only through /api; owner reads (RLS).';

alter table public.push_subscriptions enable row level security;
drop policy if exists push_subscriptions_read_own on public.push_subscriptions;
create policy push_subscriptions_read_own on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on table public.push_subscriptions from anon, authenticated;
grant select on table public.push_subscriptions to authenticated;
