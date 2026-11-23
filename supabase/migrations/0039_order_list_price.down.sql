-- Undo 0039. Drops the friend prices' normal prices (the paid price stays).
alter table public.seller_orders drop constraint if exists seller_orders_list_price_check;
alter table public.seller_orders drop column if exists list_price;
