-- 0033 · Bench SaaS Phase 7: the Bench's guided tour, seen or not.
--
-- profiles.bench_tour_at: when this user finished or skipped the tour.
-- Null = not yet, so the tour starts by itself on their first visit to the
-- Bench (once per user, on any device). Signed-out or offline, the browser
-- keeps the same fact in localStorage. Written by the user's own session
-- (profiles is owner-only under RLS, 0007). Additive and re-runnable: no
-- existing row changes.

alter table public.profiles add column if not exists bench_tour_at timestamptz;

comment on column public.profiles.bench_tour_at is
  'When the user finished or skipped the Bench tour; null = not yet (0033).';
