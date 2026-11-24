-- 0042: Bring a friend (owner, 2026-11-21).
--
-- A Pro user shares an invite link (/bench?ref=invite-<code>). A friend who
-- signs up through it (profiles.signup_ref, saved at onboarding) and logs a
-- first batch gets a month of Pro, and so does the inviter, who can earn at
-- most 6 months this way. Nothing is charged.
--
--   1. user_plans: a new source 'gift' with its own end, gift_ends_at, so a
--      gifted month never uses up the 14-day trial. effective_plan() and
--      start_pro_trial() learn it.
--   2. grant_pro_days(): adds days of gifted Pro (service role only).
--   3. invite_codes (one per user) and referrals (one per friend), read by
--      their owner, written only through the functions below.
--   4. claim_invite(): called by /api/batches after a friend's log.
--
-- Additive: no existing row changes. Re-runnable.

-- ------------------------------------------------------------ 1. user_plans
alter table public.user_plans add column if not exists gift_ends_at timestamptz;
alter table public.user_plans drop constraint if exists user_plans_source_check;
alter table public.user_plans
  add constraint user_plans_source_check check (source in ('manual', 'provider', 'trial', 'gift'));

create or replace function public.effective_plan(p_user uuid)
returns text
language sql stable
set search_path = ''
as $$
  select coalesce(
    (select case
              when up.source = 'trial' and (up.trial_ends_at is null or up.trial_ends_at <= now()) then 'free'
              when up.source = 'gift' and (up.gift_ends_at is null or up.gift_ends_at <= now()) then 'free'
              else up.plan_id end
       from public.user_plans up where up.user_id = p_user),
    'free')
$$;

-- As 0031, but a running gift counts as Pro, and an ended one does not.
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
  if cur.user_id is not null and cur.plan_id = 'pro'
     and (cur.source in ('manual', 'provider') or (cur.source = 'gift' and cur.gift_ends_at > now())) then
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

-- ------------------------------------------------------- 2. grant_pro_days
-- Manual or provider Pro is left alone ('already_pro'). A running trial or
-- gift is extended from its end; anyone else gets Pro from now.
create or replace function public.grant_pro_days(p_user uuid, p_days integer)
returns table (status text, ends_at timestamptz)
language plpgsql security definer
set search_path = ''
as $$
declare
  cur public.user_plans;
  base timestamptz := now();
begin
  if p_days is null or p_days < 1 or p_days > 366 then raise exception 'grant_pro_days: bad days %', p_days; end if;
  perform pg_advisory_xact_lock(hashtextextended('trial:' || p_user::text, 0));
  select * into cur from public.user_plans where user_id = p_user;
  if cur.user_id is not null and cur.plan_id = 'pro' and cur.source in ('manual', 'provider') then
    return query select 'already_pro'::text, null::timestamptz; return;
  end if;
  if cur.source = 'trial' and cur.trial_ends_at > now() then base := cur.trial_ends_at; end if;
  if cur.source = 'gift' and cur.gift_ends_at > now() then base := cur.gift_ends_at; end if;
  insert into public.user_plans (user_id, plan_id, source, gift_ends_at, updated_at)
  values (p_user, 'pro', 'gift', base + make_interval(days => p_days), now())
  on conflict (user_id) do update
    set plan_id = 'pro', source = 'gift', gift_ends_at = base + make_interval(days => p_days), updated_at = now()
  returning * into cur;
  return query select 'granted'::text, cur.gift_ends_at;
end
$$;
revoke all on function public.grant_pro_days(uuid, integer) from public, anon, authenticated;
grant execute on function public.grant_pro_days(uuid, integer) to service_role;

-- ------------------------------------------------ 3. invite_codes, referrals
create table if not exists public.invite_codes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code text not null unique check (code ~ '^[a-z0-9]{8}$'),
  created_at timestamptz not null default now()
);

-- user_id is the inviter (the row's owner); friend_id is unique, so a friend
-- is claimed once, by one inviter.
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  friend_id uuid not null unique references auth.users (id) on delete cascade,
  inviter_rewarded boolean not null default false,
  created_at timestamptz not null default now(),
  check (user_id <> friend_id)
);
create index if not exists referrals_user_idx on public.referrals (user_id);

alter table public.invite_codes enable row level security;
alter table public.referrals enable row level security;
drop policy if exists invite_codes_read_own on public.invite_codes;
create policy invite_codes_read_own on public.invite_codes for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists referrals_read_own on public.referrals;
create policy referrals_read_own on public.referrals for select to authenticated
  using (user_id = (select auth.uid()));
revoke insert, update, delete, truncate on public.invite_codes, public.referrals from anon, authenticated;
revoke all on public.invite_codes, public.referrals from anon;

-- ---------------------------------------------------------- 4. claim_invite
-- The friend's first logged batch claims the invite once: the friend gets 30
-- days of Pro; the inviter too, while they have earned fewer than 6. Refused:
-- an unknown code, inviting yourself, an account older than the code, a
-- friend with no batch, or a friend already claimed.
create or replace function public.claim_invite(p_friend uuid, p_code text)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  inviter uuid;
  code_at timestamptz;
  earned integer;
begin
  select ic.user_id, ic.created_at into inviter, code_at from public.invite_codes ic where ic.code = p_code;
  if inviter is null then return 'unknown_code'; end if;
  if inviter = p_friend then return 'self'; end if;
  perform pg_advisory_xact_lock(hashtextextended('invite:' || inviter::text, 0));
  if exists (select 1 from public.referrals r where r.friend_id = p_friend) then return 'already_claimed'; end if;
  if (select u.created_at from auth.users u where u.id = p_friend) < code_at then return 'older_account'; end if;
  if not exists (select 1 from public.batches b where b.user_id = p_friend) then return 'no_batch'; end if;

  select count(*) into earned from public.referrals r where r.user_id = inviter and r.inviter_rewarded;
  insert into public.referrals (user_id, friend_id, inviter_rewarded) values (inviter, p_friend, earned < 6);
  perform public.grant_pro_days(p_friend, 30);
  if earned < 6 then perform public.grant_pro_days(inviter, 30); end if;
  return case when earned < 6 then 'both' else 'friend_only' end;
end
$$;
revoke all on function public.claim_invite(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_invite(uuid, text) to service_role;
