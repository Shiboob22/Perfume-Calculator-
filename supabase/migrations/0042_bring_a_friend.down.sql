-- Undo 0042. DESTRUCTIVE when invites were used: drops every invite code and
-- referral, and turns gifted Pro (source 'gift') back into Free.
drop function if exists public.claim_invite(uuid, text);
drop function if exists public.grant_pro_days(uuid, integer);
drop table if exists public.referrals;
drop table if exists public.invite_codes;

update public.user_plans set plan_id = 'free', source = 'manual' where source = 'gift';
alter table public.user_plans drop constraint if exists user_plans_source_check;
alter table public.user_plans add constraint user_plans_source_check check (source in ('manual', 'provider', 'trial'));
alter table public.user_plans drop column if exists gift_ends_at;

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
