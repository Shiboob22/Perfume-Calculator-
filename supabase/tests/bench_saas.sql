-- =====================================================================
-- 0031 checks (Bench SaaS, Phase 2): plan limits enforced by the database,
-- recipe_ingredients isolation, batch numbers, note tags, the trial.
-- Since 0034 Free has no formula limit (the 50-per-user guard applies to
-- every plan, as before 0031): run after 0034.
-- Run against STAGING only (Supabase MCP execute_sql, or psql -f).
-- Same shape as rls_isolation.sql: throwaway users, acting as PostgREST
-- does for a signed-in request; any failure raises "BENCH_SAAS FAILED: …";
-- the block always ends by raising "BENCH_SAAS PASSED …" so everything it
-- made rolls back.
-- =====================================================================
do $$
declare
  free_u uuid := gen_random_uuid();   -- Free
  pro_u uuid := gen_random_uuid();    -- Pro (manual)
  old_u uuid := gen_random_uuid();    -- Free with 6 recipes from before 0031
  trial_u uuid := gen_random_uuid();  -- starts a trial
  ended_u uuid := gen_random_uuid();  -- a trial that has ended
  rv_free uuid;
  rv_pro uuid;
  b1 uuid;
  n int;
  i int;
  ok boolean;
  st text;
  ends timestamptz;
  checks int := 0;

