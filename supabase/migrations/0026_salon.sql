-- 0026 — The Salon (Kyphira Phase 6). Additive; the room is behind a flag.
--
-- The Salon is where people who choose to can share: a public profile
-- (off by default), recipe posts (a snapshot of a saved recipe's numbers,
-- never the private recipe, its notes or any cost), fragrance reviews,
-- follows and likes. Safety is built in, not bolted on:
--   - private by default: nothing is visible until the author turns their
--     profile public, and turning it off hides everything again;
--   - tables are readable by their owner only. Everyone else's posts are read
--     through salon_feed / salon_profile (SECURITY DEFINER, signed-in only),
--     which apply the visibility rules in one place and return counts, never
--     the likers or the follow lists;
--   - no links anywhere (spam), text lengths bounded, numbers in a recipe
--     snapshot range-checked by a trigger;
--   - caps by trigger: 10 posts a day, 300 likes a day, 500 follows, 20
--     reports a day; posting needs an account at least a day old;
--   - a suspension lives in its own table (salon_suspensions) that no user can
--     write, so deleting and re-creating a profile doesn't lift it; a hidden
--     post can't be deleted by its author (account deletion still cascades);
--   - reporting: any signed-in user can report a post or profile; three
--     reports from accounts at least 7 days old hide a post at once (an editor
--     can restore it); editors see a queue and can hide, dismiss, restore or
--     suspend, and every decision is logged. Nothing is ever deleted by
--     moderation.
-- Every table references auth.users ON DELETE CASCADE (account deletion).
-- Down: 0026_salon.down.sql.

create function public.salon_has_link(t text) returns boolean
language sql immutable parallel safe as $$
  select coalesce(t ~* '(https?:|www\.|@[a-z0-9-]+\.[a-z]|[a-z0-9-]\.(com|net|org|io|co|shop|store|ru|xyz|info|biz|me|ly|app|link)([^a-z]|$))', false)
$$;

create table public.salon_profiles (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  handle text not null unique check (handle ~ '^[a-z0-9_]{3,30}$'),
  display_name text check (display_name is null or (char_length(btrim(display_name)) between 1 and 60 and not salon_has_link(display_name))),
  bio text check (bio is null or (char_length(bio) <= 300 and not salon_has_link(bio))),
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

-- Written only by salon_moderate / salon_unsuspend (no grants, no policies).
create table public.salon_suspensions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Whether someone's Salon presence is shown to others: a public profile and
-- no suspension. Only the SECURITY DEFINER functions below call it.
create function public.salon_is_public(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.salon_profiles p where p.user_id = uid and p.is_public)
     and not exists (select 1 from public.salon_suspensions z where z.user_id = uid)
$$;
revoke all on function public.salon_is_public(uuid) from public, anon, authenticated;

create table public.salon_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('recipe', 'review')),
  title text not null check (char_length(btrim(title)) between 1 and 100 and not salon_has_link(title)),
  body text check (body is null or (char_length(body) <= 1500 and not salon_has_link(body))),
  family text check (family is null or family in ('fresh', 'floral', 'woody', 'oriental', 'gourmand')),
  -- recipe: { amount, unit, concentration_pct, oil_density?, ethanol_density? }
  snapshot jsonb,
  fragrance_id uuid references public.fragrances(id) on delete set null,
  rating smallint check (rating is null or rating between 1 and 5),
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now(),
  check ((kind = 'recipe' and snapshot is not null and rating is null and fragrance_id is null)
      or (kind = 'review' and snapshot is null and rating is not null and fragrance_id is not null))
);
create index salon_posts_feed_idx on public.salon_posts (created_at desc) where status = 'published';
create index salon_posts_user_idx on public.salon_posts (user_id, created_at desc);

create table public.salon_likes (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  post_id uuid not null references public.salon_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index salon_likes_post_idx on public.salon_likes (post_id);

create table public.salon_follows (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  followee_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, followee_id),
  check (user_id <> followee_id)
);
create index salon_follows_followee_idx on public.salon_follows (followee_id);

create table public.salon_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  post_id uuid references public.salon_posts(id) on delete cascade,
  profile_user_id uuid references auth.users(id) on delete cascade,
  reason text not null check (reason in ('spam', 'abuse', 'unsafe', 'other')),
  note text check (note is null or char_length(note) <= 300),
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  check ((post_id is not null) <> (profile_user_id is not null)),
  unique (user_id, post_id),
  unique (user_id, profile_user_id)
);
create index salon_reports_open_idx on public.salon_reports (created_at) where status = 'open';

create table public.salon_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null default auth.uid(),
  action text not null check (action in ('hide', 'restore', 'dismiss', 'suspend', 'unsuspend', 'auto_hide')),
  post_id uuid,
  target_user_id uuid,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------- limits
