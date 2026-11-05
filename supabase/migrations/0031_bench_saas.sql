-- =====================================================================
-- 0031 Bench SaaS round, Phase 2: data and plans. Additive and re-runnable
-- (every statement checks before it adds; running the file twice changes
-- nothing the second time). No existing row is deleted or rewritten except
-- batches.batch_no, which is only filled where it is still null.
--
-- Formulas are the existing recipes (0023): a recipe is the formula, each
-- version its settings. New here:
--   1. plans: the Free limits as columns (formula_cap 5, ingredient_cap 3,
--      journal_window 3; null = unlimited) and the `journal.reminders`
--      feature on Pro. Cost per bottle stays `calculator.advanced`; the
--      full journal stays `journal.checkins`. Label PNG and share links are
--      Free on every plan (owner, Phase 0): no feature key, no lock.
--   2. user_plans: a 14-day trial (source 'trial', trial_started_at,
--      trial_ends_at) and effective_plan(), which reads an ended trial as
--      Free. The plan stays in user_plans, not profiles: profiles are
--      written straight from the browser, user_plans only by the server.
--   3. recipe_ingredients: the blend materials of a recipe version
--      (owner-only RLS, like the versions), capped per version by the plan.
--   4. recipes: the formula cap by plan (Free 5) on insert. A Free user who
--      already has more keeps every one; only new ones are refused.
--   5. batches: batch_no (No. 1, 2, … per user, backfilled by poured date,
--      ties by created_at then id) and remind (Pro, set through /api).
--   6. batch_checkins (the batch notes): tags.
--   7. start_pro_trial(): one trial per user, service role only.
-- Down: 0031_bench_saas.down.sql.
-- =====================================================================

-- ------------------------------------------------------------ 1. plans
alter table public.plans
  add column if not exists formula_cap integer,
  add column if not exists ingredient_cap integer,
  add column if not exists journal_window integer;

update public.plans set formula_cap = 5, ingredient_cap = 3, journal_window = 3 where id = 'free';
update public.plans set formula_cap = null, ingredient_cap = null, journal_window = null where id = 'pro';
update public.plans
   set features = array_append(features, 'journal.reminders')
 where id = 'pro' and not ('journal.reminders' = any (features));

-- ------------------------------------------------------- 2. user_plans
alter table public.user_plans
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_ends_at timestamptz;

alter table public.user_plans drop constraint if exists user_plans_source_check;
alter table public.user_plans
  add constraint user_plans_source_check check (source in ('manual', 'provider', 'trial'));

-- The plan in force for a user: a trial that has ended reads as Free (no
-- job has to flip it back). SECURITY INVOKER: a signed-in user only sees
-- their own user_plans row, so asking about anyone else answers 'free'.
create or replace function public.effective_plan(p_user uuid)
returns text
language sql stable
set search_path = ''
as $$
  select coalesce(
    (select case when up.source = 'trial' and (up.trial_ends_at is null or up.trial_ends_at <= now())
                 then 'free' else up.plan_id end
       from public.user_plans up where up.user_id = p_user),
    'free')
$$;

-- A plan's limit by name ('formula_cap' | 'ingredient_cap' | 'journal_window'),
-- null when unlimited.
create or replace function public.plan_limit(p_user uuid, p_limit text)
returns integer
language sql stable
set search_path = ''
as $$
  select case p_limit
           when 'formula_cap' then p.formula_cap
           when 'ingredient_cap' then p.ingredient_cap
           when 'journal_window' then p.journal_window
         end
    from public.plans p where p.id = public.effective_plan(p_user)
$$;

-- ------------------------------------------------ 3. recipe_ingredients
create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.recipe_versions(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  position smallint not null check (position between 0 and 99),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  type text not null default 'eo' check (type in ('eo', 'aroma', 'absolute', 'fixative', 'dpg')),
  -- Share of the concentrate by weight, %.
  pct numeric not null check (pct > 0 and pct <= 100),
  price_per_g numeric check (price_per_g is null or (price_per_g >= 0 and price_per_g <= 100000)),
  created_at timestamptz not null default now(),
  unique (version_id, position)
);
create index if not exists recipe_ingredients_user_idx on public.recipe_ingredients (user_id);

-- The version must be the caller's, and the plan caps how many materials a
-- version holds (Free 3). A hard cap of 30 stops runaway writes on Pro.
create or replace function public.recipe_ingredient_before_insert() returns trigger
language plpgsql set search_path = public as $$
declare
  cap integer := coalesce(public.plan_limit(new.user_id, 'ingredient_cap'), 30);
begin
  if not exists (select 1 from public.recipe_versions v where v.id = new.version_id and v.user_id = new.user_id) then
    raise exception 'recipe version not found' using errcode = '42501';
  end if;
  if (select count(*) from public.recipe_ingredients where version_id = new.version_id) >= cap then
    raise exception 'ingredient_cap %', cap using errcode = '54000';
  end if;
  return new;
