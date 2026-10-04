-- 0015 — The batch record (Phase 8). Additive; existing rows are untouched.
--
-- lot:    the lot or batch code the user writes on the bottle (bench mode
--         asked for it before but could only put it in notes).
-- amount, unit: the bottle as the user entered it (50 g, 3.4 fl oz), so a
--         label or "Make again" shows the same size, not a converted one.
-- All nullable: old batches have none of them.

alter table public.batches
  add column if not exists lot text,
  add column if not exists amount numeric,
  add column if not exists unit text;

alter table public.batches
  add constraint batches_lot_len check (lot is null or char_length(lot) between 1 and 60),
  add constraint batches_amount_range check (amount is null or (amount > 0 and amount <= 100000)),
  add constraint batches_unit_known check (unit is null or unit in ('ml', 'floz', 'g', 'oz'));
