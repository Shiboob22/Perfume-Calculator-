-- Undo 0041: back to the three loose answers. Fails while any answer holds
-- one of the hour ranges; clear those lasts values first (DESTRUCTIVE).
alter table public.order_feedback drop constraint if exists order_feedback_lasts_check;
alter table public.order_feedback add constraint order_feedback_lasts_check
  check (lasts is null or lasts in ('hours', 'half', 'day'));
