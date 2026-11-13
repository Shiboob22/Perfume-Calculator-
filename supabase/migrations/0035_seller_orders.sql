-- 0035 · Order queue, Phase A (spec: docs/order-queue/Kyphira-Order-Queue_Brief_v2.md).
--
-- seller_orders: one bottle a seller has promised to a buyer (taken in
-- person). The queue groups open orders by scent + strength into mixes;
-- the arithmetic is in src/lib/calc/orderPlan.ts, not here.
--
-- Pro only (`orders` feature). Like batches and inventory since 0011, the
-- table is written only through /api (api/batches.ts ?resource=orders),
-- where the Pro gate, the per-user cap and validation live: the browser
-- may read its own rows (owner-only RLS, for the data export) and write
-- none. Buyer name and contact are third-party personal data: they leave
-- with the account (ON DELETE CASCADE) and are in the export.
--
-- Additive and re-runnable: a new table and one feature on the Pro plan.
-- No existing row changes.

create table if not exists public.seller_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  buyer_name text not null check (char_length(btrim(buyer_name)) between 1 and 120),
  buyer_contact text check (buyer_contact is null or char_length(buyer_contact) <= 120),
  -- The scent: a saved formula version, a catalog fragrance, or typed text
  -- (typed-only can be queued but not planned).
  recipe_version_id uuid references public.recipe_versions (id) on delete set null,
  fragrance_id uuid references public.fragrances (id) on delete set null,
  scent_text text not null check (char_length(btrim(scent_text)) between 1 and 120),
  family text check (family is null or family in ('fresh', 'floral', 'woody', 'oriental', 'gourmand')),
  size_ml numeric not null check (size_ml > 0 and size_ml <= 1000),
  strength_pct numeric not null check (strength_pct > 0 and strength_pct < 100),
  price numeric check (price is null or (price >= 0 and price <= 1000000)),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  wanted_by date,
  note text check (note is null or char_length(note) <= 500),
  status text not null default 'queued'
    check (status in ('queued', 'planned', 'resting', 'ready', 'bottled', 'handed_over', 'cancelled')),
  group_mode text not null default 'mix' check (group_mode in ('mix', 'separate')),
  -- Phase B links the logged batch; kept if the batch is deleted later.
  batch_id uuid references public.batches (id) on delete set null,
  bottled_at timestamptz,
  handed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists seller_orders_user_status on public.seller_orders (user_id, status, wanted_by);
create index if not exists seller_orders_batch on public.seller_orders (batch_id) where batch_id is not null;

comment on table public.seller_orders is
  'Order queue (0035): bottles a seller promised to buyers. Written only through /api; owner reads (RLS).';

alter table public.seller_orders enable row level security;
drop policy if exists seller_orders_read_own on public.seller_orders;
create policy seller_orders_read_own on public.seller_orders for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on table public.seller_orders from anon, authenticated;
grant select on table public.seller_orders to authenticated;

-- The Pro plan gains the order queue.
update public.plans
   set features = array_append(features, 'orders')
 where id = 'pro' and not ('orders' = any (features));
