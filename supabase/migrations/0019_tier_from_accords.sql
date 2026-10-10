-- Keep a fragrance's family (`tier`) in step with its accords.
-- Until now `tier` was set once, by app code when a perfume was scraped, so it
-- went stale if accords changed. classify_tier() has the same rules as
-- classifyTier() in api/_lib/tier.ts (change both together); the trigger
-- re-derives tier on INSERT, and on UPDATE only when accords change. Rows with
-- no accords keep their tier. No existing row is touched by this migration:
-- a backfill of stored tiers is a separate, owner-approved step.
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
