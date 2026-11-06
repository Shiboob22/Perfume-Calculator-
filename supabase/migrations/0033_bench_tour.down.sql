-- Undo 0033. DESTRUCTIVE (small): drops when each user saw the Bench tour, so it would start again for everyone.
alter table public.profiles drop column if exists bench_tour_at;
