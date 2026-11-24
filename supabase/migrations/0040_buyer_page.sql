-- 0040 · QR buyer page (order queue P1b; owner's answers 2026-11-20).
--
-- A buyer scans the QR on a bottle's label and opens /o/<code> with no
-- sign-in: rates the bottle, leaves a line, says how long it lasts, taps
-- tags, or asks for the same bottle again. Everything goes through /api
-- (api/batches.ts ?resource=buyer) with the service role; the browser
-- writes nothing here.
--
-- 1. seller_orders.buyer_code: an unguessable code per order (122 random
--    bits from gen_random_uuid), the only key the buyer page knows. Existing
--    orders get one too (a volatile default fills every row).
-- 2. status 'requested': an "Order again" from a buyer, waiting for the
--    seller to accept (-> queued) or dismiss (-> cancelled).
--    requested_from points at the bottle it came from.
-- 3. order_feedback: one answer per order, the seller reads it (RLS).
-- 4. profiles.shop_name: the name the buyer sees at the top of the page.
--
-- Additive and re-runnable: new columns, a widened check, a new table.
-- No existing value changes.

alter table public.seller_orders
  add column if not exists buyer_code text not null default replace(gen_random_uuid()::text, '-', '');
create unique index if not exists seller_orders_buyer_code on public.seller_orders (buyer_code);

alter table public.seller_orders
  add column if not exists requested_from uuid references public.seller_orders (id) on delete set null;

alter table public.seller_orders drop constraint if exists seller_orders_status_check;
alter table public.seller_orders add constraint seller_orders_status_check
  check (status in ('requested', 'queued', 'planned', 'resting', 'ready', 'bottled', 'handed_over', 'cancelled'));

comment on column public.seller_orders.buyer_code is
  'Code in the bottle''s QR (0040): /o/<code> opens the buyer page. Never shown to anyone but the buyer of that bottle.';
comment on column public.seller_orders.requested_from is
  'For a buyer''s "Order again" (status requested, 0040): the order whose bottle they scanned.';

create table if not exists public.order_feedback (
  order_id uuid primary key references public.seller_orders (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade, -- the seller
  rating smallint check (rating is null or rating between 1 and 5),
  note text check (note is null or char_length(note) <= 280),
  lasts text check (lasts is null or lasts in ('hours', 'half', 'day')),
  tags text[] not null default '{}' check (cardinality(tags) <= 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (rating is not null or note is not null or lasts is not null or cardinality(tags) > 0)
);
create index if not exists order_feedback_user on public.order_feedback (user_id);

comment on table public.order_feedback is
  'A buyer''s answer about one bottle (0040), sent from the QR page. Written only through /api; the seller reads (RLS).';

alter table public.order_feedback enable row level security;
drop policy if exists order_feedback_read_own on public.order_feedback;
create policy order_feedback_read_own on public.order_feedback for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on table public.order_feedback from anon, authenticated;
grant select on table public.order_feedback to authenticated;

alter table public.profiles
  add column if not exists shop_name text check (shop_name is null or char_length(btrim(shop_name)) between 1 and 60);
comment on column public.profiles.shop_name is
  'Shown at the top of the QR buyer page (0040). Null: the page shows no shop name.';
