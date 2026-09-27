-- =====================================================================
-- 0004 batch basis: record how each batch was calculated.
--
-- A batch's concentration_pct meant "by volume" for mL / fl oz batches and
-- "by weight" for g / oz ones, but nothing recorded which — so history and
-- the batch card had to assume volume. New batches store the basis and the
-- two densities used. All columns are nullable: existing batches stay as
-- they are and read as "basis unknown". No data changes.
-- =====================================================================

alter table public.batches
  add column basis text check (basis is null or basis in ('volume', 'weight')),
  add column oil_density numeric check (oil_density is null or oil_density > 0),
  add column ethanol_density numeric check (ethanol_density is null or ethanol_density > 0);
