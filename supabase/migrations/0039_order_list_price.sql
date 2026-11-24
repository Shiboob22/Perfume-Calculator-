-- 0039 · Friend price on an order.
--
-- seller_orders.price stays what the buyer pays. list_price is the normal
-- price when the seller gave a friend price, so History can add up what
-- the discounts cost. Null = no friend price. Additive and re-runnable:
-- one nullable column and its check; no existing row changes.

alter table public.seller_orders add column if not exists list_price numeric;

alter table public.seller_orders drop constraint if exists seller_orders_list_price_check;
alter table public.seller_orders add constraint seller_orders_list_price_check
  check (list_price is null or (list_price >= 0 and list_price <= 1000000 and (price is null or list_price >= price)));

comment on column public.seller_orders.list_price is
  'Normal price when the order was a friend price (0039); price is what the buyer pays. Null = no discount.';
