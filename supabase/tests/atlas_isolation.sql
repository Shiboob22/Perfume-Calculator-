-- =====================================================================
-- Atlas test (migration 0025). Run against STAGING (never production), like
-- rls_isolation.sql: the Supabase MCP `execute_sql`, or psql -f. It creates
-- throwaway users, acts as each one through the JWT claims PostgREST uses,
-- and always ends by raising "ATLAS PASSED …", so everything rolls back.
-- =====================================================================
do $$
declare
  a uuid := gen_random_uuid();      -- contributes fragrances
  b uuid := gen_random_uuid();      -- another signed-in user, not opted in
  adm uuid := gen_random_uuid();    -- an admin
  u uuid; bt uuid;
  extra uuid[] := array[]::uuid[];  -- ten opted-in owners of f_shared
  f_shared uuid; f_new uuid; f_rej uuid;
  nm text := 'ATLAS TEST ' || substr(md5(random()::text), 1, 8);
  n int; n2 int; ok boolean; checks int := 0; j jsonb; st text;
begin
  -- ---------------------------------------------------------- fixtures
  insert into auth.users (id, email, aud, role)
  values (a, 'atlas-a-' || a || '@example.test', 'authenticated', 'authenticated'),
         (b, 'atlas-b-' || b || '@example.test', 'authenticated', 'authenticated'),
         (adm, 'atlas-adm-' || adm || '@example.test', 'authenticated', 'authenticated');
  insert into public.admins (user_id) values (adm);
  insert into public.fragrances (name, tier, source, status, brand, year, accords, top_notes)
  values ('zqatlas shared ' || substr(md5(a::text), 1, 8), 'fresh', 'curated', 'approved', 'AtlasHouse', 2001, array['Citrus', 'Woody'], array['Bergamot'])
  returning id into f_shared;
  for i in 1..10 loop
    u := gen_random_uuid(); extra := extra || u;
    insert into auth.users (id, email, aud, role) values (u, 'atlas-o' || i || '-' || u || '@example.test', 'authenticated', 'authenticated');
    insert into public.profiles (user_id, wear_stats_opt_in) values (u, true);
    insert into public.wardrobe_bottles (user_id, name, fragrance_id, status) values (u, 'bottle', f_shared, 'owned') returning id into bt;
    insert into public.wear_log (user_id, bottle_id, occasion) values (u, bt, 'date');
  end loop;
  -- b owns it too but did not opt in: must not be counted.
  insert into public.profiles (user_id) values (b);
  insert into public.wardrobe_bottles (user_id, name, fragrance_id, status) values (b, 'bottle', f_shared, 'owned') returning id into bt;
  insert into public.wear_log (user_id, bottle_id, occasion) values (b, bt, 'date');

  -- ------------------------------------------ community counts (k = 10)
  j := public.atlas_wear_stats(f_shared);
  if (j->>'shown')::boolean is not true or (j->>'owners')::int <> 10 or (j->>'wearers')::int <> 10 or j->'occasions' <> '["date"]'::jsonb or j ? 'wearings' then
    raise exception 'ATLAS FAILED: community counts wrong: %', j;
  end if; checks := checks + 1;
  update public.profiles set wear_stats_opt_in = false where user_id = extra[1];
  j := public.atlas_wear_stats(f_shared);
  if (j->>'shown')::boolean is not false or j ? 'owners' then raise exception 'ATLAS FAILED: counts shown with only 9 opted-in owners: %', j; end if; checks := checks + 1;
  update public.profiles set wear_stats_opt_in = true where user_id = extra[1];
  update public.fragrances set status = 'pending' where id = f_shared;
  j := public.atlas_wear_stats(f_shared);
  if (j->>'shown')::boolean is not false then raise exception 'ATLAS FAILED: counts shown for a fragrance that is not approved'; end if; checks := checks + 1;
  update public.fragrances set status = 'approved' where id = f_shared;
  select column_default into st from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'wear_stats_opt_in';
  if st is distinct from 'false' then raise exception 'ATLAS FAILED: opt-in must default to false, is %', st; end if; checks := checks + 1;

  -- ------------------------------------------------------ act as user A
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', a::text, true);
  perform set_config('role', 'authenticated', true);

  f_new := public.atlas_submit(jsonb_build_object('name', nm, 'brand', 'AtlasHouse', 'tier', 'woody', 'year', 2020, 'gender', 'unisex',
    'top_notes', (select jsonb_agg('n' || i) from generate_series(1, 20) i), 'accords', jsonb_build_array('Woody', '  ', 'Amber')));
  select status, cardinality(top_notes), cardinality(accords) into st, n, n2 from public.fragrances where id = f_new;
  if st <> 'pending' or n <> 15 or n2 <> 2 then raise exception 'ATLAS FAILED: submit stored status %, % top notes, % accords', st, n, n2; end if; checks := checks + 1;
  select count(*) into n from public.fragrances where id = f_new and added_by = a and source = 'community';
  if n <> 1 then raise exception 'ATLAS FAILED: submit did not record its author'; end if; checks := checks + 1;

  foreach st in array array['{"name":"","tier":"fresh"}', '{"name":"x","tier":"citrus"}', '{"name":"x","tier":"fresh","year":1500}', '{"name":"x","tier":"fresh","gender":"robot"}', '{"tier":"fresh"}'] loop
    ok := false;
    begin perform public.atlas_submit(st::jsonb);
    exception when invalid_parameter_value then ok := true; end;
    if not ok then raise exception 'ATLAS FAILED: atlas_submit accepted %', st; end if; checks := checks + 1;
  end loop;
  ok := false;
  begin perform public.atlas_submit(jsonb_build_object('name', nm, 'tier', 'fresh'));
  exception when unique_violation then ok := true; end;
  if not ok then raise exception 'ATLAS FAILED: a duplicate name was accepted'; end if; checks := checks + 1;

  if exists (select 1 from public.atlas_search(nm) where id = f_new) then raise exception 'ATLAS FAILED: search returned a pending fragrance'; end if; checks := checks + 1;
  if (select id from public.atlas_search('zqatlas shared ' || substr(md5(a::text), 1, 8), p_limit => 1)) is distinct from f_shared then raise exception 'ATLAS FAILED: search did not put the approved test row first'; end if; checks := checks + 1;
  select count(*) into n from public.atlas_search(p_house => 'atlashouse', p_year_from => 2000, p_year_to => 2005, p_note => 'bergamot', p_accord => 'citrus', p_family => (select tier from public.fragrances where id = f_shared));  -- the 0020 trigger derives tier from accords
  if n <> 1 then raise exception 'ATLAS FAILED: the filters found %, expected 1', n; end if; checks := checks + 1;

  -- 100 pending at most (a already has 1).
  for i in 1..99 loop perform public.atlas_submit(jsonb_build_object('name', nm || ' bulk ' || i, 'tier', 'floral')); end loop;
  f_rej := (select id from public.fragrances where name = nm || ' bulk 1');
  ok := false;
  begin perform public.atlas_submit(jsonb_build_object('name', nm || ' one too many', 'tier', 'floral'));
  exception when program_limit_exceeded then ok := true; end;
  if not ok then raise exception 'ATLAS FAILED: a 101st pending contribution was accepted'; end if; checks := checks + 1;

  -- A is not an admin.
  ok := false; begin perform public.atlas_queue(); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'ATLAS FAILED: a user read the moderation queue'; end if; checks := checks + 1;
  ok := false; begin perform public.atlas_review(f_new, true); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'ATLAS FAILED: a user approved their own contribution'; end if; checks := checks + 1;
  ok := false; begin perform public.atlas_refresh(); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'ATLAS FAILED: a user refreshed the Atlas views'; end if; checks := checks + 1;
  ok := false; begin insert into public.atlas_terms (kind, key, ar) values ('note', 'bergamot', 'برغموت'); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'ATLAS FAILED: a user wrote an Arabic term'; end if; checks := checks + 1;
  ok := false; begin insert into public.atlas_aliases (fragrance_id, lang, alias) values (f_shared, 'ar', 'اسم'); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'ATLAS FAILED: a user wrote an alias'; end if; checks := checks + 1;
  select count(*) into n from public.atlas_reviews;
  if n <> 0 then raise exception 'ATLAS FAILED: a user sees the review log'; end if; checks := checks + 1;

  -- ------------------------------------------------------ act as user B
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', b::text, true);
  select count(*) into n from public.fragrances where id = f_new;
  if n <> 0 then raise exception 'ATLAS FAILED: B sees A''s pending contribution'; end if; checks := checks + 1;
  if exists (select 1 from public.atlas_search(nm) where id = f_new) then raise exception 'ATLAS FAILED: B finds A''s pending contribution by search'; end if; checks := checks + 1;

  -- ------------------------------------------------------- act as admin
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', adm::text, true);
  select count(*) into n from public.atlas_queue() where id = f_new;
  if n <> 1 then raise exception 'ATLAS FAILED: the admin does not see the contribution in the queue'; end if; checks := checks + 1;
  perform public.atlas_review(f_new, true);
  perform public.atlas_review(f_rej, false);
  select status into st from public.fragrances where id = f_new;
  if st <> 'approved' then raise exception 'ATLAS FAILED: approve left status %', st; end if; checks := checks + 1;
  select status into st from public.fragrances where id = f_rej;
  if st <> 'rejected' then raise exception 'ATLAS FAILED: reject left status %', st; end if; checks := checks + 1;
  ok := false; begin perform public.atlas_review(f_new, false); exception when no_data_found then ok := true; end;
  if not ok then raise exception 'ATLAS FAILED: an approved row could be reviewed again'; end if; checks := checks + 1;
  select count(*) into n from public.atlas_reviews where fragrance_id in (f_new, f_rej);
  if n <> 2 then raise exception 'ATLAS FAILED: the review log has % rows, expected 2', n; end if; checks := checks + 1;
  insert into public.atlas_aliases (fragrance_id, lang, alias) values (f_new, 'ar', 'اختبار الأطلس');
  insert into public.atlas_terms (kind, key, ar) values ('note', 'bergamot', 'برغموت');
  perform public.atlas_refresh();
  select fragrances into n from public.atlas_houses where key = 'atlashouse';
  if n <> 2 then raise exception 'ATLAS FAILED: the house view counts % fragrances, expected 2 (the approved ones)', n; end if; checks := checks + 1;

  -- ------------------------------------------------- B and A, afterwards
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', b::text, true);
  if not exists (select 1 from public.atlas_search(nm) where id = f_new) then raise exception 'ATLAS FAILED: the approved contribution is not found'; end if; checks := checks + 1;
  if (select id from public.atlas_search('اختبار', p_limit => 1)) is distinct from f_new then raise exception 'ATLAS FAILED: the Arabic alias is not searchable'; end if; checks := checks + 1;
  select count(*) into n from public.atlas_terms where kind = 'note' and key = 'bergamot';
  if n <> 1 then raise exception 'ATLAS FAILED: a signed-in user cannot read the Arabic terms'; end if; checks := checks + 1;
  select count(*) into n from public.fragrances where id = f_rej;
  if n <> 0 then raise exception 'ATLAS FAILED: B sees a rejected contribution'; end if; checks := checks + 1;
  select count(*) into n from public.atlas_houses where key = 'atlashouse';
  if n <> 1 then raise exception 'ATLAS FAILED: a signed-in user cannot read the house view'; end if; checks := checks + 1;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', a::text, true);
  select count(*) into n from public.fragrances where id = f_rej;
  if n <> 1 then raise exception 'ATLAS FAILED: the author cannot see their own rejected contribution'; end if; checks := checks + 1;

  -- ------------------------------------------------------------ as anon
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('role', 'anon', true);
  if has_function_privilege('anon', 'public.atlas_search(text,text,text,text,text,text,int,int,int,int)', 'execute')
     or has_function_privilege('anon', 'public.atlas_submit(jsonb)', 'execute')
     or has_function_privilege('anon', 'public.atlas_queue()', 'execute')
     or has_function_privilege('anon', 'public.atlas_review(uuid,boolean)', 'execute')
     or has_function_privilege('anon', 'public.atlas_refresh()', 'execute')
     or has_function_privilege('anon', 'public.atlas_wear_stats(uuid)', 'execute') then
    raise exception 'ATLAS FAILED: anon can run an Atlas function';
  end if; checks := checks + 1;
  if has_table_privilege('anon', 'public.atlas_houses', 'select') or has_table_privilege('anon', 'public.atlas_notes', 'select')
     or has_table_privilege('anon', 'public.atlas_accords', 'select') or has_table_privilege('anon', 'public.atlas_perfumers', 'select')
     or has_table_privilege('anon', 'public.atlas_terms', 'select') or has_table_privilege('anon', 'public.atlas_aliases', 'select')
     or has_table_privilege('anon', 'public.atlas_reviews', 'select') then
    raise exception 'ATLAS FAILED: anon can read an Atlas table';
  end if; checks := checks + 1;

  raise exception 'ATLAS PASSED: % checks (rolled back, nothing kept)', checks;
end
$$;
