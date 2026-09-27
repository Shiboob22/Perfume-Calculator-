-- =====================================================================
-- 0005 measured density: a user's own density for an oil.
--
-- The handbook: reference densities are starting points; a measured density
-- always wins. fragrance_notes already holds one row per user per oil
-- (owner-only RLS), so the measurement lives there. Nullable; no data
-- changes.
-- =====================================================================

alter table public.fragrance_notes
  add column measured_density numeric check (measured_density is null or (measured_density > 0.5 and measured_density < 2)),
  add column measured_at timestamptz;
