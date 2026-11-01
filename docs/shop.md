# The Shop

A public shop (`/shop`, `/ar/shop`): anyone, signed in or not, adds products to a cart and orders. Payment is by InstaPay; the buyer uploads a screenshot of the transfer; the order is saved and emailed to the owner. Delivery is free. Currency is EGP.

Built 2026-11-01 on `claude/shop`. Behind the `shop` flag (off until switched on).

## How an order flows

1. `GET /api/shop` lists the active rows of `shop_products` (CDN cache 60 s).
2. The cart lives in the buyer's `localStorage` (`kyphira.cart`): product id, option id, quantity. Prices are never stored there.
3. Checkout asks for name, phone, email, city, address and an optional note, shows the total and the InstaPay link and handle (`src/lib/shop/config.js`), and asks for the screenshot. The browser shrinks it (longest side 1600 px, JPEG) so it fits the 4.5 MB request limit.
4. `POST /api/shop` re-prices the cart from `shop_products` (the browser's numbers are ignored), checks the details and the image's bytes (JPEG, PNG or WebP, 2.5 MB at most), stores the screenshot in the private `shop-proofs` bucket, inserts `shop_orders` and `shop_order_items`, and emails the owner with the screenshot attached.
5. The buyer sees an order number (`K-XXXXXX`).

Limits and guards: 8 orders per IP per hour (`LIMITS.shop`), a hidden honeypot field, `SHOP_ENABLED=0` closes the endpoint. If the email fails the order is still saved (`shop_orders.emailed = false`).

## Setting it up

### 1. Products

Edit rows in the Supabase table editor (`shop_products`):

| column | meaning |
|---|---|
| `slug` | unique, lowercase with hyphens |
| `name_en`, `name_ar`, `description_en`, `description_ar` | what the buyer reads |
| `price_egp` | price when the product has no options |
| `variants` | options, each with its own price: `[{"id":"5ml","label_en":"5 mL","label_ar":"٥ مل","price_egp":150}]`. Leave `[]` for none. Option ids must stay stable once orders exist. |
| `image_url` | an `https://` link to a photo, or empty |
| `active` | untick to hide a product |
| `sort` | lower comes first |

Placeholder products for a preview are in `supabase/seed/shop_sample_products.sql` (staging only; do not run on production).

### 2. Email (Resend)

The owner's email is sent through Resend (https://resend.com). It needs an account, which only the owner can create:

1. Sign up at resend.com and create an API key (Sending access).
2. In Vercel (Project, Settings, Environment Variables) add, for Production and Preview:
   - `RESEND_API_KEY` = the key.
   - `SHOP_ORDER_EMAIL` = where orders arrive (defaults to `Hishamshiboob2@gmail.com`).
   - `SHOP_FROM_EMAIL` (optional) = `Kyphira Shop <orders@your-domain>`. Until a domain is verified in Resend, leave it unset: the default `onboarding@resend.dev` only delivers to the Resend account's own email address, so sign up with the address that should receive orders.
3. Redeploy.

Without the key, orders are still saved in `shop_orders` (look there, and open the screenshot in Storage, bucket `shop-proofs`, file `<order number>.<jpg|png|webp>`).

### 3. Turn it on

`vercel env add VITE_FLAG_SHOP production` with value `1`, then redeploy. To turn it off, `vercel env rm VITE_FLAG_SHOP production` and redeploy. To try it on one device first, open any page with `?flag=shop`.

## Handling an order

Each order arrives by email with the screenshot. Check the transfer against InstaPay's own history before shipping: a screenshot can be faked. Then set `shop_orders.status` (`pending`, `paid`, `shipped`, `cancelled`) in the table editor.

## Privacy

`shop_orders` holds a buyer's name, phone, email and address. They are not user accounts' rows (no `user_id`): account deletion and the JSON export do not touch them. `/privacy` needs a paragraph on shop orders and screenshots (owner's lawyer). Screenshots can be deleted from the bucket once an order is closed.

## Not built

An orders page for the owner, buyer confirmation emails, stock counts, shipping fees, order lookup by number.
