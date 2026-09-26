-- =====================================================================
-- "Reminds me of" + "More from <brand>" in one database call (2026-09-26).
--
-- /api/similar used to pull up to 300 full candidate rows over the network
-- and score them in the function, across 3-4 sequential requests (~480 ms
-- per uncached perfume). The same scoring runs here instead, next to the
-- data, and returns only what the page shows.
-- =====================================================================

-- Accords are listed strongest first: weight the first eight 8..1 and
-- compare two perfumes by cosine similarity of those weighted vectors.
-- A repeated accord keeps its later (lower) weight, as the old JS Map did.
create or replace function public.accord_cosine(a text[], b text[])
returns float8
language sql immutable parallel safe
set search_path = ''
as $$
  with va as (select lower(x) k, min(9 - i) w from unnest(a[1:8]) with ordinality t(x, i) group by 1),
       vb as (select lower(x) k, min(9 - i) w from unnest(b[1:8]) with ordinality t(x, i) group by 1)
  select coalesce(
    (select sum(va.w * vb.w) from va join vb using (k))::float8
      / nullif(sqrt((select sum(w * w) from va)) * sqrt((select sum(w * w) from vb)), 0),
    0)
$$;

-- Share of notes two perfumes have in common (case-insensitive).
create or replace function public.note_jaccard(a text[], b text[])
returns float8
language sql immutable parallel safe
set search_path = ''
as $$
  with sa as (select distinct lower(x) k from unnest(a) x where x is not null),
       sb as (select distinct lower(x) k from unnest(b) x where x is not null),
       n as (select (select count(*) from sa) na, (select count(*) from sb) nb,
                    (select count(*) from sa join sb using (k)) ni)
  select case when na = 0 or nb = 0 then 0 else ni::float8 / (na + nb - ni) end from n
$$;

-- Returns { basis, similar, sameBrand }, or null when the id is unknown.
-- Runs with the caller's rights (RLS applies as usual).
create or replace function public.similar_fragrances(p_id uuid)
returns jsonb
language plpgsql stable
set search_path = public
as $$
declare
  b fragrances;
  lead_accords text[];
  sim jsonb := '[]';
  basis text := 'accords';
  same_brand jsonb := '[]';
begin
  select * into b from fragrances where id = p_id;
  if not found then return null; end if;

  if cardinality(b.accords) > 0 then
    -- Candidates share the top two accords, from other houses only (the same
    -- house is its own shelf). If that pair is rare, widen to the lead accord.
    lead_accords := b.accords[1:2];
    if cardinality(b.accords) > 1 and (
      select count(*) from (
        select 1 from fragrances f
        where f.accords @> lead_accords and f.id <> p_id
          and (b.brand is null or f.brand <> b.brand)
        limit 20) enough) < 20 then
      lead_accords := b.accords[1:1];
    end if;

    select coalesce(jsonb_agg(to_jsonb(s) - 'score' order by s.score desc, s.popularity desc nulls last), '[]')
      into sim
    from (
      select c.*,
             0.75 * accord_cosine(b.accords, c.accords)
           + 0.25 * note_jaccard(b.all_notes, c.all_notes)
           + 0.02 * log(1 + coalesce(c.popularity, 0)) as score
      from (
        select f.* from fragrances f
        where f.accords @> lead_accords and f.id <> p_id
          and (b.brand is null or f.brand <> b.brand)
        order by f.popularity desc nulls last
        limit 300
      ) c
      order by score desc, c.popularity desc nulls last
      limit 8
    ) s;
  end if;

  if sim = '[]'::jsonb then
    -- No accords recorded: well-known perfumes of the same family instead.
    basis := 'family';
    select coalesce(jsonb_agg(to_jsonb(f) order by f.popularity desc nulls last), '[]')
      into sim
    from (
      select * from fragrances f
      where f.tier = b.tier and f.id <> p_id
        and (b.brand is null or f.brand <> b.brand)
        and f.image_url is not null
      order by f.popularity desc nulls last
      limit 8
    ) f;
  end if;

  if b.brand is not null then
    select coalesce(jsonb_agg(to_jsonb(f) order by f.popularity desc nulls last), '[]')
      into same_brand
    from (
      select * from fragrances f
      where f.brand = b.brand and f.id <> p_id
      order by f.popularity desc nulls last
      limit 12
    ) f;
  end if;

  return jsonb_build_object('basis', basis, 'similar', sim, 'sameBrand', same_brand);
end
$$;
