-- 0038 · Family from the stated olfactory group and position-weighted accords
--
-- Since 0020 a fragrance's family (`tier`) was re-derived from its accords by
-- classify_tier(), where any single accord decided it: "sweet" or "vanilla"
-- anywhere in the list meant gourmand. Run over the catalogue that rule files
-- 47 % of it under gourmand (Tom Ford Oud Wood, Creed Aventus, YSL Kouros), so
-- the owner declined a backfill on 2026-10-10 and stored families stayed as
-- an older import left them.
--
-- New rule, classify_family(accords, olfactory_family):
--   * each accord votes for one family; accords are stored strongest first,
--     so the vote fades with position (100, 80, 64, 51, 41, 33, 26, 21, 17,
--     13, then 10), doubled for a telling accord and single for the broad
--     modifiers (sweet, powdery, fruity, aromatic, fresh, fresh spicy);
--   * the stated group ("Amber Woody", "Aromatic Fougere") adds one vote of
--     200, a leading accord at full weight: Floral → floral; Amber → oriental;
--     Woody, Chypre, Leather → woody; Citrus, Aromatic → fresh; any group
--     naming Gourmand, Vanilla or Tobacco → gourmand;
--   * most points wins; a tie goes to the family heard first.
--   Null when neither says anything: the row keeps the family it has.
-- Same rules as classifyFamily() in api/_lib/tier.ts (change both together;
-- supabase/tests/family_rule.sql and api/_lib/tier.test.ts hold one checksum).
--
-- classify_tier(accords) stays, now the same vote without a group and with
-- the old 'fresh' fallback. The trigger also fires when the group changes.
--
-- Data: every catalogue row whose family differs from the rule's answer is
-- updated (about 24,900 of 81,800 on 2026-11-14). User-typed rows
-- (source 'custom') are left alone. The family each changed row had is kept
-- in catalog_backup.fragrance_tier_0038, so 0038.down.sql puts it back.
-- Batches store their own family and are not touched. Re-runnable.

create or replace function public.classify_family(accords text[], olfactory_family text)
returns text
language sql
immutable
set search_path = public
as $$
  with votes(fam, pts, pos) as (
    -- Each accord votes for its family. Accords are stored strongest first, so
    -- the vote fades with position; the broad modifiers count half.
    select m.fam,
           coalesce((array[100,80,64,51,41,33,26,21,17,13])[u.pos::int], 10) * m.k,
           u.pos::int
    from unnest(coalesce(accords, '{}'::text[])) with ordinality u(a, pos)
    join (values
      ('citrus','fresh',2),('green','fresh',2),('aquatic','fresh',2),('marine','fresh',2),('ozonic','fresh',2),
      ('herbal','fresh',2),('lavender','fresh',2),('tropical','fresh',2),('salty','fresh',2),('fougere','fresh',2),
      ('fresh','fresh',1),('fresh spicy','fresh',1),('aromatic','fresh',1),('fruity','fresh',1),
      ('floral','floral',2),('white floral','floral',2),('yellow floral','floral',2),('rose','floral',2),
      ('violet','floral',2),('iris','floral',2),('tuberose','floral',2),('aldehydic','floral',2),('powdery','floral',1),
      ('woody','woody',2),('earthy','woody',2),('mossy','woody',2),('patchouli','woody',2),('leather','woody',2),
      ('leathery','woody',2),('smoky','woody',2),('conifer','woody',2),('chypre','woody',2),
      ('amber','oriental',2),('oriental','oriental',2),('warm spicy','oriental',2),('soft spicy','oriental',2),
      ('spicy','oriental',2),('balsamic','oriental',2),('resinous','oriental',2),('oud','oriental',2),('cinnamon','oriental',2),
      ('vanilla','gourmand',2),('gourmand','gourmand',2),('caramel','gourmand',2),('chocolate','gourmand',2),
      ('cacao','gourmand',2),('coffee','gourmand',2),('honey','gourmand',2),('praline','gourmand',2),
      ('tobacco','gourmand',2),('almond','gourmand',2),('nutty','gourmand',2),('lactonic','gourmand',2),
      ('coconut','gourmand',2),('creamy','gourmand',2),('rum','gourmand',2),('whiskey','gourmand',2),('sweet','gourmand',1)
    ) as m(a, fam, k) on m.a = lower(btrim(public.immutable_unaccent(u.a)))
    union all
    -- The stated olfactory group counts as one more vote, as strong as a
    -- leading accord.
    select g.fam, 200, 0
    from (select lower(btrim(public.immutable_unaccent(coalesce(olfactory_family, '')))) as grp) s
    cross join lateral (select case
      when s.grp ~ '(gourmand|vanilla|tobacco)' then 'gourmand'
      when s.grp ~ '^floral' then 'floral'
      when s.grp ~ '^(amber|oriental)' then 'oriental'
      when s.grp ~ '^(woody|chypre|leather)' then 'woody'
      when s.grp ~ '^(citrus|aromatic|fougere|aquatic|green|fruity)' then 'fresh'
    end as fam) g
    where g.fam is not null
  )
  select fam from votes group by fam order by sum(pts) desc, min(pos), fam limit 1;
$$;

create or replace function public.classify_tier(accords text[])
returns text
language sql
immutable
set search_path = public
as $$
  select coalesce(public.classify_family(accords, null), 'fresh');
$$;

create or replace function public.fragrances_set_tier()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  fam text;
begin
  if tg_op = 'INSERT'
     or new.accords is distinct from old.accords
     or new.olfactory_family is distinct from old.olfactory_family then
    fam := public.classify_family(new.accords, new.olfactory_family);
    if fam is not null then
      new.tier := fam;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists fragrances_set_tier on public.fragrances;
create trigger fragrances_set_tier
  before insert or update of accords, olfactory_family on public.fragrances
  for each row execute function public.fragrances_set_tier();

-- ------------------------------------------------------------- backfill
-- The families as they were, for the rows about to change. A schema of its
-- own: the API serves `public` only, so nothing here is reachable from the
-- browser.
create schema if not exists catalog_backup;
revoke all on schema catalog_backup from public;

create table if not exists catalog_backup.fragrance_tier_0038 (
  id uuid primary key,
  tier text not null,
  saved_at timestamptz not null default now()
);

insert into catalog_backup.fragrance_tier_0038 (id, tier)
select c.id, c.tier
from (
  select f.id, f.tier, public.classify_family(f.accords, f.olfactory_family) as fam
  from public.fragrances f
  where f.source <> 'custom'
  offset 0  -- keep the subquery whole: one call per row
) c
where c.fam is not null and c.fam <> c.tier
on conflict (id) do nothing;

-- Only rows still on the family that was saved: a second run changes nothing.
-- (An update of `tier` alone does not fire the trigger.)
with c as materialized (
  select f.id, public.classify_family(f.accords, f.olfactory_family) as fam
  from public.fragrances f
  join catalog_backup.fragrance_tier_0038 b on b.id = f.id and b.tier = f.tier
)
update public.fragrances f
set tier = c.fam
from c
where c.id = f.id and c.fam is not null and c.fam <> f.tier;
