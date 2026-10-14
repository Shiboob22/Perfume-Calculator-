-- 0025 — The Atlas (Kyphira Phase 5). Additive; the room is behind a flag.
--
-- The Atlas reads the existing `fragrances` catalog (owner decision, 2026-10-14:
-- keep it, hide the Atlas behind a flag, defer licensing). Nothing in that
-- table is rewritten. On top of it:
--   - entity views (houses, notes, accords, perfumers) computed from the
--     catalog's own columns, so there is one source of truth;
--   - Arabic names: atlas_terms (notes, accords, houses…) and atlas_aliases
--     (a fragrance's Arabic name), both curated by an admin, empty at first;
--   - atlas_search: full-text (prefix) plus trigram (typo tolerance), with
--     filters by note, family, house, accord, perfumer and year;
--   - the contribution path (atlas_submit → a pending row) and its moderation
--     queue (atlas_review: approve, or reject without deleting anything);
--   - atlas_wear_stats: anonymous community counts from the Wardrobe, only for
--     people who opted in (profiles.wear_stats_opt_in, default off) and only
--     once at least 5 of them agree (k-anonymity).
-- Down: 0025_atlas.down.sql.

create index if not exists fragrances_atlas_fts_idx
  on public.fragrances using gin (to_tsvector('simple', search_text));

-- A rejected contribution stays (its author's own batches and stock keep
-- pointing at it); it is simply never shown to anyone else.
alter table public.fragrances drop constraint fragrances_status_check;
alter table public.fragrances add constraint fragrances_status_check
  check (status = any (array['approved', 'pending', 'rejected']));

-- ---------------------------------------------------------------- entities
-- Computed from approved rows only. Refreshed by atlas_refresh() (admin).
create materialized view public.atlas_houses as
select lower(btrim(brand)) as key, min(btrim(brand)) as name, count(*)::int as fragrances,
       min(year) as first_year, max(year) as last_year, round(avg(rating), 2) as avg_rating
from public.fragrances
where status = 'approved' and brand is not null and btrim(brand) <> ''
group by lower(btrim(brand));
create unique index atlas_houses_key on public.atlas_houses (key);

create materialized view public.atlas_notes as
select lower(btrim(n)) as key, min(btrim(n)) as name, count(distinct id)::int as fragrances,
       (count(*) filter (where layer = 'top'))::int as top,
       (count(*) filter (where layer = 'heart'))::int as heart,
       (count(*) filter (where layer = 'base'))::int as base
from (
  select id, 'top' as layer, unnest(top_notes) as n from public.fragrances where status = 'approved'
  union all select id, 'heart', unnest(middle_notes) from public.fragrances where status = 'approved'
  union all select id, 'base', unnest(base_notes) from public.fragrances where status = 'approved'
) x
where btrim(n) <> ''
group by lower(btrim(n));
create unique index atlas_notes_key on public.atlas_notes (key);

create materialized view public.atlas_accords as
select lower(btrim(a)) as key, min(btrim(a)) as name, count(distinct id)::int as fragrances
from (select id, unnest(accords) as a from public.fragrances where status = 'approved') x
where btrim(a) <> ''
group by lower(btrim(a));
create unique index atlas_accords_key on public.atlas_accords (key);

create materialized view public.atlas_perfumers as
select lower(btrim(p)) as key, min(btrim(p)) as name, count(distinct id)::int as fragrances
from (select id, unnest(perfumers) as p from public.fragrances where status = 'approved') x
where btrim(p) <> ''
group by lower(btrim(p));
create unique index atlas_perfumers_key on public.atlas_perfumers (key);

revoke all on public.atlas_houses, public.atlas_notes, public.atlas_accords, public.atlas_perfumers from public, anon;
grant select on public.atlas_houses, public.atlas_notes, public.atlas_accords, public.atlas_perfumers to authenticated;

create function public.atlas_refresh() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (select is_admin()) and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  refresh materialized view public.atlas_houses;
  refresh materialized view public.atlas_notes;
  refresh materialized view public.atlas_accords;
  refresh materialized view public.atlas_perfumers;
end $$;
revoke all on function public.atlas_refresh() from public, anon;
grant execute on function public.atlas_refresh() to authenticated;

-- ------------------------------------------------------------ Arabic names
create table public.atlas_terms (
  kind text not null check (kind in ('note', 'accord', 'house', 'perfumer', 'family')),
  key text not null check (key = lower(btrim(key)) and char_length(key) between 1 and 120),
  ar text not null check (char_length(btrim(ar)) between 1 and 120),
  primary key (kind, key)
);
create table public.atlas_aliases (
  id uuid primary key default gen_random_uuid(),
  fragrance_id uuid not null references public.fragrances(id) on delete cascade,
  lang text not null check (lang in ('en', 'ar')),
  alias text not null check (char_length(btrim(alias)) between 1 and 120),
  unique (fragrance_id, lang, alias)
);
create index atlas_aliases_fragrance_idx on public.atlas_aliases (fragrance_id);
create index atlas_aliases_trgm_idx on public.atlas_aliases using gin (alias gin_trgm_ops);

alter table public.atlas_terms enable row level security;
alter table public.atlas_aliases enable row level security;
create policy atlas_terms_read on public.atlas_terms for select to authenticated using (true);
create policy atlas_terms_admin on public.atlas_terms for all to authenticated
  using ((select is_admin())) with check ((select is_admin()));
create policy atlas_aliases_read on public.atlas_aliases for select to authenticated using (true);
create policy atlas_aliases_admin on public.atlas_aliases for all to authenticated
  using ((select is_admin())) with check ((select is_admin()));
revoke all on public.atlas_terms, public.atlas_aliases from anon;

-- ------------------------------------------------------------------ search
-- Words match by prefix (full text, 'simple' so any language's letters work);
-- an alias (an Arabic name, say) matches as a substring. Only when those find
-- fewer than 10 does the typo-tolerant trigram match run. Each step is its own
-- index query (a single OR over all of them defeats the indexes: ~2 s against
-- ~100 ms). All filters are optional and combine with AND.
-- SECURITY DEFINER on purpose: with row-level security on, the trigram
-- operators (not leakproof) can't use their indexes and a search takes
-- seconds. The function returns approved rows only (the same rows the policy
-- gives every signed-in user) and refuses anyone who isn't signed in.
create function public.atlas_search(
  p_q text default null, p_note text default null, p_family text default null, p_house text default null,
  p_accord text default null, p_perfumer text default null, p_year_from int default null, p_year_to int default null,
  p_limit int default 24, p_offset int default 0)
returns table (id uuid, name text, brand text, year smallint, tier text, olfactory_family text, gender text,
               rating numeric, accords text[], image_url text, total bigint)
language plpgsql stable security definer set search_path = public, extensions set plan_cache_mode = force_custom_plan as $$
declare
  raw text := nullif(btrim(coalesce(p_q, '')), '');
  folded text;
  expr text;
  hits uuid[];
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if raw is not null then
    folded := regexp_replace(lower(immutable_unaccent(raw)), '[''’`]', '', 'g');
    select string_agg(w || ':*', ' & ') into expr from regexp_split_to_table(folded, '[^a-z0-9]+') w where w <> '';
    hits := array(
      select f.id from public.fragrances f
       where expr is not null and f.status = 'approved' and to_tsvector('simple', f.search_text) @@ to_tsquery('simple', expr)
      union
      select a.fragrance_id from public.atlas_aliases a
       where a.alias ilike '%' || replace(replace(raw, '%', ''), '_', '') || '%');
    if cardinality(hits) < 10 then
      hits := hits || array(select f.id from public.fragrances f where f.status = 'approved' and (f.name % raw or folded <% f.search_text));
    end if;
    if cardinality(hits) = 0 then return; end if;
  end if;
  return query
  select f.id, f.name, f.brand, f.year, f.tier, f.olfactory_family, f.gender, f.rating, f.accords, f.image_url,
         count(*) over () as total
  from public.fragrances f
  where f.status = 'approved'
    and (raw is null or f.id = any(hits))
    and (p_family is null or f.tier = p_family or lower(f.olfactory_family) = lower(p_family))
    and (p_house is null or lower(btrim(f.brand)) = lower(btrim(p_house)))
    and (p_year_from is null or f.year >= p_year_from)
    and (p_year_to is null or f.year <= p_year_to)
    and (p_note is null or exists (select 1 from unnest(f.all_notes) n where lower(btrim(n)) = lower(btrim(p_note))))
    and (p_accord is null or exists (select 1 from unnest(f.accords) n where lower(btrim(n)) = lower(btrim(p_accord))))
    and (p_perfumer is null or exists (select 1 from unnest(f.perfumers) n where lower(btrim(n)) = lower(btrim(p_perfumer))))
  order by (case when raw is null then 0 else greatest(similarity(f.name, raw), word_similarity(folded, f.search_text)) end) desc,
           f.priority, f.popularity desc nulls last, f.name
  limit least(greatest(coalesce(p_limit, 24), 1), 60) offset greatest(coalesce(p_offset, 0), 0);
end $$;
revoke all on function public.atlas_search(text, text, text, text, text, text, int, int, int, int) from public, anon;
grant execute on function public.atlas_search(text, text, text, text, text, text, int, int, int, int) to authenticated;

-- ------------------------------------------------------------ contributions
-- A new fragrance from a signed-in user: a pending row (RLS already lets a
-- user add their own pending rows; this adds the limits). At most 100 pending
-- at a time; name unique as the catalog already requires (23505 otherwise).
create function public.atlas_submit(p jsonb) returns uuid
language plpgsql set search_path = public as $$
declare
  nm text := btrim(coalesce(p->>'name', ''));
  br text := nullif(btrim(coalesce(p->>'brand', '')), '');
  tr text := p->>'tier';
  yr int := nullif(p->>'year', '')::int;
  gd text := nullif(p->>'gender', '');
  ct text := nullif(btrim(coalesce(p->>'country', '')), '');
  new_id uuid;
  -- up to `n` trimmed, non-empty items of a JSON array of text, each at most 60 chars
  tops text[]; mids text[]; bases text[]; accs text[]; perf text[];
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if char_length(nm) not between 1 and 120 then raise exception 'name' using errcode = '22023'; end if;
  if br is not null and char_length(br) > 120 then raise exception 'brand' using errcode = '22023'; end if;
  if tr is null or tr not in ('fresh', 'floral', 'woody', 'oriental', 'gourmand') then raise exception 'tier' using errcode = '22023'; end if;
  if yr is not null and yr not between 1700 and extract(year from now())::int + 1 then raise exception 'year' using errcode = '22023'; end if;
  if gd is not null and gd not in ('women', 'men', 'unisex') then raise exception 'gender' using errcode = '22023'; end if;
  if ct is not null and char_length(ct) > 60 then raise exception 'country' using errcode = '22023'; end if;
  if (select count(*) from public.fragrances where added_by = auth.uid() and status = 'pending') >= 100 then
    raise exception 'too many pending' using errcode = '54000';
  end if;
  select array(select left(btrim(x), 60) from jsonb_array_elements_text(coalesce(p->'top_notes', '[]')) x where btrim(x) <> '' limit 15) into tops;
  select array(select left(btrim(x), 60) from jsonb_array_elements_text(coalesce(p->'middle_notes', '[]')) x where btrim(x) <> '' limit 15) into mids;
  select array(select left(btrim(x), 60) from jsonb_array_elements_text(coalesce(p->'base_notes', '[]')) x where btrim(x) <> '' limit 15) into bases;
  select array(select left(btrim(x), 60) from jsonb_array_elements_text(coalesce(p->'accords', '[]')) x where btrim(x) <> '' limit 12) into accs;
  select array(select left(btrim(x), 60) from jsonb_array_elements_text(coalesce(p->'perfumers', '[]')) x where btrim(x) <> '' limit 5) into perf;
  insert into public.fragrances (name, brand, tier, year, gender, country, top_notes, middle_notes, base_notes, accords, perfumers, source, status, added_by)
  values (nm, br, tr, yr::smallint, gd, ct, tops, mids, bases, accs, perf, 'community', 'pending', auth.uid())
  returning id into new_id;
  return new_id;
end $$;
revoke all on function public.atlas_submit(jsonb) from public, anon;
grant execute on function public.atlas_submit(jsonb) to authenticated;

-- --------------------------------------------------------------- moderation
create table public.atlas_reviews (
  id uuid primary key default gen_random_uuid(),
  fragrance_id uuid,
  fragrance_name text not null,
  action text not null check (action in ('approve', 'reject')),
  reviewed_by uuid references auth.users(id) on delete set null default auth.uid(),
  reviewed_at timestamptz not null default now()
);
alter table public.atlas_reviews enable row level security;
create policy atlas_reviews_admin on public.atlas_reviews for select to authenticated using ((select is_admin()));
revoke all on public.atlas_reviews from anon;

-- The queue: pending rows from everyone, oldest first. Admin only.
create function public.atlas_queue() returns setof public.fragrances
language plpgsql security definer set search_path = public as $$
begin
  if not (select is_admin()) then raise exception 'not allowed' using errcode = '42501'; end if;
  return query select * from public.fragrances where status = 'pending' order by created_at limit 200;
end $$;
revoke all on function public.atlas_queue() from public, anon;
grant execute on function public.atlas_queue() to authenticated;

-- Approve, or reject without deleting (the author's own batches, stock and
-- notes keep their link). Admin only; logged.
create function public.atlas_review(p_id uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = public as $$
declare nm text;
begin
  if not (select is_admin()) then raise exception 'not allowed' using errcode = '42501'; end if;
  update public.fragrances set status = case when p_approve then 'approved' else 'rejected' end
   where id = p_id and status = 'pending' returning name into nm;
  if nm is null then raise exception 'not pending' using errcode = 'P0002'; end if;
  insert into public.atlas_reviews (fragrance_id, fragrance_name, action) values (p_id, nm, case when p_approve then 'approve' else 'reject' end);
end $$;
revoke all on function public.atlas_review(uuid, boolean) from public, anon;
grant execute on function public.atlas_review(uuid, boolean) to authenticated;

-- ---------------------------------------------------- community wear counts
alter table public.profiles add column if not exists wear_stats_opt_in boolean not null default false;

-- Anonymous counts for one fragrance from people who opted in. Nothing is
-- shown below 5 people: owners need 5 opted-in owners; wearings and each
-- occasion need 5 opted-in wearers. No user is ever identifiable.
create function public.atlas_wear_stats(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare owners int; wearers int; wearings int; occ jsonb;
begin
  select count(distinct b.user_id) into owners
    from public.wardrobe_bottles b join public.profiles p on p.user_id = b.user_id and p.wear_stats_opt_in
   where b.fragrance_id = p_id and b.status = 'owned';
  if owners < 5 then return jsonb_build_object('shown', false); end if;
  select count(distinct w.user_id), count(*) into wearers, wearings
    from public.wear_log w join public.wardrobe_bottles b on b.id = w.bottle_id
    join public.profiles p on p.user_id = w.user_id and p.wear_stats_opt_in
   where b.fragrance_id = p_id;
  select coalesce(jsonb_object_agg(occasion, n), '{}') into occ from (
    select w.occasion, count(distinct w.user_id) as n
      from public.wear_log w join public.wardrobe_bottles b on b.id = w.bottle_id
      join public.profiles p on p.user_id = w.user_id and p.wear_stats_opt_in
     where b.fragrance_id = p_id and w.occasion is not null
     group by w.occasion having count(distinct w.user_id) >= 5) o;
  return jsonb_build_object('shown', true, 'owners', owners,
    'wearers', case when wearers >= 5 then wearers end, 'wearings', case when wearers >= 5 then wearings end, 'occasions', occ);
end $$;
revoke all on function public.atlas_wear_stats(uuid) from public, anon;
grant execute on function public.atlas_wear_stats(uuid) to authenticated;
