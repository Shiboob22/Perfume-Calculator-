-- =====================================================================
-- Salon test (migrations 0027, 0028). Run against STAGING (never production), like
-- atlas_isolation.sql: the Supabase MCP `execute_sql`, or psql -f. It creates
-- throwaway users, acts as each one through the JWT claims PostgREST uses,
-- and always ends by raising "SALON PASSED …", so everything rolls back.
-- Not covered here: the 300 likes/day, 500 follows and 20 reports/day caps
-- (same trigger shape as the 10 posts/day cap, which is).
-- =====================================================================
create or replace function pg_temp.act(u uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', u::text, true);
  perform set_config('role', 'authenticated', true);
end $f$;

do $$
declare
  a uuid := gen_random_uuid();     -- author, public profile
  b uuid := gen_random_uuid();     -- another signed-in user
  c uuid := gen_random_uuid();     -- brand-new account
  adm uuid := gen_random_uuid();   -- an editor
  r uuid[] := array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid()];  -- week-old reporters
  nw uuid[] := array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid()]; -- new-account reporters
  u uuid; f uuid; p1 uuid; p2 uuid; rep uuid;
  ha text := 'zqa_' || substr(md5(random()::text), 1, 8);
  hb text := 'zqb_' || substr(md5(random()::text), 1, 8);
  n int; checks int := 0; j jsonb; st text; ok boolean;
  snap jsonb := '{"amount": 100, "unit": "ml", "concentration_pct": 25, "oil_density": 0.95}'::jsonb;
