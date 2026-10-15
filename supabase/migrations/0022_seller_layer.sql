-- 0022 — The seller layer (Phase 11). Additive; no existing row changes.
--
-- Owner decision 2026-10-10: the DIY bench stays the core; small-batch
-- sellers are an opt-in layer. Free keeps saving and reusing formulations;
-- Pro adds cost, packaging, labour and margin.
--
-- batches: the cost inputs a batch was priced with, so a logged batch keeps
--   its own cost and margin (before, only price_per_gram and oil_cost were
--   stored). All optional; written only through /api/batches, which drops
--   them on a plan without `calculator.advanced`.
--     ethanol_price_per_l  alcohol price per litre
--     bottle_cost          one bottle, as bought
--     bottles              bottles filled from the batch
--     packaging_cost       box, label, atomizer… per bottle
--     labour_minutes       time spent on the batch
--     labour_rate          price of an hour of that time
--     sale_price           price one bottle is sold for
--     currency             ISO 4217 code of all the money fields above
-- profiles: the seller switch and the currency (an owner-only row under RLS,
--   unchanged). is_seller shows the sale price, packaging and labour fields;
--   it never gates anything on the server.

alter table public.batches
  add column if not exists ethanol_price_per_l numeric,
  add column if not exists bottle_cost numeric,
  add column if not exists bottles integer,
  add column if not exists packaging_cost numeric,
  add column if not exists labour_minutes numeric,
  add column if not exists labour_rate numeric,
  add column if not exists sale_price numeric,
  add column if not exists currency text;

alter table public.batches
  add constraint batches_ethanol_price_range check (ethanol_price_per_l is null or (ethanol_price_per_l >= 0 and ethanol_price_per_l <= 1000000)),
  add constraint batches_bottle_cost_range check (bottle_cost is null or (bottle_cost >= 0 and bottle_cost <= 1000000)),
  add constraint batches_bottles_range check (bottles is null or (bottles >= 0 and bottles <= 100000)),
  add constraint batches_packaging_cost_range check (packaging_cost is null or (packaging_cost >= 0 and packaging_cost <= 1000000)),
  add constraint batches_labour_minutes_range check (labour_minutes is null or (labour_minutes >= 0 and labour_minutes <= 100000)),
  add constraint batches_labour_rate_range check (labour_rate is null or (labour_rate >= 0 and labour_rate <= 1000000)),
  add constraint batches_sale_price_range check (sale_price is null or (sale_price >= 0 and sale_price <= 1000000)),
  add constraint batches_currency_code check (currency is null or currency ~ '^[A-Z]{3}$');

alter table public.profiles
  add column if not exists is_seller boolean not null default false,
  add column if not exists currency text;

alter table public.profiles
  add constraint profiles_currency_code check (currency is null or currency ~ '^[A-Z]{3}$');