-- SECURITY DEFINER where a trigger must read what the caller can't (auth.users
-- for account age, other people's posts); each one filters by the new row's
-- own user_id, so it can't be steered at anyone else's data.
create function public.salon_post_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare ok boolean; created timestamptz;
begin
  ok := public.salon_is_public(new.user_id);
  if not ok then raise exception 'public profile needed' using errcode = '42501'; end if;
  select au.created_at into created from auth.users au where au.id = new.user_id;
  if created is null or created > now() - interval '1 day' then raise exception 'account too new' using errcode = '42501'; end if;
  if (select count(*) from public.salon_posts where user_id = new.user_id and created_at > now() - interval '1 day') >= 10 then
    raise exception 'too many posts today' using errcode = '54000';
  end if;
  if new.kind = 'recipe' then
    if jsonb_typeof(new.snapshot) <> 'object'
       or (new.snapshot - 'amount' - 'unit' - 'concentration_pct' - 'oil_density' - 'ethanol_density') <> '{}'::jsonb
       or jsonb_typeof(new.snapshot->'amount') <> 'number' or (new.snapshot->>'amount')::numeric not between 0.0001 and 100000
       or new.snapshot->>'unit' not in ('ml', 'floz', 'g', 'oz')
       or jsonb_typeof(new.snapshot->'concentration_pct') <> 'number' or (new.snapshot->>'concentration_pct')::numeric not between 0.0001 and 99.9999
       or (new.snapshot ? 'oil_density' and (jsonb_typeof(new.snapshot->'oil_density') <> 'number' or (new.snapshot->>'oil_density')::numeric not between 0.5 and 1.5))
       or (new.snapshot ? 'ethanol_density' and (jsonb_typeof(new.snapshot->'ethanol_density') <> 'number' or (new.snapshot->>'ethanol_density')::numeric not between 0.7 and 0.9))
    then raise exception 'bad recipe' using errcode = '22023'; end if;
  elsif not exists (select 1 from public.fragrances f where f.id = new.fragrance_id and f.status = 'approved') then
    raise exception 'unknown fragrance' using errcode = '22023';
  end if;
  new.status := 'published';
  return new;
end $$;
create trigger salon_posts_before_insert before insert on public.salon_posts
  for each row execute function public.salon_post_before_insert();

-- One review per person per fragrance.
create unique index salon_posts_one_review on public.salon_posts (user_id, fragrance_id) where kind = 'review';

create function public.salon_like_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.salon_posts p where p.id = new.post_id and p.status = 'published' and public.salon_is_public(p.user_id)) then
    raise exception 'post not found' using errcode = '42501';
  end if;
  if (select count(*) from public.salon_likes where user_id = new.user_id and created_at > now() - interval '1 day') >= 300 then
    raise exception 'too many likes today' using errcode = '54000';
  end if;
  return new;
end $$;
create trigger salon_likes_before_insert before insert on public.salon_likes
  for each row execute function public.salon_like_before_insert();

create function public.salon_follow_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.salon_is_public(new.followee_id) then
    raise exception 'profile not found' using errcode = '42501';
  end if;
  if (select count(*) from public.salon_follows where user_id = new.user_id) >= 500 then
    raise exception 'too many follows' using errcode = '54000';
  end if;
  return new;
end $$;
create trigger salon_follows_before_insert before insert on public.salon_follows
  for each row execute function public.salon_follow_before_insert();

-- Reports: capped, can't report yourself, and three from week-old accounts
-- hide the post until an editor looks (never deletes). SECURITY DEFINER: the
-- reporter can't see or touch the post.
create function public.salon_report_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare author uuid;
begin
  if (select count(*) from public.salon_reports where user_id = new.user_id and created_at > now() - interval '1 day') >= 20 then
    raise exception 'too many reports today' using errcode = '54000';
  end if;
  if new.post_id is not null then
    select p.user_id into author from public.salon_posts p where p.id = new.post_id and p.status = 'published';
    if author is null then raise exception 'post not found' using errcode = '42501'; end if;
  else
    author := new.profile_user_id;
    if not public.salon_is_public(author) then
      raise exception 'profile not found' using errcode = '42501';
    end if;
  end if;
  if author = new.user_id then raise exception 'own content' using errcode = '23514'; end if;
  new.status := 'open';
  return new;
end $$;
create trigger salon_reports_before_insert before insert on public.salon_reports
  for each row execute function public.salon_report_before_insert();

create function public.salon_report_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.post_id is not null and (
       select count(distinct r.user_id) from public.salon_reports r join auth.users au on au.id = r.user_id
        where r.post_id = new.post_id and r.status = 'open' and au.created_at <= now() - interval '7 days') >= 3 then
    update public.salon_posts set status = 'hidden' where id = new.post_id and status = 'published';
    if found then insert into public.salon_actions (admin_id, action, post_id) values (null, 'auto_hide', new.post_id); end if;
  end if;
  return null;
