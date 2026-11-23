-- 0036 · Journal J2, reminders that arrive (docs/redesign/Kyphira-Journal_Brief_v1.md).
--
-- reminder_sends: one row per reminder already sent for a batch milestone on
-- a channel, so a milestone is announced once, never twice (the daily job
-- checks it before sending and inserts after). Written only by the job with
-- the service role; the owner may read their own rows (RLS, for the data
-- export). Cascades with the batch and with the account.
--
-- Additive and re-runnable: a new table. No existing row changes.

create table if not exists public.reminder_sends (
  batch_id uuid not null references public.batches (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  milestone text not null check (milestone in ('d1', 'w1', 'w2', 'm1', 'm3')),
  channel text not null default 'email' check (channel in ('email', 'push')),
  sent_at timestamptz not null default now(),
  primary key (batch_id, milestone, channel)
);

create index if not exists reminder_sends_user on public.reminder_sends (user_id);

comment on table public.reminder_sends is
  'Journal reminders already sent (0036): once per batch milestone per channel. Written by the daily job only; owner reads (RLS).';

alter table public.reminder_sends enable row level security;
drop policy if exists reminder_sends_read_own on public.reminder_sends;
create policy reminder_sends_read_own on public.reminder_sends for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on table public.reminder_sends from anon, authenticated;
grant select on table public.reminder_sends to authenticated;
