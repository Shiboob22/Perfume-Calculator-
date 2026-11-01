-- The Shop: products anyone can read, and orders placed without an account.
-- Orders are paid by InstaPay; the buyer uploads a screenshot of the transfer.
--
-- shop_products  public read (active rows only); written by the owner in the
--                dashboard or SQL, never from the browser.
-- shop_orders / shop_order_items
--                no policies and no grants for anon or authenticated: they are
--                read and written only through api/shop.ts (service role), which
--                re-prices every cart from shop_products. They hold a buyer's
--                name, phone, email and address, so they are NOT user-owned rows
--                (no user_id, nothing to export or cascade on account deletion).
-- shop-proofs    private storage bucket for the transfer screenshots; no policies,
--                so only the service role can read or write it.

create table public.shop_products (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 60),
  name_en        text not null check (length(name_en) between 1 and 120),
  name_ar        text not null check (length(name_ar) between 1 and 120),
  description_en text not null default '' check (length(description_en) <= 1000),
  description_ar text not null default '' check (length(description_ar) <= 1000),
  image_url      text check (image_url is null or image_url ~ '^https://'),
  price_egp      numeric(10,2) not null check (price_egp >= 0 and price_egp <= 1000000),
  -- Options with their own price: [{ "id": "30ml", "label_en": "30 mL", "label_ar": "٣٠ مل", "price_egp": 450 }].
  -- When empty, price_egp is the price. Validated by the shape check below.
  variants       jsonb not null default '[]'::jsonb
                 check (jsonb_typeof(variants) = 'array' and jsonb_array_length(variants) <= 12),
  active         boolean not null default true,
  sort           integer not null default 0,
  created_at     timestamptz not null default now()
);

alter table public.shop_products enable row level security;
create policy shop_products_read on public.shop_products for select to anon, authenticated using (active);
revoke all on public.shop_products from anon, authenticated;
grant select on public.shop_products to anon, authenticated;

create table public.shop_orders (
  id          uuid primary key default gen_random_uuid(),
  order_no    text not null unique check (order_no ~ '^K-[A-Z0-9]{6}$'),
  name        text not null check (length(name) between 2 and 100),
  phone       text not null check (length(phone) between 7 and 20),
  email       text not null check (length(email) between 5 and 254),
  city        text not null check (length(city) between 2 and 80),
  address     text not null check (length(address) between 5 and 300),
  note        text check (note is null or length(note) <= 500),
  lang        text not null default 'en' check (lang in ('en', 'ar')),
  total_egp   numeric(10,2) not null check (total_egp >= 0),
  -- pending: placed, payment not yet checked. The owner moves it on by hand.
  status      text not null default 'pending' check (status in ('pending', 'paid', 'shipped', 'cancelled')),
  proof_path  text not null,
  emailed     boolean not null default false,
  created_at  timestamptz not null default now()
);

create table public.shop_order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.shop_orders(id) on delete cascade,
  product_id    uuid references public.shop_products(id) on delete set null,
  -- What the buyer saw, kept as text so later edits to the product don't rewrite the order.
  name          text not null,
  variant_label text,
  unit_price    numeric(10,2) not null check (unit_price >= 0),
  qty           integer not null check (qty between 1 and 20)
);
create index shop_order_items_order_idx on public.shop_order_items (order_id);
create index shop_orders_created_idx on public.shop_orders (created_at desc);

alter table public.shop_orders enable row level security;
alter table public.shop_order_items enable row level security;
revoke all on public.shop_orders, public.shop_order_items from anon, authenticated;

insert into storage.buckets (id, name, public) values ('shop-proofs', 'shop-proofs', false)
on conflict (id) do nothing;
