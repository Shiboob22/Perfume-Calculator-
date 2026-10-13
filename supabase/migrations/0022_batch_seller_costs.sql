-- Seller layer: what a batch cost to make and what it sells for, kept on the
-- batch so the Journal can show margin later. All optional; the API only
-- stores them for plans with calculator.advanced (Pro) and drops them
-- otherwise. Prices are per unit named in the column; money is in `currency`
-- (ISO 4217 code, as chosen by the user; no conversion anywhere).
-- Additive and nullable: existing rows are untouched.

alter table public.batches
  add column ethanol_price_per_l numeric,
  add column bottle_cost         numeric,
  add column bottles             integer,
  add column packaging_cost      numeric,
  add column labour_minutes      numeric,
  add column labour_rate_per_hour numeric,
  add column sale_price          numeric,
  add column currency            text;

alter table public.batches
  add constraint batches_seller_costs_sane check (
    (ethanol_price_per_l  is null or ethanol_price_per_l  between 0 and 1000000) and
    (bottle_cost          is null or bottle_cost          between 0 and 1000000) and
    (bottles              is null or bottles              between 0 and 100000) and
    (packaging_cost       is null or packaging_cost       between 0 and 1000000) and
    (labour_minutes       is null or labour_minutes       between 0 and 100000) and
    (labour_rate_per_hour is null or labour_rate_per_hour between 0 and 1000000) and
    (sale_price           is null or sale_price           between 0 and 10000000) and
    (currency             is null or currency ~ '^[A-Z]{3}$')
  );
