-- =====================================================================
-- 0012 Resting Journal: short check-ins on a resting batch.
-- A check-in is one line of text and/or a 1–5 rating, made on a given day
-- of the rest (counted from the batch's start). Scheduled points are
-- computed in the app (src/lib/calc/journal.js); `scheduled_day` records
-- which point a check-in answers, null for an ad-hoc one. A skipped point
-- is stored too, so it stops showing as due on every device.
--
-- Written only through /api/checkins (same model as batches since 0011):
-- the API is where the per-batch maximum and the rate limit live. Users
-- read their own rows (the data export reads them from the browser).
--
-- Adds: one unique constraint on batches(id, user_id) (id is already the
-- primary key, so no existing row can violate it), one table, and the
-- `journal.insights` feature on the Pro plan. No existing rows change.
-- =====================================================================

-- Lets a check-in reference (batch, owner) together, so a check-in can
-- never point at somebody else's batch, whatever the API does.
alter table public.batches
  add constraint batches_id_user_id_key unique (id, user_id);

create table public.batch_checkins (
  id uuid primary key,                       -- made by the client; retries are idempotent
  batch_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  day smallint not null check (day between 0 and 730),
  scheduled_day smallint check (scheduled_day is null or scheduled_day between 0 and 730),
  note text check (note is null or char_length(note) between 1 and 280),
  rating smallint check (rating is null or rating between 1 and 5),
  skipped boolean not null default false,
  created_at timestamptz not null default now(),
  constraint batch_checkins_batch_fkey foreign key (batch_id, user_id)
    references public.batches(id, user_id) on delete cascade,
  -- An answer has something in it; a skip has nothing and belongs to a
  -- scheduled point.
  constraint batch_checkins_content check (
    (not skipped and (note is not null or rating is not null))
    or (skipped and note is null and rating is null and scheduled_day is not null)
  )
);

-- One answer (or skip) per scheduled point of a batch; ad-hoc check-ins
-- are unlimited here (the API caps the total per batch).
create unique index batch_checkins_one_per_point
  on public.batch_checkins (batch_id, scheduled_day) where scheduled_day is not null;
create index batch_checkins_user_batch on public.batch_checkins (user_id, batch_id);

alter table public.batch_checkins enable row level security;
create policy batch_checkins_read_own on public.batch_checkins for select to authenticated
  using ((select auth.uid()) = user_id);
revoke all on table public.batch_checkins from anon;
revoke insert, update, delete, truncate on table public.batch_checkins from authenticated;

-- The personal pattern ("your Woody blends rated highest around day N")
-- is a Pro feature; check-ins themselves are open to every plan.
update public.plans
  set features = array_append(features, 'journal.insights')
  where id = 'pro' and not ('journal.insights' = any (features));
