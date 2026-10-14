-- 0024 — The Wardrobe (Kyphira Phase 4). Additive; the room is behind a flag.
--
-- wardrobe_bottles: what a user owns, wants or has sampled (status), as a
-- full bottle or a decant, with size, fill level, price and the Wardrobe
-- method's own tags (clusters, projection band). wear_log: one row per
-- wearing, with the occasion, time of day, temperature and sprays.
-- Both are owner-only and written straight from the browser (RLS alone,
-- like calc_presets); the caps and the "no wearing a wish-list bottle" rule
-- are database triggers. A wear row can only point at the same user's bottle
-- (composite key, as batch_checkins does). Deleting a bottle deletes its
-- wear log. Down: 0024_wardrobe.down.sql.

create table public.wardrobe_bottles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  -- The catalog row it came from, if any; `name` is always kept so the
  -- bottle still reads right if that row is ever removed.
  fragrance_id uuid references public.fragrances(id) on delete set null,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  status text not null default 'owned' check (status in ('owned', 'wishlist', 'tested')),
  kind text not null default 'bottle' check (kind in ('bottle', 'decant')),
  family text check (family is null or family in ('fresh', 'floral', 'woody', 'oriental', 'gourmand')),
  projection text check (projection is null or projection in ('intimate', 'personal', 'social', 'statement')),
  clusters text[] not null default '{}'
    check (clusters <@ array['clean', 'luxury', 'dark', 'social', 'artistic']::text[] and cardinality(clusters) <= 5),
  size_ml numeric check (size_ml is null or (size_ml > 0 and size_ml <= 5000)),
  fill_pct numeric check (fill_pct is null or (fill_pct >= 0 and fill_pct <= 100)),
  purchase_date date,
  price numeric check (price is null or (price >= 0 and price <= 10000000)),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);
create index wardrobe_bottles_user_idx on public.wardrobe_bottles (user_id, status);

create table public.wear_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  bottle_id uuid not null,
  worn_on date not null default current_date,
  occasion text check (occasion is null or occasion in
    ('professional', 'client_meeting', 'smart_casual', 'date', 'formal_evening', 'nightlife', 'creative', 'relaxed')),
  time_of_day text check (time_of_day is null or time_of_day in ('morning', 'day', 'evening', 'night')),
  temp_c numeric check (temp_c is null or (temp_c >= -50 and temp_c <= 60)),
  sprays integer check (sprays is null or (sprays >= 0 and sprays <= 50)),
  note text check (note is null or char_length(note) <= 300),
  created_at timestamptz not null default now(),
  foreign key (bottle_id, user_id) references public.wardrobe_bottles (id, user_id) on delete cascade
);
create index wear_log_user_day_idx on public.wear_log (user_id, worn_on desc);
create index wear_log_bottle_idx on public.wear_log (bottle_id);

-- SECURITY INVOKER: RLS applies, so the counts see only the caller's rows.
create function public.wardrobe_bottle_before_insert() returns trigger
language plpgsql set search_path = public as $$
begin
  if (select count(*) from public.wardrobe_bottles where user_id = new.user_id) >= 300 then
    raise exception 'too many bottles' using errcode = '54000';
  end if;
  return new;
end $$;
create trigger wardrobe_bottles_before_insert before insert on public.wardrobe_bottles
  for each row execute function public.wardrobe_bottle_before_insert();

create function public.wardrobe_bottle_before_update() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger wardrobe_bottles_before_update before update on public.wardrobe_bottles
  for each row execute function public.wardrobe_bottle_before_update();

create function public.wear_log_before_insert() returns trigger
language plpgsql set search_path = public as $$
begin
  if (select count(*) from public.wear_log where user_id = new.user_id) >= 20000 then
    raise exception 'too many wear entries' using errcode = '54000';
  end if;
  -- You can't wear what is only on your wish list.
  if exists (select 1 from public.wardrobe_bottles b where b.id = new.bottle_id and b.user_id = new.user_id and b.status = 'wishlist') then
    raise exception 'bottle is on the wish list' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger wear_log_before_insert before insert on public.wear_log
  for each row execute function public.wear_log_before_insert();

alter table public.wardrobe_bottles enable row level security;
alter table public.wear_log enable row level security;
create policy wardrobe_bottles_own on public.wardrobe_bottles for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy wear_log_own on public.wear_log for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on table public.wardrobe_bottles, public.wear_log from anon;
