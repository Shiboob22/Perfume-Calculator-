-- Scent Selector: a candidate pool that is not just the most-voted fragrances.
-- Returns approved fragrances sharing any of the target accords, from three
-- slices: the most popular (familiar names), the best rated among those with
-- real vote counts, and a popularity-neutral sample (a fixed 1-in-20 id-hash
-- slice, so niche and new fragrances appear too). Read-only; runs with the
-- caller's rights, so RLS applies (signed-in users read approved rows).
-- No table or data change.
create or replace function public.selector_candidates(target text[], lim integer default 700)
returns setof public.fragrances
language sql
stable
security invoker
set search_path = public
as $$
  with popular as (
    select f.* from public.fragrances f
    where f.status = 'approved' and f.accords && target
    order by f.popularity desc nulls last
    limit 250
  ), rated as (
    select f.* from public.fragrances f
    where f.status = 'approved' and f.accords && target and f.popularity >= 50
    order by f.rating desc nulls last, f.popularity desc nulls last
    limit 150
  ), sampled as (
    select f.* from public.fragrances f
    where f.status = 'approved' and f.accords && target and mod(abs(hashtext(f.id::text)), 20) = 0
    order by hashtext(f.id::text)
    limit 300
  )
  select u.* from (
    select * from popular union select * from rated union select * from sampled
  ) u
  limit greatest(1, least(coalesce(lim, 700), 1000));
$$;

revoke all on function public.selector_candidates(text[], integer) from public, anon;
grant execute on function public.selector_candidates(text[], integer) to authenticated;
