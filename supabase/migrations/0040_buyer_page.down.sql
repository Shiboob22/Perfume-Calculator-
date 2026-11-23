-- Undo 0040. DESTRUCTIVE: drops every buyer's feedback, every buyer code
-- (printed QR codes stop working) and every shop name; requested orders
-- must be accepted or dismissed first or the status check fails.
alter table public.profiles drop column if exists shop_name;
drop table if exists public.order_feedback;
alter table public.seller_orders drop constraint if exists seller_orders_status_check;
alter table public.seller_orders add constraint seller_orders_status_check
  check (status in ('queued', 'planned', 'resting', 'ready', 'bottled', 'handed_over', 'cancelled'));
alter table public.seller_orders drop column if exists requested_from;
drop index if exists public.seller_orders_buyer_code;
alter table public.seller_orders drop column if exists buyer_code;
