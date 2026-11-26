-- Run after 0043 on staging. All fixture accounts and session records roll back.
begin;
do $$
declare
  actor uuid := gen_random_uuid();
  target uuid := gen_random_uuid();
  other_user uuid := gen_random_uuid();
  original_session uuid := gen_random_uuid();
  other_session uuid := gen_random_uuid();
  request_key uuid := gen_random_uuid();
  trial_key uuid := gen_random_uuid();
  expiry timestamptz := now()+interval '10 days';
  result jsonb;
  role_name text;
  signature text;
begin
  foreach role_name in array array['anon','authenticated'] loop
    foreach signature in array array['public.owner_overview()','public.owner_detail(uuid)',
      'public.owner_directory(text,integer)','public.owner_action(uuid,uuid,uuid,text,text,timestamptz)'] loop
      assert not has_function_privilege(role_name,signature,'execute');
    end loop;
    assert not has_table_privilege(role_name,'public.owner_support_actions','select');
  end loop;
  insert into auth.users(id,email,raw_user_meta_data,created_at) values
    (target,target || '@example.test','{"name":"owner-dashboard-fixture"}',now()),
    (other_user,other_user || '@example.test','{"name":"owner-dashboard-fixture"}',now());
  assert jsonb_array_length(public.owner_directory('owner-dashboard-fixture',0))=2;
  assert public.owner_detail(target)->'account'->>'Latest sign-in' is null;
  assert public.owner_overview()->>'Accounts' is not null;
  insert into auth.sessions(id,user_id,created_at) values(original_session,target,now()),(other_session,other_user,now());
  insert into auth.refresh_tokens(session_id,token,user_id,revoked) values
    (original_session,gen_random_uuid()::text,target::text,false),(other_session,gen_random_uuid()::text,other_user::text,false);
  result := public.owner_action(request_key,actor,target,'revoke_sessions','Test revocation',null);
  assert result->>'affected'='1';
  insert into auth.sessions(id,user_id,created_at) values(gen_random_uuid(),target,now());
  assert public.owner_action(request_key,actor,target,'revoke_sessions','Test revocation',null)=result;
  assert exists(select from auth.sessions where user_id=target);
  assert not exists(select from auth.refresh_tokens where session_id=original_session);
  assert exists(select from auth.refresh_tokens where session_id=other_session and not revoked);
  insert into public.user_plans(user_id,plan_id,source,trial_started_at,trial_ends_at)
    values(target,'pro','trial',now()-interval '15 days',now()-interval '1 day')
    on conflict(user_id) do update set source='trial',plan_id='pro',trial_ends_at=excluded.trial_ends_at;
  assert public.effective_plan(target)='free';
  result := public.owner_action(trial_key,actor,target,'extend_trial','Test extension',expiry);
  assert (result->>'ok')::boolean and public.effective_plan(target)='pro';
  assert public.owner_action(trial_key,actor,target,'extend_trial','Test extension',expiry)=result;
  assert (public.owner_action(gen_random_uuid(),actor,target,'extend_trial','Active trial',expiry+interval '1 day')->>'ok')::boolean;
  update public.user_plans set source='provider' where user_id=target;
  assert not (public.owner_action(gen_random_uuid(),actor,target,'extend_trial','Paid account',expiry+interval '2 days')->>'ok')::boolean;
  assert (select count(*)=2 from public.owner_support_actions where request_id in (request_key,trial_key)) ;
end
$$;
rollback;
