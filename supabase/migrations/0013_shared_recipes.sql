-- =====================================================================
-- 0013 Shareable recipes: a public page for a batch its owner chose to share.
-- The row is a SNAPSHOT of the safe fields, taken when the owner shares
-- (and refreshed when they share again). Cost, price, supplier (oil_type),
-- blended_by, the private notes and inventory have no column here, so no
-- query against this table can put them on a public page.
--
-- Access:
--   - owners read their own rows (Batches tab, data export);
--   - nobody writes from the browser: /api/share writes as the service role
--     (cleaning, rate limit, ownership);
--   - the public reads ONLY through two functions: one recipe by its exact
--     slug, and the sitemap list of indexable recipes. There is no table or
--     view anon can list, so an unlisted recipe (no public note) can only
--     be found by someone who has its link, and the sharer's user id is
--     never exposed.
--
-- Unsharing sets published = false and keeps the row, so sharing again
-- brings back the same URL. Deleting the batch deletes the row.
-- New table + functions only; no existing rows change.
-- =====================================================================

create table public.shared_recipes (
  batch_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  -- <name>-<6 random>, e.g. oud-nights-k3x9qa or عود-الليل-k3x9qa
  slug text not null unique check (
    char_length(slug) between 8 and 100
    and slug ~ '-[a-z0-9]{6}$'
    and slug !~ '[[:space:]/?#%<>"''\\]'
  ),
  fragrance_name text not null check (char_length(fragrance_name) between 1 and 120),
  tier text not null check (tier in ('fresh', 'floral', 'woody', 'oriental', 'gourmand')),
  concentration_pct numeric not null check (concentration_pct > 0 and concentration_pct < 100),
  basis text check (basis is null or basis in ('volume', 'weight')),
  total_ml numeric not null check (total_ml > 0),
  total_g numeric not null check (total_g > 0),
  oil_g numeric not null check (oil_g >= 0),
  ethanol_g numeric not null check (ethanol_g >= 0),
  rest_days smallint check (rest_days is null or rest_days between 0 and 365),
  public_note text check (public_note is null or char_length(public_note) between 1 and 500),
  note_lang text check (note_lang is null or note_lang in ('en', 'ar')),
  published boolean not null default true,
  -- Listed in the sitemap and indexable only with a real note (≥40
  -- characters): bare "X at 20%, 50 mL" pages are thin content.
  indexable boolean generated always as (published and coalesce(char_length(public_note), 0) >= 40) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shared_recipes_batch_fkey foreign key (batch_id, user_id)
    references public.batches(id, user_id) on delete cascade
);

create index shared_recipes_user on public.shared_recipes (user_id);
create index shared_recipes_sitemap on public.shared_recipes (created_at, slug) where indexable;

alter table public.shared_recipes enable row level security;
create policy shared_recipes_read_own on public.shared_recipes for select to authenticated
  using ((select auth.uid()) = user_id);
revoke all on table public.shared_recipes from anon;
revoke insert, update, delete, truncate on table public.shared_recipes from authenticated;

-- One published recipe by its exact slug: the public fields only.
create function public.recipe_by_slug(p_slug text)
returns table (
  slug text, fragrance_name text, tier text, concentration_pct numeric, basis text,
  total_ml numeric, total_g numeric, oil_g numeric, ethanol_g numeric, rest_days smallint,
  public_note text, note_lang text, indexable boolean, updated_at timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select r.slug, r.fragrance_name, r.tier, r.concentration_pct, r.basis,
         r.total_ml, r.total_g, r.oil_g, r.ethanol_g, r.rest_days,
         r.public_note, r.note_lang, r.indexable, r.updated_at
  from public.shared_recipes r
  where r.slug = p_slug and r.published;
$$;

-- Indexable recipes for the sitemap, in a stable order, a page at a time
-- (a sitemap file holds at most 50,000 URLs).
create function public.recipe_sitemap(p_offset integer default 0, p_limit integer default 50000)
returns table (slug text, updated_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select r.slug, r.updated_at
  from public.shared_recipes r
  where r.indexable
  order by r.created_at, r.slug
  offset greatest(p_offset, 0)
  limit least(greatest(p_limit, 1), 50000);
$$;

create function public.recipe_sitemap_count()
returns bigint
language sql stable security definer set search_path = ''
as $$
  select count(*) from public.shared_recipes r where r.indexable;
$$;

revoke all on function public.recipe_by_slug(text) from public;
revoke all on function public.recipe_sitemap(integer, integer) from public;
revoke all on function public.recipe_sitemap_count() from public;
grant execute on function public.recipe_by_slug(text) to anon, authenticated;
grant execute on function public.recipe_sitemap(integer, integer) to anon, authenticated;
grant execute on function public.recipe_sitemap_count() to anon, authenticated;
