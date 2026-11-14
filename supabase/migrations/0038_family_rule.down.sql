-- Undo 0038: put back the family every changed row had, then the 0020 rule.
-- Rewrites `fragrances.tier` for the rows listed in
-- catalog_backup.fragrance_tier_0038 (catalogue data, no user data).
update public.fragrances f
set tier = b.tier
from catalog_backup.fragrance_tier_0038 b
where b.id = f.id and f.tier <> b.tier;

create or replace function public.classify_tier(accords text[])
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when exists (select 1 from unnest(accords) a where lower(a) like any (array['%vanilla%','%sweet%','%gourmand%','%caramel%','%chocolate%','%honey%','%praline%','%tobacco%'])) then 'gourmand'
    when exists (select 1 from unnest(accords) a where lower(a) like any (array['%amber%','%oriental%','%warm spicy%','%balsamic%','%resinous%','%oud%','%spicy%'])) then 'oriental'
    when exists (select 1 from unnest(accords) a where lower(a) like any (array['%floral%','%powdery%','%rose%','%white floral%'])) then 'floral'
    when exists (select 1 from unnest(accords) a where lower(a) like any (array['%woody%','%earthy%','%mossy%','%aromatic%'])) then 'woody'
    else 'fresh'
  end;
$$;

create or replace function public.fragrances_set_tier()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.accords is not null and cardinality(new.accords) > 0
     and (tg_op = 'INSERT' or new.accords is distinct from old.accords) then
    new.tier := public.classify_tier(new.accords);
  end if;
  return new;
end;
$$;

drop trigger if exists fragrances_set_tier on public.fragrances;
create trigger fragrances_set_tier
  before insert or update of accords on public.fragrances
  for each row execute function public.fragrances_set_tier();

drop function if exists public.classify_family(text[], text);
drop table if exists catalog_backup.fragrance_tier_0038;
