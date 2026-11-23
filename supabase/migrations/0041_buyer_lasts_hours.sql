-- The QR buyer page's "How long does it last on you?" answers become five
-- hour ranges (owner, 2026-11-20): under 2, 2-4, 4-8, 8-12, more than 12.
-- No buyer had answered when this ran (0 rows with lasts on production and
-- staging); an old value left anywhere would make the new check fail.
alter table public.order_feedback drop constraint if exists order_feedback_lasts_check;
alter table public.order_feedback add constraint order_feedback_lasts_check
  check (lasts is null or lasts in ('under2', 'h2to4', 'h4to8', 'h8to12', 'over12'));
