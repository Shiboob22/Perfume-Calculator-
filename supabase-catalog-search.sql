-- =====================================================================
-- Forgiving catalog search (2026-09-25).
--
-- search_text: the name lowercased, accents and apostrophes removed, so
-- "lancome", "lancôme" and "Lancôme" all match, as do "lhomme"/"l'homme".
-- The API splits a query into words and requires every word to appear
-- (any order), so "sauvage dior" finds "Dior Sauvage".
--
-- search_fragrances_fuzzy(): typo-tolerant fallback when that finds nothing
-- ("aventis" -> Aventus, "bacarat rouge" -> Baccarat Rouge 540), using
-- pg_trgm word similarity on the same column.
-- =====================================================================

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- unaccent() is only STABLE (its dictionary could change), so it can't feed a
-- generated column directly; pinning the dictionary makes this wrapper safe to
-- declare IMMUTABLE.
create or replace function public.immutable_unaccent(text) returns text
language sql immutable parallel safe strict
set search_path = ''
as $$ select extensions.unaccent('extensions.unaccent'::regdictionary, $1) $$;

alter table fragrances add column if not exists search_text text
  generated always as (
    regexp_replace(lower(public.immutable_unaccent(name)), '[''’`]', '', 'g')
  ) stored;

create index if not exists fragrances_search_text_trgm_idx
  on fragrances using gin (search_text extensions.gin_trgm_ops);

-- Read-only, runs with the caller's rights (RLS applies as usual).
-- Ranking: closeness of the match, plus a small bonus for your own rows and for
-- well-known perfumes (log of Fragrantica votes), so "aventis" ranks Creed
-- Aventus above an obscure "Aventinus" that is marginally closer as a string.
create or replace function public.search_fragrances_fuzzy(q text, lim integer default 20)
returns setof fragrances
language sql stable
set search_path = public, extensions
as $$
  select f.*
  from fragrances f
  where q <% f.search_text
  order by word_similarity(q, f.search_text)
           + 0.10 * f.priority
           + 0.05 * log(1 + coalesce(f.popularity, 0)) desc
  limit least(greatest(lim, 1), 50)
$$;

-- ---------------------------------------------------------------------
-- Browse by note: all three pyramid levels in one array, so "perfumes with
-- Bergamot" is a single indexed containment query (all_notes @> '{Bergamot}').
-- ---------------------------------------------------------------------
alter table fragrances add column if not exists all_notes text[]
  generated always as (
    coalesce(top_notes, '{}') || coalesce(middle_notes, '{}') || coalesce(base_notes, '{}')
  ) stored;

create index if not exists fragrances_all_notes_idx on fragrances using gin (all_notes);
