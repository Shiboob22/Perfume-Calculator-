-- =====================================================================
-- 0003 plans + entitlements. Free for now, billing-ready: no payment
-- provider is connected. Everyone is on Free unless a user_plans row says
-- otherwise; the owner flips a user by hand with set_user_plan().
--
-- The feature map below is the Phase 1 PROPOSAL, pending the owner's
-- approval. It lives here, not in code, so changing it is one UPDATE:
--   update plans set features = … , batch_cap = … where id = 'free';
-- Feature keys: batches.unlimited, inventory, ai.ask, export.labels,
-- calculator.advanced, cards.download.
-- =====================================================================

create table public.plans (
  id text primary key,
  name text not null,
  features text[] not null default '{}',
  batch_cap integer,            -- null = unlimited
  sort smallint not null default 0
);

insert into public.plans (id, name, features, batch_cap, sort) values
  ('free', 'Free', '{cards.download}', 25, 0),
  ('pro',  'Pro',  '{batches.unlimited,inventory,ai.ask,export.labels,calculator.advanced,cards.download}', null, 1);

create table public.user_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_id text not null default 'free' references public.plans(id),
  source text not null default 'manual' check (source in ('manual', 'provider')),
  updated_at timestamptz not null default now()
);

alter table public.plans enable row level security;
alter table public.user_plans enable row level security;

-- Plans are public (the pricing page reads them); a user reads only their
-- own plan row. Nobody writes either from the browser.
create policy plans_read on public.plans for select to anon, authenticated using (true);
create policy user_plans_read_own on public.user_plans for select to authenticated
  using ((select auth.uid()) = user_id);
revoke insert, update, delete, truncate on public.plans, public.user_plans from anon, authenticated;

-- The owner's switch, from the SQL editor:  select set_user_plan('someone@example.com', 'pro');
create function public.set_user_plan(p_email text, p_plan text)
returns public.user_plans
language plpgsql security definer
set search_path = ''
as $$
declare
  uid uuid;
  result public.user_plans;
begin
  select id into uid from auth.users where lower(email) = lower(btrim(p_email));
  if uid is null then raise exception 'No user with email %', p_email; end if;
  insert into public.user_plans (user_id, plan_id, source, updated_at)
  values (uid, p_plan, 'manual', now())
  on conflict (user_id) do update set plan_id = excluded.plan_id, source = 'manual', updated_at = now()
  returning * into result;
  return result;
end
$$;
revoke all on function public.set_user_plan(text, text) from public, anon, authenticated;

-- The owner is on Pro (a no-op where the account doesn't exist).
insert into public.user_plans (user_id, plan_id)
select id, 'pro' from auth.users where email = 'hishamshiboob@gmail.com'
on conflict (user_id) do nothing;
