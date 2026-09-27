-- =====================================================================
-- RLS isolation test: a second account can't see or touch the first
-- account's data. Run against STAGING (never production):
--   the Supabase MCP `execute_sql`, or psql -f supabase/tests/rls_isolation.sql
--
-- It creates two throwaway users (A, B) with rows of their own, then acts
-- as each one exactly as PostgREST does for a signed-in request: role
-- `authenticated` plus the JWT claims auth.uid() reads. Every check that
-- fails raises "RLS_ISOLATION FAILED: …". The block always ends by raising
-- "RLS_ISOLATION PASSED …", so the whole transaction rolls back and
-- nothing it created is left behind.
-- =====================================================================
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  f_shared uuid;      -- an approved catalog row
  f_a_pending uuid;   -- a row user A added (pending)
  n int;
  checks int := 0;
  ok boolean;

begin
  -- ---------------------------------------------------------- fixtures
  insert into auth.users (id, email, aud, role)
  values (a, 'rls-a-' || a || '@example.test', 'authenticated', 'authenticated'),
         (b, 'rls-b-' || b || '@example.test', 'authenticated', 'authenticated');

  insert into public.fragrances (name, tier, source, status, added_by)
  values ('RLS test shared ' || a, 'fresh', 'curated', 'approved', null)
  returning id into f_shared;
  insert into public.fragrances (name, tier, source, status, added_by)
  values ('RLS test A private ' || a, 'woody', 'custom', 'pending', a)
  returning id into f_a_pending;

  insert into public.batches (user_id, fragrance_id, fragrance_name, tier, concentration_pct,
                              oil_g, oil_ml, ethanol_g, ethanol_ml, total_g, total_ml)
  values (a, f_shared, 'A batch', 'fresh', 25, 23.75, 25, 60.75, 75, 84.5, 100),
         (b, f_shared, 'B batch', 'fresh', 20, 19, 20, 64.8, 80, 83.8, 100);
  insert into public.inventory (user_id, fragrance_id, stock_g) values (a, f_shared, 100), (b, f_shared, 50);
  insert into public.fragrance_notes (user_id, fragrance_id, notes) values (a, f_shared, 'A secret'), (b, f_shared, 'B note');

  -- ------------------------------------------------------ act as user B
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', b::text, true);
  perform set_config('role', 'authenticated', true);

  -- Reads: only B's own rows.
  select count(*) into n from public.batches where user_id = a;
  if n <> 0 then raise exception 'RLS_ISOLATION FAILED: B sees % of A''s batches', n; end if; checks := checks + 1;
  select count(*) into n from public.batches;
  if n <> 1 then raise exception 'RLS_ISOLATION FAILED: B sees % batches, expected 1', n; end if; checks := checks + 1;
  select count(*) into n from public.inventory where user_id = a;
  if n <> 0 then raise exception 'RLS_ISOLATION FAILED: B sees A''s inventory'; end if; checks := checks + 1;
  select count(*) into n from public.fragrance_notes where user_id = a;
  if n <> 0 then raise exception 'RLS_ISOLATION FAILED: B sees A''s notes'; end if; checks := checks + 1;
  select count(*) into n from public.fragrances where id = f_a_pending;
  if n <> 0 then raise exception 'RLS_ISOLATION FAILED: B sees A''s pending fragrance'; end if; checks := checks + 1;
  select count(*) into n from public.fragrances where id = f_shared;
  if n <> 1 then raise exception 'RLS_ISOLATION FAILED: B can''t read the shared catalog'; end if; checks := checks + 1;

  -- Updates and deletes on A's rows touch nothing.
  update public.batches set notes = 'tampered' where user_id = a; get diagnostics n = row_count;
  if n <> 0 then raise exception 'RLS_ISOLATION FAILED: B updated A''s batches'; end if; checks := checks + 1;
  delete from public.batches where user_id = a; get diagnostics n = row_count;
  if n <> 0 then raise exception 'RLS_ISOLATION FAILED: B deleted A''s batches'; end if; checks := checks + 1;
  update public.inventory set stock_g = 0 where user_id = a; get diagnostics n = row_count;
  if n <> 0 then raise exception 'RLS_ISOLATION FAILED: B changed A''s stock'; end if; checks := checks + 1;
  delete from public.fragrance_notes where user_id = a; get diagnostics n = row_count;
  if n <> 0 then raise exception 'RLS_ISOLATION FAILED: B deleted A''s notes'; end if; checks := checks + 1;
  update public.fragrances set tier = 'oriental' where id = f_shared; get diagnostics n = row_count;
  if n <> 0 then raise exception 'RLS_ISOLATION FAILED: B edited an approved catalog row'; end if; checks := checks + 1;
  update public.fragrances set tier = 'oriental' where id = f_a_pending; get diagnostics n = row_count;
  if n <> 0 then raise exception 'RLS_ISOLATION FAILED: B edited A''s pending fragrance'; end if; checks := checks + 1;

  -- Inserts pretending to be A are refused.
  ok := false;
  begin
    insert into public.batches (user_id, fragrance_name, tier, concentration_pct, oil_g, oil_ml, ethanol_g, ethanol_ml, total_g, total_ml)
    values (a, 'forged', 'fresh', 20, 1, 1, 1, 1, 2, 2);
  exception when insufficient_privilege then ok := true;
  end;
  if not ok then raise exception 'RLS_ISOLATION FAILED: B inserted a batch as A'; end if; checks := checks + 1;

  ok := false;
  begin
    insert into public.inventory (user_id, fragrance_id, stock_g) values (a, f_a_pending, 1);
  exception when insufficient_privilege or unique_violation then ok := true;
  end;
  if not ok then raise exception 'RLS_ISOLATION FAILED: B inserted inventory as A'; end if; checks := checks + 1;

  ok := false;
  begin
    insert into public.fragrances (name, tier, status, added_by) values ('forged approved ' || b, 'fresh', 'approved', b);
  exception when insufficient_privilege then ok := true;
  end;
  if not ok then raise exception 'RLS_ISOLATION FAILED: B added a pre-approved catalog row'; end if; checks := checks + 1;

  ok := false;
  begin
    insert into public.fragrances (name, tier, added_by) values ('forged owner ' || b, 'fresh', a);
  exception when insufficient_privilege then ok := true;
  end;
  if not ok then raise exception 'RLS_ISOLATION FAILED: B added a catalog row owned by A'; end if; checks := checks + 1;

  -- Deleting from the catalog is not a right users have at all.
  ok := false;
  begin
    delete from public.fragrances where id = f_shared;
  exception when insufficient_privilege then ok := true;
  end;
  if not ok then raise exception 'RLS_ISOLATION FAILED: B could delete from the catalog'; end if; checks := checks + 1;

  -- restock_inventory takes any user id: the browser may not call it.
  ok := false;
  begin
    perform public.restock_inventory(a, f_shared, 5);
  exception when insufficient_privilege then ok := true;
  end;
  if not ok then raise exception 'RLS_ISOLATION FAILED: B could call restock_inventory'; end if; checks := checks + 1;

  -- What B may do: add its own pending row, and reuse an existing name.
  insert into public.fragrances (name, tier) values ('RLS test B own ' || b, 'floral');
  select count(*) into n from public.fragrances where name = 'RLS test B own ' || b and added_by = b and status = 'pending';
  if n <> 1 then raise exception 'RLS_ISOLATION FAILED: B''s own row not added as pending'; end if; checks := checks + 1;
  select count(*) into n from public.ensure_fragrance('RLS test shared ' || a, 'fresh') e where e.id = f_shared;
  if n <> 1 then raise exception 'RLS_ISOLATION FAILED: ensure_fragrance did not reuse the existing row'; end if; checks := checks + 1;
  perform public.ensure_fragrance('RLS test B new ' || b, 'gourmand');
  select count(*) into n from public.fragrances where name = 'RLS test B new ' || b and added_by = b and status = 'pending';
  if n <> 1 then raise exception 'RLS_ISOLATION FAILED: ensure_fragrance did not add B''s own pending row'; end if; checks := checks + 1;
  select count(*) into n from public.add_fragrance_photo(f_shared, 'https://example.test/bottle.jpg');
  if n <> 1 then raise exception 'RLS_ISOLATION FAILED: add_fragrance_photo did not fill an empty photo'; end if; checks := checks + 1;
  select count(*) into n from public.add_fragrance_photo(f_shared, 'https://example.test/other.jpg');
  if n <> 0 then raise exception 'RLS_ISOLATION FAILED: add_fragrance_photo replaced an existing photo'; end if; checks := checks + 1;
  select count(*) into n from public.add_fragrance_photo(f_a_pending, 'https://example.test/a.jpg');
  if n <> 0 then raise exception 'RLS_ISOLATION FAILED: B added a photo to A''s private row'; end if; checks := checks + 1;

  -- ------------------------------------------------------ act as user A
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', a::text, true);
  select count(*) into n from public.batches;
  if n <> 1 then raise exception 'RLS_ISOLATION FAILED: A sees % batches, expected its own 1', n; end if; checks := checks + 1;
  select count(*) into n from public.batches where notes = 'tampered';
  if n <> 0 then raise exception 'RLS_ISOLATION FAILED: A''s batch was changed by B'; end if; checks := checks + 1;
  select stock_g::int into n from public.inventory where fragrance_id = f_shared;
  if n <> 100 then raise exception 'RLS_ISOLATION FAILED: A''s stock is %, expected 100', n; end if; checks := checks + 1;
  select count(*) into n from public.fragrances where id = f_a_pending;
  if n <> 1 then raise exception 'RLS_ISOLATION FAILED: A can''t see its own pending row'; end if; checks := checks + 1;

  -- ------------------------------------------------------------ as anon
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('role', 'anon', true);
  ok := false;
  begin perform 1 from public.batches limit 1;
  exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'RLS_ISOLATION FAILED: anon can query batches'; end if; checks := checks + 1;
  ok := false;
  begin perform 1 from public.fragrances limit 1;
  exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'RLS_ISOLATION FAILED: anon can query the catalog table directly'; end if; checks := checks + 1;

  raise exception 'RLS_ISOLATION PASSED: % checks (rolled back, nothing kept)', checks;
end
$$;
