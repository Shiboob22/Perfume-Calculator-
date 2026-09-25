-- =====================================================================
-- Fragrantica/Parfumo-style detail fields for the catalog (2026-09-25).
-- Filled from the same public datasets as the bulk import (Fragrantica
-- dataset + HF doevent/perfume); curated rows only get EMPTY fields filled.
--
--   brand             house name as published ("Dior", "Maison Francis Kurkdjian")
--   gender            'women' | 'men' | 'unisex'
--   year              launch year
--   rating            Fragrantica community rating, 1–5 (votes = popularity)
--   perfumers         noses credited with the composition
--   olfactory_family  Fragrantica's group, e.g. "Amber Vanilla", "Woody Aromatic"
--   country           brand country
--   image_url         (existing column) bottle photo; Fragrantica rows point at
--                     fimgs.net/mdimg/perfume/375x500.<fragrantica id>.jpg
-- =====================================================================

alter table fragrances add column if not exists brand text;
alter table fragrances add column if not exists gender text
  check (gender is null or gender in ('women', 'men', 'unisex'));
alter table fragrances add column if not exists year smallint;
alter table fragrances add column if not exists rating numeric(3, 2)
  check (rating is null or rating between 1 and 5);
alter table fragrances add column if not exists perfumers text[];
alter table fragrances add column if not exists olfactory_family text;
alter table fragrances add column if not exists country text;

-- "More from this house" and brand filtering.
create index if not exists fragrances_brand_idx on fragrances (brand);
-- Similar-fragrance lookups match on shared accords.
create index if not exists fragrances_accords_idx on fragrances using gin (accords);
