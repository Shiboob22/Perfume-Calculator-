-- The Nose asks for the 300 most popular approved fragrances sharing an
-- accord. With no index on popularity alone, Postgres read the whole catalog
-- and sorted it (3.7 s on production, 2026-10-15). This index lets it walk
-- approved rows from the most popular down and stop at 300.
-- Additive: no data changes.
create index if not exists fragrances_approved_popularity_idx
  on public.fragrances (popularity desc nulls last)
  where status = 'approved';
