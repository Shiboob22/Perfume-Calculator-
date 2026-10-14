-- 0023 — Saved recipes with versions (Kyphira Phase 3). Additive.
--
-- A recipe is a named blend ("Oud Nights"); each save of its settings is a new
-- immutable version (v1, v2, …), so an old batch can say which version made
-- it. Owner-only, written straight from the browser (RLS alone), like
-- calc_presets. batches.recipe_version_id links a batch to its version; the
-- batch API checks the version is the caller's before it stores the link.
-- Limits (50 recipes per user, 100 versions per recipe) stop runaway writes.
-- Down: 0023_recipes.down.sql.

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  family text check (family is null or family in ('fresh', 'floral', 'woody', 'oriental', 'gourmand')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index recipes_user_name_key on public.recipes (user_id, lower(btrim(name)));

create table public.recipe_versions (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  version integer not null,
  amount numeric not null check (amount > 0 and amount <= 100000),
  unit text not null check (unit in ('ml', 'floz', 'g', 'oz')),
  concentration_pct numeric not null check (concentration_pct > 0 and concentration_pct < 100),
  oil_density numeric check (oil_density is null or (oil_density >= 0.5 and oil_density <= 1.5)),
  ethanol_density numeric check (ethanol_density is null or (ethanol_density >= 0.7 and ethanol_density <= 0.9)),
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  unique (recipe_id, version)
);
create index recipe_versions_user_idx on public.recipe_versions (user_id);

-- The next version number, and the limits. SECURITY INVOKER: RLS applies, so
-- the counts only ever see the caller's own rows.
create function public.recipe_version_before_insert() returns trigger
language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from public.recipes r where r.id = new.recipe_id and r.user_id = new.user_id) then
    raise exception 'recipe not found' using errcode = '42501';
  end if;
  select coalesce(max(version), 0) + 1 into new.version from public.recipe_versions where recipe_id = new.recipe_id;
  if new.version > 100 then
    raise exception 'too many versions' using errcode = '54000';
  end if;
  update public.recipes set updated_at = now() where id = new.recipe_id;
  return new;
end $$;
create trigger recipe_versions_before_insert before insert on public.recipe_versions
  for each row execute function public.recipe_version_before_insert();

create function public.recipe_before_insert() returns trigger
language plpgsql set search_path = public as $$
begin
  if (select count(*) from public.recipes where user_id = new.user_id) >= 50 then
    raise exception 'too many recipes' using errcode = '54000';
  end if;
  return new;
end $$;
create trigger recipes_before_insert before insert on public.recipes
  for each row execute function public.recipe_before_insert();

alter table public.recipes enable row level security;
alter table public.recipe_versions enable row level security;
create policy recipes_own on public.recipes for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy recipe_versions_own on public.recipe_versions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on table public.recipes, public.recipe_versions from anon;
-- Versions are history: no edits (UPDATE), only add or remove.
revoke update on table public.recipe_versions from authenticated;

alter table public.batches
  add column if not exists recipe_version_id uuid references public.recipe_versions(id) on delete set null;
create index if not exists batches_recipe_version_idx on public.batches (recipe_version_id) where recipe_version_id is not null;
