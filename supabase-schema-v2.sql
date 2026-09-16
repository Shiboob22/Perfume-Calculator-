-- =====================================================================
-- The Scent Handbook — unified schema (v2)
-- Run this in the Supabase SQL Editor. Replaces the fragmented setup
-- where the fragrance database lived only in the HTML tool's source
-- code and personal notes lived only in browser localStorage.
--
-- This does NOT touch the existing `perfumes` table from the scraper
-- backend (Fragrantica-style note/accord data) — that stays separate
-- and can be linked in later if useful. These four tables are the new
-- "single source of truth" for the calculator side of the system.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- fragrances: the curated name -> family classification database.
-- Replaces the hardcoded 468-entry array in the HTML tool.
-- ---------------------------------------------------------------------
create table if not exists fragrances (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  tier text not null check (tier in ('fresh','floral','woody','gourmand','oriental')),
  source text not null default 'curated', -- 'curated' | 'custom' (added via the app)
  created_at timestamptz not null default now()
);

create index if not exists fragrances_name_search_idx
  on fragrances using gin (to_tsvector('english', name));

-- ---------------------------------------------------------------------
-- fragrance_notes: personal annotations per fragrance — was
-- localStorage-only before, now synced across devices.
-- ---------------------------------------------------------------------
create table if not exists fragrance_notes (
  fragrance_id uuid primary key references fragrances(id) on delete cascade,
  oil_type text,
  price_per_gram numeric,
  notes text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- batches: production history — every blend actually made, not just
-- calculated. fragrance_name is a denormalized snapshot so history
-- survives even if the fragrance is later renamed or removed.
-- ---------------------------------------------------------------------
create table if not exists batches (
  id uuid primary key default gen_random_uuid(),
  fragrance_id uuid references fragrances(id) on delete set null,
  fragrance_name text not null,
  tier text not null,
  blend_date date not null default current_date,
  concentration_pct numeric not null,
  oil_g numeric not null,
  oil_ml numeric not null,
  ethanol_g numeric not null,
  ethanol_ml numeric not null,
  total_g numeric not null,
  total_ml numeric not null,
  oil_type text,
  price_per_gram numeric,
  oil_cost numeric,
  notes text,
  blended_by text,
  created_at timestamptz not null default now()
);

create index if not exists batches_date_idx on batches (blend_date desc);
create index if not exists batches_fragrance_idx on batches (fragrance_id);

-- ---------------------------------------------------------------------
-- inventory: stock on hand per fragrance oil. One row per fragrance
-- that has ever been stocked. Decremented automatically when a batch
-- is logged (handled in the app, not a DB trigger — keeps the logic
-- visible and easy to adjust rather than hidden in SQL).
-- ---------------------------------------------------------------------
create table if not exists inventory (
  fragrance_id uuid primary key references fragrances(id) on delete cascade,
  stock_g numeric not null default 0,
  low_stock_threshold_g numeric not null default 10,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Row Level Security
--
-- This project is single-user (you hold the only URL/anon key), so
-- these policies grant full read/write to the anon key on all four
-- tables. That is NOT an appropriate pattern for a public, multi-user
-- app — it's appropriate here specifically because nobody else has
-- access to this Supabase project's credentials.
-- ---------------------------------------------------------------------
alter table fragrances enable row level security;
alter table fragrance_notes enable row level security;
alter table batches enable row level security;
alter table inventory enable row level security;

create policy "rw_fragrances" on fragrances for all using (true) with check (true);
create policy "rw_fragrance_notes" on fragrance_notes for all using (true) with check (true);
create policy "rw_batches" on batches for all using (true) with check (true);
create policy "rw_inventory" on inventory for all using (true) with check (true);