begin
  insert into auth.users (id, email, aud, role)
  select u, 'bench-' || u || '@example.test', 'authenticated', 'authenticated'
    from unnest(array[free_u, pro_u, old_u, trial_u, ended_u]) u;
  insert into public.user_plans (user_id, plan_id) values (pro_u, 'pro');
  insert into public.user_plans (user_id, plan_id, source, trial_started_at, trial_ends_at)
  values (ended_u, 'pro', 'trial', now() - interval '15 days', now() - interval '1 day');

  -- Six recipes made before the cap (as the service role, trigger off for
  -- the fixture only): they all stay.
  alter table public.recipes disable trigger recipes_before_insert;
  insert into public.recipes (user_id, name) select old_u, 'Old ' || g from generate_series(1, 6) g;
  alter table public.recipes enable trigger recipes_before_insert;

  -- ------------------------------------------------ effective plan / trial
  if public.effective_plan(free_u) <> 'free' then raise exception 'BENCH_SAAS FAILED: no plan row is not Free'; end if; checks := checks + 1;
  if public.effective_plan(pro_u) <> 'pro' then raise exception 'BENCH_SAAS FAILED: manual Pro is not Pro'; end if; checks := checks + 1;
  if public.effective_plan(ended_u) <> 'free' then raise exception 'BENCH_SAAS FAILED: an ended trial is still Pro'; end if; checks := checks + 1;
  if public.plan_limit(free_u, 'formula_cap') is not null or public.plan_limit(free_u, 'ingredient_cap') <> 3
     or public.plan_limit(free_u, 'journal_window') <> 3 then
    raise exception 'BENCH_SAAS FAILED: Free limits are not none / 3 / 3 (0034)';
  end if; checks := checks + 1;
  if public.plan_limit(pro_u, 'formula_cap') is not null then raise exception 'BENCH_SAAS FAILED: Pro has a formula cap'; end if; checks := checks + 1;

  select status, ends_at into st, ends from public.start_pro_trial(trial_u);
  if st <> 'started' or ends < now() + interval '13 days 23 hours' or ends > now() + interval '14 days 1 minute' then
    raise exception 'BENCH_SAAS FAILED: trial did not start for 14 days (%, %)', st, ends;
  end if; checks := checks + 1;
  if public.effective_plan(trial_u) <> 'pro' then raise exception 'BENCH_SAAS FAILED: a running trial is not Pro'; end if; checks := checks + 1;
  select status into st from public.start_pro_trial(trial_u);
  if st <> 'trial_used' then raise exception 'BENCH_SAAS FAILED: a second trial was allowed (%)', st; end if; checks := checks + 1;
  select status into st from public.start_pro_trial(ended_u);
  if st <> 'trial_used' then raise exception 'BENCH_SAAS FAILED: an ended trial could restart (%)', st; end if; checks := checks + 1;
  select status into st from public.start_pro_trial(pro_u);
  if st <> 'already_pro' then raise exception 'BENCH_SAAS FAILED: a Pro user got a trial (%)', st; end if; checks := checks + 1;
  select count(*) into n from public.user_plans where user_id = pro_u and source = 'manual' and trial_started_at is null;
  if n <> 1 then raise exception 'BENCH_SAAS FAILED: the trial touched a manual Pro plan'; end if; checks := checks + 1;

  -- ------------------------------------------------------ batch numbers
  insert into public.batches (user_id, fragrance_name, tier, concentration_pct, oil_g, oil_ml, ethanol_g, ethanol_ml, total_g, total_ml)
  values (free_u, 'One', 'fresh', 20, 9.5, 10, 32.4, 40, 41.9, 50) returning id into b1;
  insert into public.batches (user_id, fragrance_name, tier, concentration_pct, oil_g, oil_ml, ethanol_g, ethanol_ml, total_g, total_ml)
  values (free_u, 'Two', 'fresh', 20, 9.5, 10, 32.4, 40, 41.9, 50),
         (pro_u, 'Pro one', 'fresh', 20, 9.5, 10, 32.4, 40, 41.9, 50);
  select count(*) into n from public.batches where user_id = free_u and batch_no in (1, 2);
  if n <> 2 then raise exception 'BENCH_SAAS FAILED: new batches were not numbered 1 and 2'; end if; checks := checks + 1;
  select batch_no into n from public.batches where user_id = pro_u;
  if n <> 1 then raise exception 'BENCH_SAAS FAILED: numbers are not per user (%)', n; end if; checks := checks + 1;
  ok := false;
  begin
    insert into public.batches (user_id, batch_no, fragrance_name, tier, concentration_pct, oil_g, oil_ml, ethanol_g, ethanol_ml, total_g, total_ml)
    values (free_u, 1, 'Dup', 'fresh', 20, 9.5, 10, 32.4, 40, 41.9, 50);
  exception when unique_violation then ok := true; end;
  if not ok then raise exception 'BENCH_SAAS FAILED: two batches share a number'; end if; checks := checks + 1;
  select remind into ok from public.batches where id = b1;
  if ok then raise exception 'BENCH_SAAS FAILED: remind defaults on'; end if; checks := checks + 1;

  -- -------------------------------------------------------- note tags
  insert into public.batch_checkins (id, batch_id, user_id, day, scheduled_day, note, tags)
  values (gen_random_uuid(), b1, free_u, 0, 0, 'Loud.', '{harsh,sharp}');
  ok := false;
  begin
    insert into public.batch_checkins (id, batch_id, user_id, day, note, tags) values (gen_random_uuid(), b1, free_u, 1, 'x', '{smoky}');
  exception when check_violation then ok := true; end;
  if not ok then raise exception 'BENCH_SAAS FAILED: an unknown tag was stored'; end if; checks := checks + 1;

  -- ------------------------------------------------- act as the Free user
  perform set_config('request.jwt.claims', json_build_object('sub', free_u, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', free_u::text, true);
  perform set_config('role', 'authenticated', true);

  -- Free saves as many formulas as before 0031 (0034): up to the 50 guard.
  for i in 1..50 loop
    insert into public.recipes (name) values ('Free ' || i);
  end loop;
  checks := checks + 1;
  ok := false;
  begin insert into public.recipes (name) values ('Free 51');
  exception when sqlstate '54000' then ok := true; end;
  if not ok then raise exception 'BENCH_SAAS FAILED: the 50-formula guard let a 51st in'; end if; checks := checks + 1;

  insert into public.recipe_versions (recipe_id, amount, unit, concentration_pct)
  select id, 50, 'ml', 20 from public.recipes where name = 'Free 1' returning id into rv_free;
  insert into public.recipe_ingredients (version_id, position, name, type, pct)
  values (rv_free, 0, 'Bergamot', 'eo', 40), (rv_free, 1, 'Hedione', 'aroma', 40), (rv_free, 2, 'Ambroxan', 'aroma', 20);
  checks := checks + 1;
  ok := false;
  begin insert into public.recipe_ingredients (version_id, position, name, pct) values (rv_free, 3, 'Fourth', 5);
  exception when sqlstate '54000' then ok := true; end;
  if not ok then raise exception 'BENCH_SAAS FAILED: Free added a fourth material'; end if; checks := checks + 1;
  ok := false;
  begin update public.recipe_ingredients set pct = 50 where version_id = rv_free;
  exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'BENCH_SAAS FAILED: an ingredient was edited in place'; end if; checks := checks + 1;
  ok := false;
  begin perform * from public.start_pro_trial(free_u);
  exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'BENCH_SAAS FAILED: a user can start a trial without the API'; end if; checks := checks + 1;
  -- A user can't lift their own cap.
  ok := false;
  begin update public.plans set ingredient_cap = null where id = 'free';
  exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'BENCH_SAAS FAILED: a user changed the Free plan'; end if; checks := checks + 1;

  -- ------------------------------------------------- act as the Pro user
  perform set_config('request.jwt.claims', json_build_object('sub', pro_u, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', pro_u::text, true);

  select count(*) into n from public.recipe_ingredients;
  if n <> 0 then raise exception 'BENCH_SAAS FAILED: Pro user sees % of another user''s ingredients', n; end if; checks := checks + 1;
  ok := false;
  begin insert into public.recipe_ingredients (version_id, user_id, position, name, pct) values (rv_free, free_u, 9, 'Forged', 1);
  exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'BENCH_SAAS FAILED: an ingredient was added to another user''s version'; end if; checks := checks + 1;
  ok := false;
  begin insert into public.recipe_ingredients (version_id, position, name, pct) values (rv_free, 9, 'Forged', 1);
  exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'BENCH_SAAS FAILED: an ingredient was attached to another user''s version'; end if; checks := checks + 1;

  for i in 1..6 loop
    insert into public.recipes (name) values ('Pro ' || i);
  end loop;
  checks := checks + 1;
  insert into public.recipe_versions (recipe_id, amount, unit, concentration_pct)
  select id, 50, 'ml', 20 from public.recipes where name = 'Pro 1' returning id into rv_pro;
  insert into public.recipe_ingredients (version_id, position, name, pct) select rv_pro, g, 'M' || g, 10 from generate_series(0, 4) g;
  checks := checks + 1;

  -- ------------------------------------- the user with six old recipes
  perform set_config('request.jwt.claims', json_build_object('sub', old_u, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', old_u::text, true);
  select count(*) into n from public.recipes;
  if n <> 6 then raise exception 'BENCH_SAAS FAILED: old recipes over the cap were lost (%)', n; end if; checks := checks + 1;
  ok := true;
  begin insert into public.recipes (name) values ('Seventh');
  exception when sqlstate '54000' then ok := false; end;
  if not ok then raise exception 'BENCH_SAAS FAILED: a Free user with six recipes could not save a seventh (0034)'; end if; checks := checks + 1;

  -- ---------------------------------------------- the ended trial is Free
  perform set_config('request.jwt.claims', json_build_object('sub', ended_u, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ended_u::text, true);
  insert into public.recipes (name) values ('Ended 1');
  insert into public.recipe_versions (recipe_id, amount, unit, concentration_pct)
  select id, 50, 'ml', 20 from public.recipes where name = 'Ended 1' returning id into rv_pro;
  insert into public.recipe_ingredients (version_id, position, name, pct) select rv_pro, g, 'E' || g, 10 from generate_series(0, 2) g;
  ok := false;
  begin insert into public.recipe_ingredients (version_id, position, name, pct) values (rv_pro, 3, 'E3', 10);
  exception when sqlstate '54000' then ok := true; end;
  if not ok then raise exception 'BENCH_SAAS FAILED: an ended trial kept Pro limits'; end if; checks := checks + 1;

  -- -------------------------------------------------------------- anon
  perform set_config('role', 'anon', true);
  ok := false;
  begin perform 1 from public.recipe_ingredients limit 1;
  exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'BENCH_SAAS FAILED: anon can read recipe_ingredients'; end if; checks := checks + 1;

  raise exception 'BENCH_SAAS PASSED % checks', checks;
end
$$;
