-- MADE-UP batches for testing the batch-number backfill (0031) on STAGING.
-- Not a migration: never run this on production. Re-runnable (fixed ids,
-- on conflict do nothing). Three throwaway users on example.test:
--   seed-a: 5 batches, two poured on the same day, two of them saved in
--           the same instant (the id decides);
--   seed-b: 3 batches, all poured on the same day;
--   seed-c: 1 batch.
-- Expected numbering after 0031 (oldest poured first, then created_at,
-- then id):
--   seed-a  …a101 1, …a102 2, …a103 3, …a104 4, …a105 5
--   seed-b  …b201 1, …b202 2, …b203 3
--   seed-c  …c301 1
-- Once 0031 is applied, the insert trigger numbers new rows in insert order,
-- so to test the backfill again: run this file, then
--   update public.batches set batch_no = null where user_id in
--     (select id from auth.users where email like 'seed-%@example.test');
-- and run 0031 again (it only numbers rows whose batch_no is null).
-- Remove everything it made:
--   delete from auth.users where email like 'seed-%@example.test';
-- (every user table cascades from auth.users).

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-4000-8000-00000000a000', 'seed-a@example.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-00000000b000', 'seed-b@example.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-00000000c000', 'seed-c@example.test', 'authenticated', 'authenticated')
on conflict (id) do nothing;

-- Rows are listed out of order on purpose: the numbering must not depend
-- on insert order.
insert into public.batches (id, user_id, fragrance_name, tier, blend_date, created_at, concentration_pct,
                            oil_g, oil_ml, ethanol_g, ethanol_ml, total_g, total_ml) values
  -- seed-a
  ('00000000-0000-4000-8000-00000000a105', '00000000-0000-4000-8000-00000000a000', 'Amber Room',    'oriental', '2026-10-28', '2026-10-28 09:00+00', 30, 14.25, 15, 28.35, 35, 42.60, 50),
  ('00000000-0000-4000-8000-00000000a103', '00000000-0000-4000-8000-00000000a000', 'Neroli Eau',    'fresh',    '2026-10-21', '2026-10-21 18:30+00', 20, 19.00, 20, 64.80, 80, 83.80, 100),
  ('00000000-0000-4000-8000-00000000a101', '00000000-0000-4000-8000-00000000a000', 'Tonka Praline', 'gourmand', '2026-07-10', '2026-07-12 08:00+00', 25, 11.88, 12.5, 30.38, 37.5, 42.25, 50),
  -- poured the same day as a103, saved in the same instant: the id decides (a103 before a104)
  ('00000000-0000-4000-8000-00000000a104', '00000000-0000-4000-8000-00000000a000', 'Santal Dry',    'woody',    '2026-10-21', '2026-10-21 18:30+00', 22,  6.27, 6.6, 18.95, 23.4, 25.22, 30),
  -- poured before a103/a104 but logged after them (late entry): poured date wins
  ('00000000-0000-4000-8000-00000000a102', '00000000-0000-4000-8000-00000000a000', 'Tuberose Soir', 'floral',   '2026-08-01', '2026-10-30 10:00+00', 18,  8.55, 9, 33.21, 41, 41.76, 50),
  -- seed-b: three on one day, ordered by created_at
  ('00000000-0000-4000-8000-00000000b203', '00000000-0000-4000-8000-00000000b000', 'Fig Leaf',      'fresh',    '2026-09-01', '2026-09-01 12:00+00', 15,  4.28, 4.5, 20.66, 25.5, 24.94, 30),
  ('00000000-0000-4000-8000-00000000b201', '00000000-0000-4000-8000-00000000b000', 'Oud Nights',    'woody',    '2026-09-01', '2026-09-01 10:00+00', 30, 14.25, 15, 28.35, 35, 42.60, 50),
  ('00000000-0000-4000-8000-00000000b202', '00000000-0000-4000-8000-00000000b000', 'Rose Smoke',    'floral',   '2026-09-01', '2026-09-01 11:00+00', 25, 11.88, 12.5, 30.38, 37.5, 42.25, 50),
  -- seed-c
  ('00000000-0000-4000-8000-00000000c301', '00000000-0000-4000-8000-00000000c000', 'Vetiver Cut',   'woody',    '2026-10-01', '2026-10-01 09:00+00', 20,  9.50, 10, 32.40, 40, 41.90, 50)
on conflict (id) do nothing;
