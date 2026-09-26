-- =====================================================================
-- Catalog ranking + fast name search, for the ~80k-row public import
-- (Fragrantica + the doevent/perfume dataset, 2026-09-25).
--
-- With tens of thousands of rows, `name ilike '%q%' limit 10` returns an
-- arbitrary 10 of possibly hundreds of matches ("dior" matches ~1,000).
-- Search now orders by:
--   1. priority   — 1 for everything the app or the user added (curated,
--                   custom, Parfumo scrapes, Gemini saves), 0 for bulk-
--                   imported rows, so the import never buries your own list
--   2. popularity — Fragrantica rating count (how many people rated it)
-- =====================================================================

create extension if not exists pg_trgm with schema extensions;

alter table fragrances add column if not exists popularity integer;

alter table fragrances add column if not exists priority smallint
  generated always as (
    case when source in ('Fragrantica', 'Perfume dataset') then 0 else 1 end
  ) stored;

-- Substring search (ilike '%q%') via trigrams instead of a full scan.
create index if not exists fragrances_name_trgm_idx
  on fragrances using gin (name extensions.gin_trgm_ops);

create index if not exists fragrances_rank_idx
  on fragrances (priority desc, popularity desc nulls last);

-- Popular shelf (/api/search?popular=1): most-rated perfumes with a photo.
-- Without this the query sorts the whole catalog (~45 ms); with it, ~3 ms.
create index if not exists fragrances_popular_photo_idx
  on public.fragrances (popularity desc nulls last)
  where image_url is not null;