end $$;
drop trigger if exists recipe_ingredients_before_insert on public.recipe_ingredients;
create trigger recipe_ingredients_before_insert before insert on public.recipe_ingredients
  for each row execute function public.recipe_ingredient_before_insert();

alter table public.recipe_ingredients enable row level security;
drop policy if exists recipe_ingredients_own on public.recipe_ingredients;
create policy recipe_ingredients_own on public.recipe_ingredients for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on table public.recipe_ingredients from anon;
-- Ingredients belong to an immutable version: add or remove, never edit.
revoke update on table public.recipe_ingredients from authenticated;

-- ------------------------------------------------- 4. the formula cap
-- Replaces 0023's function: the plan's cap (Free 5), and 50 on Pro as
-- before. Existing recipes are never touched.
create or replace function public.recipe_before_insert() returns trigger
language plpgsql set search_path = public as $$
declare
  cap integer := coalesce(public.plan_limit(new.user_id, 'formula_cap'), 50);
begin
  if (select count(*) from public.recipes where user_id = new.user_id) >= cap then
    raise exception 'formula_cap %', cap using errcode = '54000';
  end if;
  return new;
end $$;

-- ---------------------------------------------------------- 5. batches
alter table public.batches
  add column if not exists batch_no integer check (batch_no is null or batch_no > 0),
  add column if not exists remind boolean not null default false;

create unique index if not exists batches_user_batch_no_key
  on public.batches (user_id, batch_no) where batch_no is not null;

-- Backfill: number every unnumbered batch of a user after their highest
-- number so far, oldest poured first (blend_date, then created_at, then id
-- for rows poured and saved in the same instant). Rows already numbered
-- keep their number; rows without a user are left alone.
with unnumbered as (
  select b.id,
         coalesce((select max(n.batch_no) from public.batches n where n.user_id = b.user_id), 0)
           + row_number() over (partition by b.user_id order by b.blend_date, b.created_at, b.id) as no
    from public.batches b
   where b.batch_no is null and b.user_id is not null
)
update public.batches b set batch_no = u.no from unnumbered u where b.id = u.id;

-- New batches take the next number. The per-user advisory lock keeps two
-- logs at the same moment from taking the same number.
create or replace function public.batch_before_insert_number() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.batch_no is null and new.user_id is not null then
    perform pg_advisory_xact_lock(hashtextextended('batch_no:' || new.user_id::text, 0));
    select coalesce(max(batch_no), 0) + 1 into new.batch_no from public.batches where user_id = new.user_id;
  end if;
  return new;
end $$;
drop trigger if exists batches_before_insert_number on public.batches;
create trigger batches_before_insert_number before insert on public.batches
  for each row execute function public.batch_before_insert_number();

-- ------------------------------------------------- 6. batch notes (tags)
alter table public.batch_checkins
  add column if not exists tags text[] not null default '{}';
alter table public.batch_checkins drop constraint if exists batch_checkins_tags_check;
alter table public.batch_checkins
  add constraint batch_checkins_tags_check check (
    cardinality(tags) <= 7
    and tags <@ array['harsh', 'sharp', 'rounder', 'sweeter', 'woodier', 'fading', 'ready']::text[]
  );

-- ------------------------------------------------------ 7. the trial
-- One 14-day Pro trial per user. Returns 'started' (with the end), or why
-- not: 'already_pro' (a manual or provider Pro plan, left untouched) or
-- 'trial_used'. Service role only: /api/account calls it after checking
-- the session.
-- TODO(payments): when a provider is connected, its checkout replaces or
-- follows this; the webhook sets source = 'provider' (docs/billing.md).
create or replace function public.start_pro_trial(p_user uuid)
returns table (status text, ends_at timestamptz)
language plpgsql security definer
set search_path = ''
as $$
declare
  cur public.user_plans;
begin
  perform pg_advisory_xact_lock(hashtextextended('trial:' || p_user::text, 0));
  select * into cur from public.user_plans where user_id = p_user;
  if cur.user_id is not null and cur.plan_id = 'pro' and cur.source <> 'trial' then
    return query select 'already_pro'::text, null::timestamptz; return;
  end if;
  if cur.trial_started_at is not null then
    return query select 'trial_used'::text, cur.trial_ends_at; return;
  end if;
  insert into public.user_plans (user_id, plan_id, source, trial_started_at, trial_ends_at, updated_at)
  values (p_user, 'pro', 'trial', now(), now() + interval '14 days', now())
  on conflict (user_id) do update
    set plan_id = 'pro', source = 'trial', trial_started_at = now(),
        trial_ends_at = now() + interval '14 days', updated_at = now()
  returning * into cur;
  return query select 'started'::text, cur.trial_ends_at;
end
$$;
revoke all on function public.start_pro_trial(uuid) from public, anon, authenticated;
grant execute on function public.start_pro_trial(uuid) to service_role;