begin
  -- ---------------------------------------------------------- fixtures
  insert into auth.users (id, email, aud, role)
  select x, 'salon-' || x || '@example.test', 'authenticated', 'authenticated' from unnest(array[a, b, c, adm] || r || nw) x;
  update auth.users set created_at = now() - interval '30 days' where id = any(array[a, b, adm] || r);
  insert into public.admins (user_id) values (adm);
  insert into public.fragrances (name, tier, source, status) values ('zqsalon ' || substr(md5(a::text), 1, 8), 'fresh', 'curated', 'approved') returning id into f;

  -- --------------------------------------- A: profile private by default
  perform pg_temp.act(a);
  insert into public.salon_profiles (handle, display_name, bio) values (ha, 'Ada', 'I blend.');
  select is_public into ok from public.salon_profiles where user_id = a;
  if ok is not false then raise exception 'SALON FAILED: a new profile must be private'; end if; checks := checks + 1;
  begin
    insert into public.salon_posts (kind, title, snapshot) values ('recipe', 'x', snap);
    raise exception 'SALON FAILED: posted without a public profile';
  exception when sqlstate '42501' then null; end; checks := checks + 1;
  begin
    insert into public.salon_profiles (user_id, handle) values (b, 'zqx_' || substr(md5(random()::text), 1, 8));
    raise exception 'SALON FAILED: created a profile for someone else';
  exception when sqlstate '42501' then null; end; checks := checks + 1;
  begin
    insert into public.salon_suspensions (user_id) values (a);
    raise exception 'SALON FAILED: a user can write the suspensions table';
  exception when sqlstate '42501' then null; end; checks := checks + 1;
  begin
    insert into public.salon_profiles (handle) values ('Bad Handle!');
    raise exception 'SALON FAILED: bad handle accepted';
  exception when sqlstate '23505' or sqlstate '23514' then null; end; checks := checks + 1;
  begin
    update public.salon_profiles set bio = 'visit www.example.com' where user_id = a;
    raise exception 'SALON FAILED: a link in a bio';
  exception when sqlstate '23514' then null; end; checks := checks + 1;
  update public.salon_profiles set is_public = true where user_id = a;

  -- ------------------------------------------------------------- posting
  insert into public.salon_posts (kind, title, body, family, snapshot) values ('recipe', 'Oud Nights', 'My weekend blend.', 'woody', snap) returning id into p1;
  insert into public.salon_posts (kind, title, body, fragrance_id, rating) values ('review', 'Fresh and clean', 'Lasts all day.', f, 5) returning id into p2;
  begin insert into public.salon_posts (kind, title, fragrance_id, rating) values ('review', 'again', f, 4); raise exception 'SALON FAILED: two reviews of one fragrance';
  exception when sqlstate '23505' then null; end; checks := checks + 1;
  begin insert into public.salon_posts (kind, title, body, snapshot) values ('recipe', 'Buy now', 'see https://spam.example', snap); raise exception 'SALON FAILED: a link in a post';
  exception when sqlstate '23514' then null; end; checks := checks + 1;
  begin insert into public.salon_posts (kind, title, snapshot) values ('recipe', 'Extra key', snap || '{"cost": 12}'::jsonb); raise exception 'SALON FAILED: private field in a recipe snapshot';
  exception when sqlstate '22023' then null; end; checks := checks + 1;
  begin insert into public.salon_posts (kind, title, snapshot) values ('recipe', 'Bad density', '{"amount": 100, "unit": "ml", "concentration_pct": 25, "oil_density": 9}'::jsonb); raise exception 'SALON FAILED: absurd density';
  exception when sqlstate '22023' then null; end; checks := checks + 1;
  begin insert into public.salon_posts (kind, title, snapshot, rating) values ('recipe', 'Rated recipe', snap, 3); raise exception 'SALON FAILED: a recipe with a rating';
  exception when sqlstate '23514' then null; end; checks := checks + 1;
  begin insert into public.salon_posts (kind, title, fragrance_id, rating, status) values ('review', 'Self-published', gen_random_uuid(), 3, 'published'); raise exception 'SALON FAILED: a review of an unknown fragrance';
  exception when sqlstate '22023' or sqlstate '23503' or sqlstate '42501' then null; end; checks := checks + 1;
  begin update public.salon_posts set status = 'hidden' where id = p1; raise exception 'SALON FAILED: a user can set a post status';
  exception when sqlstate '42501' then null; end; checks := checks + 1;
  update public.salon_posts set body = 'Edited.' where id = p1;
  -- 10 a day: two done, eight more fine, the eleventh refused.
  for i in 1..8 loop insert into public.salon_posts (kind, title, snapshot) values ('recipe', 'Bulk ' || i, snap); end loop;
  begin insert into public.salon_posts (kind, title, snapshot) values ('recipe', 'Bulk 9', snap); raise exception 'SALON FAILED: more than 10 posts in a day';
  exception when sqlstate '54000' then null; end; checks := checks + 1;
  perform set_config('role', 'none', true);
  delete from public.salon_posts where user_id = a and title like 'Bulk %';

  -- ---------------------------------------------- C: a brand-new account
  perform pg_temp.act(c);
  insert into public.salon_profiles (handle, is_public) values ('zqc_' || substr(md5(random()::text), 1, 8), true);
  begin insert into public.salon_posts (kind, title, snapshot) values ('recipe', 'Too new', snap); raise exception 'SALON FAILED: a day-old account posted';
  exception when sqlstate '42501' then null; end; checks := checks + 1;

  -- ------------------------------------- B: reads, likes, follows
  perform pg_temp.act(b);
  insert into public.salon_profiles (handle, is_public) values (hb, true);
  select count(*) into n from public.salon_posts;
  if n <> 0 then raise exception 'SALON FAILED: a table read shows someone else''s posts (%)', n; end if; checks := checks + 1;
  select count(*) into n from public.salon_profiles where user_id = a;
  if n <> 0 then raise exception 'SALON FAILED: a table read shows someone else''s profile'; end if; checks := checks + 1;
  select count(*) into n from public.salon_feed();
  if n <> 2 then raise exception 'SALON FAILED: the feed shows % of a''s 2 posts', n; end if; checks := checks + 1;
  select count(*) into n from public.salon_feed('review');
  if n <> 1 then raise exception 'SALON FAILED: the kind filter'; end if; checks := checks + 1;
  update public.salon_posts set title = 'hijacked' where id = p1;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'SALON FAILED: edited someone else''s post'; end if; checks := checks + 1;
  delete from public.salon_posts where id = p1;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'SALON FAILED: deleted someone else''s post'; end if; checks := checks + 1;
  insert into public.salon_likes (post_id) values (p1);
  begin insert into public.salon_likes (post_id) values (p1); raise exception 'SALON FAILED: liked twice';
  exception when sqlstate '23505' then null; end; checks := checks + 1;
  select likes::int, liked into n, ok from public.salon_feed() where id = p1;
  if n <> 1 or ok is not true then raise exception 'SALON FAILED: like count % / liked %', n, ok; end if; checks := checks + 1;
  select count(*) into n from public.salon_likes;
  if n <> 1 then raise exception 'SALON FAILED: a user can read other people''s likes'; end if; checks := checks + 1;
  insert into public.salon_follows (followee_id) values (a);
  begin insert into public.salon_follows (followee_id) values (b); raise exception 'SALON FAILED: followed self';
  exception when sqlstate '23514' or sqlstate '42501' then null; end; checks := checks + 1;
  j := public.salon_profile(ha);
  if (j->>'followers')::int <> 1 or (j->>'i_follow')::boolean is not true or (j->>'posts')::int <> 2 or j ? 'email' or (j->>'mine')::boolean then
    raise exception 'SALON FAILED: profile counts wrong: %', j;
  end if; checks := checks + 1;
  select count(*) into n from public.salon_feed(p_following => true);
  if n <> 2 then raise exception 'SALON FAILED: following feed'; end if; checks := checks + 1;
  select count(*) into n from public.salon_feed(p_handle => ha);
  if n <> 2 then raise exception 'SALON FAILED: handle filter'; end if; checks := checks + 1;

  -- ------------------------------------- A goes private: everything hides
  perform pg_temp.act(a);
  update public.salon_profiles set is_public = false where user_id = a;
  perform pg_temp.act(b);
  select count(*) into n from public.salon_feed();
  if n <> 0 then raise exception 'SALON FAILED: posts stay visible after the profile goes private'; end if; checks := checks + 1;
  if public.salon_profile(ha) is not null then raise exception 'SALON FAILED: a private profile is readable'; end if; checks := checks + 1;
  begin insert into public.salon_likes (user_id, post_id) values (b, p2); raise exception 'SALON FAILED: liked a post of a private profile';
  exception when sqlstate '42501' then null; end; checks := checks + 1;
  perform pg_temp.act(a);
  select count(*) into n from public.salon_feed();
  if n <> 2 then raise exception 'SALON FAILED: the author cannot see their own posts while private'; end if; checks := checks + 1;
  update public.salon_profiles set is_public = true where user_id = a;

  -- ------------------------------------------------------------ reports
  perform pg_temp.act(a);
  begin insert into public.salon_reports (post_id, reason) values (p1, 'spam'); raise exception 'SALON FAILED: reported own post';
  exception when sqlstate '23514' then null; end; checks := checks + 1;
  foreach u in array r loop
    perform pg_temp.act(u);
    insert into public.salon_reports (post_id, reason, note) values (p1, 'spam', 'selling');
    if u = r[1] then
      begin insert into public.salon_reports (post_id, reason) values (p1, 'abuse'); raise exception 'SALON FAILED: reported the same post twice';
      exception when sqlstate '23505' then null; end; checks := checks + 1;
    end if;
  end loop;
  perform set_config('role', 'none', true);
  select status into st from public.salon_posts where id = p1;
  if st <> 'hidden' then raise exception 'SALON FAILED: three reports from week-old accounts did not hide the post (%)', st; end if; checks := checks + 1;
  perform pg_temp.act(b);
  select count(*) into n from public.salon_feed();
  if n <> 1 then raise exception 'SALON FAILED: a hidden post is still in the feed'; end if; checks := checks + 1;
  perform pg_temp.act(a);
  select status into st from public.salon_feed() where id = p1;
  if st <> 'hidden' then raise exception 'SALON FAILED: the author does not see their hidden post as hidden'; end if; checks := checks + 1;
  -- Three brand-new accounts can't silence anyone.
  foreach u in array nw loop
    perform pg_temp.act(u);
    insert into public.salon_reports (post_id, reason) values (p2, 'spam');
  end loop;
  perform set_config('role', 'none', true);
  select status into st from public.salon_posts where id = p2;
  if st <> 'published' then raise exception 'SALON FAILED: three new accounts hid a post'; end if; checks := checks + 1;
  perform pg_temp.act(b);
  select count(*) into n from public.salon_reports;
  if n <> 0 then raise exception 'SALON FAILED: a user reads reports'; end if; checks := checks + 1;

  -- --------------------------------------------------------- moderation
  begin perform public.salon_report_queue(); raise exception 'SALON FAILED: a non-editor reads the queue';
  exception when sqlstate '42501' then null; end; checks := checks + 1;
  begin perform public.salon_moderate(gen_random_uuid(), 'hide'); raise exception 'SALON FAILED: a non-editor moderated';
  exception when sqlstate '42501' then null; end; checks := checks + 1;
  select count(*) into n from public.salon_actions;
  if n <> 0 then raise exception 'SALON FAILED: a user reads the action log'; end if; checks := checks + 1;
  perform pg_temp.act(adm);
  select count(*) into n from public.salon_report_queue();
  if n <> 6 then raise exception 'SALON FAILED: the queue shows % reports, expected 6', n; end if; checks := checks + 1;
  select id into rep from public.salon_report_queue() where post_id = p1 limit 1;
  perform public.salon_moderate(rep, 'restore');
  perform set_config('role', 'none', true);
  select status into st from public.salon_posts where id = p1;
  select count(*) into n from public.salon_reports where post_id = p1 and status = 'open';
  if st <> 'published' or n <> 0 then raise exception 'SALON FAILED: restore (%, % open)', st, n; end if; checks := checks + 1;
  perform pg_temp.act(adm);
  select id into rep from public.salon_report_queue() where post_id = p2 limit 1;
  perform public.salon_moderate(rep, 'hide');
  perform set_config('role', 'none', true);
  select status into st from public.salon_posts where id = p2;
  if st <> 'hidden' then raise exception 'SALON FAILED: hide'; end if; checks := checks + 1;
  perform pg_temp.act(a);
  begin delete from public.salon_posts where id = p2; raise exception 'SALON FAILED: an author deleted a hidden post';
  exception when sqlstate '42501' then null; end; checks := checks + 1;
  perform pg_temp.act(b);
  insert into public.salon_reports (profile_user_id, reason) values (a, 'abuse');
  perform pg_temp.act(adm);
  select id into rep from public.salon_report_queue() where target_user_id = a and post_id is null limit 1;
  perform public.salon_moderate(rep, 'suspend');
  perform pg_temp.act(b);
  select count(*) into n from public.salon_feed();
  if n <> 0 or public.salon_profile(ha) is not null then raise exception 'SALON FAILED: a suspended author is still visible'; end if; checks := checks + 1;
  perform pg_temp.act(a);
  begin insert into public.salon_posts (kind, title, snapshot) values ('recipe', 'While suspended', snap); raise exception 'SALON FAILED: a suspended user posted';
  exception when sqlstate '42501' then null; end; checks := checks + 1;
  -- Deleting the profile and making it again doesn't lift a suspension.
  delete from public.salon_profiles where user_id = a;
  insert into public.salon_profiles (handle, is_public) values (ha, true);
  begin insert into public.salon_posts (kind, title, snapshot) values ('recipe', 'Fresh start', snap); raise exception 'SALON FAILED: re-creating the profile lifted a suspension';
  exception when sqlstate '42501' then null; end; checks := checks + 1;
  perform pg_temp.act(adm);
  perform public.salon_unsuspend(ha);
  perform pg_temp.act(b);
  if public.salon_profile(ha) is null then raise exception 'SALON FAILED: unsuspend did not restore the profile'; end if; checks := checks + 1;
  perform pg_temp.act(adm);
  select count(*) into n from public.salon_actions;
  if n < 4 then raise exception 'SALON FAILED: decisions not logged (%)', n; end if; checks := checks + 1;
  perform set_config('role', 'none', true);
  select count(*) into n from public.salon_posts where user_id = a;
  if n <> 2 then raise exception 'SALON FAILED: moderation deleted something (% posts left)', n; end if; checks := checks + 1;

  -- ------------------------------------------------------ anon, cascade
  if has_function_privilege('anon', 'public.salon_feed(text,text,boolean,integer,timestamptz)', 'execute')
     or has_function_privilege('anon', 'public.salon_profile(text)', 'execute')
     or has_function_privilege('anon', 'public.salon_moderate(uuid,text)', 'execute')
     or has_function_privilege('anon', 'public.salon_report_queue()', 'execute')
     or has_function_privilege('anon', 'public.salon_unsuspend(text)', 'execute') then
    raise exception 'SALON FAILED: anon can run a Salon function';
  end if; checks := checks + 1;
  if has_table_privilege('anon', 'public.salon_profiles', 'select') or has_table_privilege('anon', 'public.salon_posts', 'select')
     or has_table_privilege('anon', 'public.salon_likes', 'select') or has_table_privilege('anon', 'public.salon_follows', 'select')
     or has_table_privilege('anon', 'public.salon_reports', 'select') or has_table_privilege('anon', 'public.salon_actions', 'select')
     or has_table_privilege('authenticated', 'public.salon_suspensions', 'select') or has_function_privilege('authenticated', 'public.salon_is_public(uuid)', 'execute') then
    raise exception 'SALON FAILED: anon can read a Salon table';
  end if; checks := checks + 1;
  -- ------------------------------------------- function grants (0028)
  if has_function_privilege('anon', 'public.salon_has_link(text)', 'execute')
     or has_function_privilege('anon', 'public.salon_post_before_insert()', 'execute')
     or has_function_privilege('authenticated', 'public.salon_post_before_insert()', 'execute')
     or has_function_privilege('authenticated', 'public.salon_report_after_insert()', 'execute')
     or has_function_privilege('authenticated', 'public.salon_post_before_delete()', 'execute') then
    raise exception 'SALON FAILED: a Salon helper or trigger function is executable by anon or authenticated';
  end if;
  if not has_function_privilege('authenticated', 'public.salon_has_link(text)', 'execute') then
    raise exception 'SALON FAILED: authenticated lost salon_has_link (the CHECK constraints need it)';
  end if; checks := checks + 1;
  delete from auth.users where id = a;
  select count(*) into n from public.salon_profiles where user_id = a;
  select n + count(*) into n from public.salon_posts where user_id = a;
  select n + count(*) into n from public.salon_suspensions where user_id = a;
  if n <> 0 then raise exception 'SALON FAILED: deleting the account left Salon rows (hidden posts included)'; end if; checks := checks + 1;

  raise exception 'SALON PASSED: % checks (rolled back, nothing kept)', checks;
end
$$;