end $$;
create trigger salon_reports_after_insert after insert on public.salon_reports
  for each row execute function public.salon_report_after_insert();

-- A hidden post can't be deleted by its author (that would let it be posted
-- again as if nothing happened). Depth 1 is a direct delete; the cascade from
-- deleting an account runs one level deeper and is allowed.
create function public.salon_post_before_delete() returns trigger
language plpgsql set search_path = public as $$
begin
  if old.status = 'hidden' and pg_trigger_depth() = 1 then
    raise exception 'post is under review' using errcode = '42501';
  end if;
  return old;
end $$;
create trigger salon_posts_before_delete before delete on public.salon_posts
  for each row execute function public.salon_post_before_delete();

-- ------------------------------------------------------------------- RLS
alter table public.salon_profiles enable row level security;
alter table public.salon_posts enable row level security;
alter table public.salon_likes enable row level security;
alter table public.salon_follows enable row level security;
alter table public.salon_reports enable row level security;
alter table public.salon_actions enable row level security;
alter table public.salon_suspensions enable row level security;

create policy salon_profiles_own on public.salon_profiles for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy salon_posts_own on public.salon_posts for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy salon_likes_own on public.salon_likes for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy salon_follows_own on public.salon_follows for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy salon_reports_own_read on public.salon_reports for select to authenticated using ((select auth.uid()) = user_id);
create policy salon_reports_own_insert on public.salon_reports for insert to authenticated with check ((select auth.uid()) = user_id);
create policy salon_actions_admin on public.salon_actions for select to authenticated using ((select is_admin()));

-- Column grants: what a user may set themselves. Status, suspension and every
-- moderation column are reachable only through the editor functions.
revoke all on public.salon_profiles, public.salon_posts, public.salon_likes, public.salon_follows, public.salon_reports, public.salon_actions, public.salon_suspensions from anon, authenticated;
grant select, delete on public.salon_profiles to authenticated;
grant insert (user_id, handle, display_name, bio, is_public) on public.salon_profiles to authenticated;
grant update (handle, display_name, bio, is_public) on public.salon_profiles to authenticated;
grant select, delete on public.salon_posts to authenticated;
grant insert (user_id, kind, title, body, family, snapshot, fragrance_id, rating) on public.salon_posts to authenticated;
grant update (title, body) on public.salon_posts to authenticated;
grant select, insert, delete on public.salon_likes to authenticated;
grant select, insert, delete on public.salon_follows to authenticated;
grant select on public.salon_reports to authenticated;
grant insert (user_id, post_id, profile_user_id, reason, note) on public.salon_reports to authenticated;
grant select on public.salon_actions to authenticated;

-- ------------------------------------------------------------------ reads
-- The visibility rule, once: a post is shown to others only if it is
-- published and its author's profile is public and not suspended; authors
-- always see their own (with the status).
create function public.salon_feed(
  p_kind text default null, p_handle text default null, p_following boolean default false,
  p_limit int default 20, p_before timestamptz default null)
returns table (id uuid, kind text, title text, body text, family text, snapshot jsonb, fragrance_id uuid, fragrance_name text,
               rating smallint, status text, created_at timestamptz, handle text, display_name text, likes bigint, liked boolean, mine boolean)
language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  return query
  select p.id, p.kind, p.title, p.body, p.family, p.snapshot, p.fragrance_id, f.name, p.rating, p.status, p.created_at,
         s.handle, s.display_name,
         (select count(*) from public.salon_likes l where l.post_id = p.id),
         exists (select 1 from public.salon_likes l where l.post_id = p.id and l.user_id = me),
         p.user_id = me
  from public.salon_posts p
  join public.salon_profiles s on s.user_id = p.user_id
  left join public.fragrances f on f.id = p.fragrance_id
  where (p.user_id = me or (p.status = 'published' and s.is_public and not exists (select 1 from public.salon_suspensions z where z.user_id = p.user_id)))
    and (p_kind is null or p.kind = p_kind)
    and (p_handle is null or s.handle = lower(p_handle))
    and (not p_following or exists (select 1 from public.salon_follows fl where fl.user_id = me and fl.followee_id = p.user_id))
    and (p_before is null or p.created_at < p_before)
  order by p.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
end $$;
revoke all on function public.salon_feed(text, text, boolean, int, timestamptz) from public, anon;
grant execute on function public.salon_feed(text, text, boolean, int, timestamptz) to authenticated;

