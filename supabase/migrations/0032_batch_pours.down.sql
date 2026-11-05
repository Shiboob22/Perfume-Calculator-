-- Undo 0032. DESTRUCTIVE: drops the per-material pours of every blend batch.
alter table public.batches drop constraint if exists batches_pours_shape;
alter table public.batches drop column if exists pours;
