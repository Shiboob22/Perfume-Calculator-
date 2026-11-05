-- 0032 · Bench SaaS Phase 4: what was poured of each material of a blend.
--
-- batches.pours: null for a simple formula (its one pour is actual_oil_g),
-- else an array, one entry per material in pour order:
--   { name, type, pct, target_g, actual_g }
-- target_g is the target bench mode showed (after any over-pour scaling),
-- actual_g what the scale read. Written only through /api/batches (0011),
-- which checks each entry; the constraint keeps the shape honest.
-- Additive and re-runnable: no existing row changes.

alter table public.batches add column if not exists pours jsonb;

alter table public.batches drop constraint if exists batches_pours_shape;
alter table public.batches add constraint batches_pours_shape check (
  pours is null
  or (jsonb_typeof(pours) = 'array' and jsonb_array_length(pours) between 1 and 30)
);

comment on column public.batches.pours is
  'Blend batches: per material {name, type, pct, target_g, actual_g}, in pour order (0032).';