-- A profile with its counts; null when it isn't public (or is suspended)
-- unless it is the caller's own.
create function public.salon_profile(p_handle text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid(); s public.salon_profiles;
begin
  if me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  select * into s from public.salon_profiles where handle = lower(p_handle);
  if not found or (s.user_id <> me and not public.salon_is_public(s.user_id)) then return null; end if;
  return jsonb_build_object('handle', s.handle, 'display_name', s.display_name, 'bio', s.bio, 'mine', s.user_id = me,
    'is_public', s.is_public, 'suspended', exists (select 1 from public.salon_suspensions z where z.user_id = s.user_id),
    'posts', (select count(*) from public.salon_posts p where p.user_id = s.user_id and p.status = 'published'),
    'followers', (select count(*) from public.salon_follows f where f.followee_id = s.user_id),
    'following', (select count(*) from public.salon_follows f where f.user_id = s.user_id),
    'i_follow', exists (select 1 from public.salon_follows f where f.user_id = me and f.followee_id = s.user_id),
    'user_id', case when s.user_id = me then null else s.user_id end);
end $$;
revoke all on function public.salon_profile(text) from public, anon;
grant execute on function public.salon_profile(text) to authenticated;

-- --------------------------------------------------------------- moderation
-- Open reports with what they point at, oldest first. Editors only.
create function public.salon_report_queue()
returns table (id uuid, reason text, note text, created_at timestamptz, post_id uuid, post_title text, post_body text, post_status text,
               target_user_id uuid, target_handle text, reports bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (select is_admin()) then raise exception 'not allowed' using errcode = '42501'; end if;
  return query
  select r.id, r.reason, r.note, r.created_at, r.post_id, p.title, p.body, p.status,
         coalesce(p.user_id, r.profile_user_id), s.handle,
         (select count(*) from public.salon_reports x where x.status = 'open' and x.post_id is not distinct from r.post_id and x.profile_user_id is not distinct from r.profile_user_id)
  from public.salon_reports r
  left join public.salon_posts p on p.id = r.post_id
  left join public.salon_profiles s on s.user_id = coalesce(p.user_id, r.profile_user_id)
  where r.status = 'open'
  order by r.created_at limit 200;
end $$;
revoke all on function public.salon_report_queue() from public, anon;
grant execute on function public.salon_report_queue() to authenticated;

-- hide: the post is hidden and its reports closed as actioned.
-- dismiss: the report is closed, nothing changes.
-- restore: the post is shown again and its reports dismissed.
-- suspend: the author's profile is suspended (everything of theirs hidden from others).
-- Nothing is deleted. Every decision is logged. Editors only.
create function public.salon_moderate(p_report uuid, p_action text) returns void
language plpgsql security definer set search_path = public as $$
declare r public.salon_reports; author uuid;
begin
  if not (select is_admin()) then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_action not in ('hide', 'dismiss', 'restore', 'suspend') then raise exception 'action' using errcode = '22023'; end if;
  select * into r from public.salon_reports where id = p_report and status = 'open';
  if not found then raise exception 'not open' using errcode = 'P0002'; end if;
  select coalesce((select p.user_id from public.salon_posts p where p.id = r.post_id), r.profile_user_id) into author;
  if p_action = 'hide' then
    if r.post_id is null then raise exception 'action' using errcode = '22023'; end if;
    update public.salon_posts set status = 'hidden' where id = r.post_id;
    update public.salon_reports set status = 'actioned' where post_id = r.post_id and status = 'open';
  elsif p_action = 'restore' then
    if r.post_id is null then raise exception 'action' using errcode = '22023'; end if;
    update public.salon_posts set status = 'published' where id = r.post_id;
    update public.salon_reports set status = 'dismissed' where post_id = r.post_id and status = 'open';
  elsif p_action = 'suspend' then
    insert into public.salon_suspensions (user_id) values (author) on conflict do nothing;
    update public.salon_reports set status = 'actioned' where status = 'open' and (profile_user_id = author or post_id in (select id from public.salon_posts where user_id = author));
  else
    update public.salon_reports set status = 'dismissed' where id = p_report;
  end if;
  insert into public.salon_actions (action, post_id, target_user_id) values (p_action, r.post_id, author);
end $$;
revoke all on function public.salon_moderate(uuid, text) from public, anon;
grant execute on function public.salon_moderate(uuid, text) to authenticated;

-- Lift a suspension. Editors only; logged.
create function public.salon_unsuspend(p_handle text) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not (select is_admin()) then raise exception 'not allowed' using errcode = '42501'; end if;
  select user_id into uid from public.salon_profiles where handle = lower(p_handle);
  delete from public.salon_suspensions where user_id = uid;
  if uid is null or not found then raise exception 'not suspended' using errcode = 'P0002'; end if;
  insert into public.salon_actions (action, target_user_id) values ('unsuspend', uid);
end $$;
revoke all on function public.salon_unsuspend(text) from public, anon;
grant execute on function public.salon_unsuspend(text) to authenticated;
