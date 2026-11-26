-- The API verifies the owner's identity before calling these service-only functions.
create table public.owner_support_actions (
  request_id uuid primary key,
  actor uuid not null,
  target uuid not null,
  action text not null,
  reason text not null,
  requested_end timestamptz,
  created_at timestamptz not null default now(),
  result jsonb not null
);
create index owner_actions_target_time on public.owner_support_actions(target, created_at desc);
alter table public.owner_support_actions enable row level security;
revoke all on public.owner_support_actions from public, anon, authenticated, service_role;

create function public.owner_overview() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'Accounts', count(*),
    'Ever signed in', count(u.last_sign_in_at),
    'With recorded sessions', count(*) filter (where exists (
      select from auth.sessions s where s.user_id=u.id and (s.not_after is null or s.not_after>now()))),
    'Trials ending in 7 days', count(*) filter (where pl.source='trial' and pl.trial_ends_at>now()
      and pl.trial_ends_at<=now()+interval '7 days'),
    'Signups in 30 days', count(*) filter (where u.created_at>=now()-interval '30 days'),
    'Onboarded from these signups', count(p.onboarded_at) filter (where u.created_at>=now()-interval '30 days'),
    'Started trials from these signups', count(pl.trial_started_at) filter (where u.created_at>=now()-interval '30 days'),
    'Saved recipes from these signups', count(*) filter (where u.created_at>=now()-interval '30 days'
      and exists(select from public.recipes r where r.user_id=u.id))
  ) from auth.users u left join public.profiles p on p.user_id=u.id left join public.user_plans pl on pl.user_id=u.id
$$;

create function public.owner_directory(search text, page integer) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(to_jsonb(rows) order by joined desc nulls last,id),'[]') from (
    select id,email,coalesce(raw_user_meta_data->>'full_name',raw_user_meta_data->>'name') as name,
      created_at as joined,last_sign_in_at as signed_in,public.effective_plan(id) as plan
    from auth.users where strpos(lower(coalesce(email,'')),lower(search))>0
      or strpos(lower(coalesce(raw_user_meta_data->>'full_name',raw_user_meta_data->>'name','')),lower(search))>0
    order by joined desc nulls last,id limit 26 offset (page::bigint*25)
  ) rows
$$;

