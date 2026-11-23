-- Add the sixth blending family, 'fougere' (Aromatic Fougère, e.g. Kouros).
-- Widens every check that lists the families and teaches classify_tier() the new
-- family (same rules as api/_lib/tier.ts: change both together). No existing row is
-- touched: stored tiers stay as they are (owner's rule, 0020), only new inserts and
-- accord changes are classified with the new rule.
alter table public.fragrances drop constraint if exists fragrances_tier_check;
alter table public.fragrances add constraint fragrances_tier_check
  check (tier = any (array['fresh','floral','woody','fougere','gourmand','oriental']));

alter table public.shared_recipes drop constraint if exists shared_recipes_tier_check;
alter table public.shared_recipes add constraint shared_recipes_tier_check
  check (tier in ('fresh', 'floral', 'woody', 'fougere', 'oriental', 'gourmand'));

alter table public.recipes drop constraint if exists recipes_family_check;
alter table public.recipes add constraint recipes_family_check
  check (family is null or family in ('fresh', 'floral', 'woody', 'fougere', 'oriental', 'gourmand'));

alter table public.wardrobe_bottles drop constraint if exists wardrobe_bottles_family_check;
alter table public.wardrobe_bottles add constraint wardrobe_bottles_family_check
  check (family is null or family in ('fresh', 'floral', 'woody', 'fougere', 'oriental', 'gourmand'));

alter table public.salon_posts drop constraint if exists salon_posts_family_check;
alter table public.salon_posts add constraint salon_posts_family_check
  check (family is null or family in ('fresh', 'floral', 'woody', 'fougere', 'oriental', 'gourmand'));

alter table public.seller_orders drop constraint if exists seller_orders_family_check;
alter table public.seller_orders add constraint seller_orders_family_check
  check (family is null or family in ('fresh', 'floral', 'woody', 'fougere', 'oriental', 'gourmand'));

create or replace function public.classify_tier(accords text[])
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when exists (select 1 from unnest(accords) a where lower(a) like any (array['%vanilla%','%sweet%','%gourmand%','%caramel%','%chocolate%','%honey%','%praline%','%tobacco%'])) then 'gourmand'
    when exists (select 1 from unnest(accords) a where lower(a) like any (array['%aromatic%','%lavender%','%fougere%','%fougère%','%herbal%'])) then 'fougere'
    when exists (select 1 from unnest(accords) a where lower(a) like any (array['%amber%','%oriental%','%warm spicy%','%balsamic%','%resinous%','%oud%','%spicy%'])) then 'oriental'
    when exists (select 1 from unnest(accords) a where lower(a) like any (array['%floral%','%powdery%','%rose%','%white floral%'])) then 'floral'
    when exists (select 1 from unnest(accords) a where lower(a) like any (array['%woody%','%earthy%','%mossy%'])) then 'woody'
    else 'fresh'
  end;
$$;

-- atlas_submit validated the tier against the old five; same body, six families. Grants are kept.
create or replace function public.atlas_submit(p jsonb) returns uuid
language plpgsql set search_path = public as $$
declare
  nm text := btrim(coalesce(p->>'name', ''));
  br text := nullif(btrim(coalesce(p->>'brand', '')), '');
  tr text := p->>'tier';
  yr int := nullif(p->>'year', '')::int;
  gd text := nullif(p->>'gender', '');
  ct text := nullif(btrim(coalesce(p->>'country', '')), '');
  new_id uuid;
  -- up to `n` trimmed, non-empty items of a JSON array of text, each at most 60 chars
  tops text[]; mids text[]; bases text[]; accs text[]; perf text[];
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if char_length(nm) not between 1 and 120 then raise exception 'name' using errcode = '22023'; end if;
  if br is not null and char_length(br) > 120 then raise exception 'brand' using errcode = '22023'; end if;
  if tr is null or tr not in ('fresh', 'floral', 'woody', 'fougere', 'oriental', 'gourmand') then raise exception 'tier' using errcode = '22023'; end if;
  if yr is not null and yr not between 1700 and extract(year from now())::int + 1 then raise exception 'year' using errcode = '22023'; end if;
  if gd is not null and gd not in ('women', 'men', 'unisex') then raise exception 'gender' using errcode = '22023'; end if;
  if ct is not null and char_length(ct) > 60 then raise exception 'country' using errcode = '22023'; end if;
  if (select count(*) from public.fragrances where added_by = auth.uid() and status = 'pending') >= 100 then
    raise exception 'too many pending' using errcode = '54000';
  end if;
  select array(select left(btrim(x), 60) from jsonb_array_elements_text(coalesce(p->'top_notes', '[]')) x where btrim(x) <> '' limit 15) into tops;
  select array(select left(btrim(x), 60) from jsonb_array_elements_text(coalesce(p->'middle_notes', '[]')) x where btrim(x) <> '' limit 15) into mids;
  select array(select left(btrim(x), 60) from jsonb_array_elements_text(coalesce(p->'base_notes', '[]')) x where btrim(x) <> '' limit 15) into bases;
  select array(select left(btrim(x), 60) from jsonb_array_elements_text(coalesce(p->'accords', '[]')) x where btrim(x) <> '' limit 12) into accs;
  select array(select left(btrim(x), 60) from jsonb_array_elements_text(coalesce(p->'perfumers', '[]')) x where btrim(x) <> '' limit 5) into perf;
  insert into public.fragrances (name, brand, tier, year, gender, country, top_notes, middle_notes, base_notes, accords, perfumers, source, status, added_by)
  values (nm, br, tr, yr::smallint, gd, ct, tops, mids, bases, accs, perf, 'community', 'pending', auth.uid())
  returning id into new_id;
  return new_id;
end $$;
