-- Undo 0038. Fails if any row already uses 'fougere' (move those rows first; nothing is rewritten here).
alter table public.fragrances drop constraint if exists fragrances_tier_check;
alter table public.fragrances add constraint fragrances_tier_check
  check (tier = any (array['fresh','floral','woody','gourmand','oriental']));
alter table public.shared_recipes drop constraint if exists shared_recipes_tier_check;
alter table public.shared_recipes add constraint shared_recipes_tier_check
  check (tier in ('fresh', 'floral', 'woody', 'oriental', 'gourmand'));
alter table public.recipes drop constraint if exists recipes_family_check;
alter table public.recipes add constraint recipes_family_check
  check (family is null or family in ('fresh', 'floral', 'woody', 'oriental', 'gourmand'));
alter table public.wardrobe_bottles drop constraint if exists wardrobe_bottles_family_check;
alter table public.wardrobe_bottles add constraint wardrobe_bottles_family_check
  check (family is null or family in ('fresh', 'floral', 'woody', 'oriental', 'gourmand'));
alter table public.salon_posts drop constraint if exists salon_posts_family_check;
alter table public.salon_posts add constraint salon_posts_family_check
  check (family is null or family in ('fresh', 'floral', 'woody', 'oriental', 'gourmand'));
alter table public.seller_orders drop constraint if exists seller_orders_family_check;
alter table public.seller_orders add constraint seller_orders_family_check
  check (family is null or family in ('fresh', 'floral', 'woody', 'oriental', 'gourmand'));
-- classify_tier() and atlas_submit() are restored from 0020 and 0025 by re-running those definitions.