create function public.owner_detail(target_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'account',jsonb_build_object('User ID',u.id,'Name',coalesce(u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'name'),
      'Email',u.email,'Email confirmed',u.email_confirmed_at,'Phone',u.phone,'Phone confirmed',u.phone_confirmed_at,
      'Providers',u.raw_app_meta_data->'providers','Provider account ID',u.raw_user_meta_data->>'sub','Profile photo',u.raw_user_meta_data->>'avatar_url',
      'Role',u.role,'Moderator',exists(select from public.admins where user_id=u.id),'Banned until',u.banned_until,
      'Joined',u.created_at,'Latest sign-in',u.last_sign_in_at),
    'preferences',jsonb_build_object('Language',p.locale,'Currency',p.currency,'Unit',p.default_unit,'Bottle size',p.default_bottle,
      'Seller',p.sells,'Shop',p.shop_name,'Wear statistics',p.wear_stats_opt_in,'Digits',p.digits,'Referral',p.signup_ref),
    'plan',jsonb_build_object('Effective plan',public.effective_plan(u.id),'Source',pl.source,'Trial start',pl.trial_started_at,
      'Trial end',pl.trial_ends_at,'Gift end',pl.gift_ends_at,'Billing period end',pl.current_period_end),
    'work',jsonb_build_object(
      'Recipes',(select count(*) from public.recipes where user_id=u.id),
      'Batches',(select count(*) from public.batches where user_id=u.id),
      'Presets',(select count(*) from public.calc_presets where user_id=u.id),
      'Inventory items',(select count(*) from public.inventory where user_id=u.id),
      'Wardrobe bottles',(select count(*) from public.wardrobe_bottles where user_id=u.id),
      'Wear logs',(select count(*) from public.wear_log where user_id=u.id),
      'Notes',(select count(*) from public.fragrance_notes where user_id=u.id),
      'Seller orders',(select count(*) from public.seller_orders where user_id=u.id),
      'Salon posts',(select count(*) from public.salon_posts where user_id=u.id)),
    'sessions',(select coalesce(jsonb_agg(jsonb_build_object('Created',s.created_at,'Last refresh',s.refreshed_at,
      'Updated',s.updated_at,'Expires',s.not_after,'Reported browser and device',s.user_agent,'IP',s.ip,
      'Assurance level',s.aal) order by s.created_at desc),'[]') from auth.sessions s where s.user_id=u.id),
    'timeline',(select coalesce(jsonb_agg(to_jsonb(e) order by at desc,label),'[]') from (
      select * from (values (u.created_at,'Account created'),(u.last_sign_in_at,'Latest sign-in'),
        (p.onboarded_at,'Onboarding completed'),(p.bench_tour_at,'Bench tour recorded'),
        (p.updated_at,'Profile updated'),(pl.trial_started_at,'Trial started'),
        ((select min(created_at) from public.recipes where user_id=u.id),'Earliest saved recipe')) milestones(at,label)
      union all select s.created_at,'Session created' from auth.sessions s where s.user_id=u.id
      union all select s.refreshed_at,'Session refreshed' from auth.sessions s where s.user_id=u.id
      union all select a.created_at,'Auth: ' || (a.payload->>'action') from auth.audit_log_entries a where a.payload->>'actor_id'=u.id::text
      union all select a.created_at, a.action || ' · ' || (a.result->>'message') || ' · ' || a.reason || ' · by ' || a.actor::text
        from public.owner_support_actions a where a.target=u.id
    ) e where at is not null)
  ) from auth.users u left join public.profiles p on p.user_id=u.id left join public.user_plans pl on pl.user_id=u.id
  where u.id=target_id
$$;

create function public.owner_action(request_key uuid, actor_id uuid, target_id uuid, operation text, note text, new_end timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  previous public.owner_support_actions;
  outcome jsonb;
  affected integer;
begin
  -- Serialize retries before touching sessions, including sessions created after the first request.
  perform pg_advisory_xact_lock(hashtextextended(request_key::text,0));
  select * into previous from public.owner_support_actions where request_id=request_key;
  if found then
    if (previous.actor,previous.target,previous.action,previous.reason,previous.requested_end)
      is distinct from (actor_id,target_id,operation,note,new_end) then
      return jsonb_build_object('ok',false,'message','Request ID already used');
    end if;
    return previous.result;
  end if;
  if not exists(select from auth.users where id=target_id) then
    outcome := jsonb_build_object('ok',false,'message','Account no longer exists');
  elsif operation='extend_trial' then
    update public.user_plans set trial_ends_at=new_end,updated_at=now()
      where user_id=target_id and source='trial' and new_end>now() and new_end>trial_ends_at;
    if found then
      outcome := jsonb_build_object('ok',true,'message','Trial extended','ends_at',new_end);
    else
      outcome := jsonb_build_object('ok',false,'message','A trial and a later future expiration are required');
    end if;
  elsif operation='revoke_sessions' then
    -- Supabase Auth cascades session deletion to its refresh tokens.
    delete from auth.sessions where user_id=target_id;
    get diagnostics affected = row_count;
    outcome := jsonb_build_object('ok',true,'message',affected || ' sessions revoked','affected',affected);
  else
    raise exception 'Unsupported operation';
  end if;
  insert into public.owner_support_actions(request_id,actor,target,action,reason,requested_end,result)
    values(request_key,actor_id,target_id,operation,note,new_end,outcome);
  return outcome;
end
$$;

revoke all on function public.owner_overview(),public.owner_directory(text,integer),public.owner_detail(uuid),
  public.owner_action(uuid,uuid,uuid,text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.owner_overview(),public.owner_directory(text,integer),public.owner_detail(uuid),
  public.owner_action(uuid,uuid,uuid,text,text,timestamptz) to service_role;
