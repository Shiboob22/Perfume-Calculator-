-- =====================================================================
-- 0001 catalog ownership: `fragrances` becomes a shared, read-only catalog.
--
-- Before: any signed-in user could insert and UPDATE ANY catalog row
-- (auth_update_fragrances USING (true)), including the owner's 471 curated
-- rows and the 81k imported ones.
--
-- After:
--   - everyone signed in reads approved rows, plus the rows they added;
--   - a user may only add rows they own, and they start as 'pending';
--   - a user may edit only their own pending rows;
--   - admins (public.admins) may do anything, e.g. approve a row;
--   - nobody but the service role deletes (a delete cascades into
--     inventory and notes).
-- The two writes the app needs on catalog rows it doesn't own go through
-- narrow SECURITY DEFINER functions instead of table rights:
--   ensure_fragrance()    find-or-add by exact name (calculator "log batch")
--   add_fragrance_photo() fill an empty image_url ("+ Add photo")
-- search_fragrances_fuzzy() and similar_fragrances() now return approved
-- rows only (the API calls them with the service role, which skips RLS).
--
-- Data: no row is changed except the new columns' values. Every existing
-- row becomes 'approved' with no owner.
-- =====================================================================

-- ---------------------------------------------------------------- admins
create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
revoke all on table public.admins from anon, authenticated;
-- No policies: only the service role and the function below read it.

create function public.is_admin() returns boolean
language sql stable security definer
set search_path = ''
as $$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

-- The owner's account (a no-op where it doesn't exist, e.g. staging).
insert into public.admins (user_id)
select id from auth.users where email = 'hishamshiboob@gmail.com'
on conflict do nothing;

-- ------------------------------------------------ ownership + moderation
alter table public.fragrances
  add column added_by uuid references auth.users(id) on delete set null,
  add column status text not null default 'approved'
    constraint fragrances_status_check check (status in ('approved', 'pending'));
-- Existing rows took 'approved' above; from now on new rows start pending
-- and are owned by whoever inserts them (null for the service role).
alter table public.fragrances alter column status set default 'pending';
alter table public.fragrances alter column added_by set default auth.uid();
create index fragrances_added_by_idx on public.fragrances (added_by) where added_by is not null;

-- ------------------------------------------------------------ policies
drop policy auth_insert_fragrances on public.fragrances;
drop policy auth_select_fragrances on public.fragrances;
drop policy auth_update_fragrances on public.fragrances;
drop policy fragrances_insert on public.fragrances;
drop policy fragrances_select on public.fragrances;

create policy fragrances_read on public.fragrances
  for select to authenticated
  using (status = 'approved' or added_by = (select auth.uid()) or (select public.is_admin()));

create policy fragrances_add_own on public.fragrances
  for insert to authenticated
  with check (added_by = (select auth.uid()) and status = 'pending');

create policy fragrances_edit_own_pending on public.fragrances
  for update to authenticated
  using (added_by = (select auth.uid()) and status = 'pending')
  with check (added_by = (select auth.uid()) and status = 'pending');

create policy fragrances_admin on public.fragrances
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Table rights: anon reads nothing directly (the public site goes through
-- /api with the service role); signed-in users never delete or truncate.
revoke all on table public.fragrances from anon;
revoke delete, truncate, references, trigger on table public.fragrances from authenticated;

-- ------------------------------------------------- find-or-add by name
-- The calculator logs a batch against a fragrance name. If the name exists
-- (approved, or pending under someone else) its id is reused, so a user
-- never needs rights on a row they can't edit; otherwise a pending row
-- owned by the caller is added.
create function public.ensure_fragrance(p_name text, p_tier text)
returns table (id uuid, name text, tier text)
language plpgsql security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  uid uuid := auth.uid();
  clean text := btrim(p_name);
begin
  if uid is null then
    raise exception 'Sign in to add a fragrance.' using errcode = '42501';
  end if;
  if clean = '' or length(clean) > 200 then
    raise exception 'Enter a fragrance name.' using errcode = '22023';
  end if;

  insert into public.fragrances as f (name, tier, source, added_by, status)
  values (clean, p_tier, 'custom', uid, 'pending')
  on conflict (name) do nothing;

  return query select f.id, f.name, f.tier from public.fragrances f where f.name = clean;
end
$$;
revoke all on function public.ensure_fragrance(text, text) from public, anon;
grant execute on function public.ensure_fragrance(text, text) to authenticated, service_role;

-- ------------------------------------------------------------ add photo
-- "+ Add photo" on a perfume page: fills image_url only where it is empty,
-- on a row the caller can see. Returns the updated row.
create function public.add_fragrance_photo(p_id uuid, p_url text)
returns setof public.fragrances
language plpgsql security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  clean text := btrim(p_url);
begin
  if uid is null then
    raise exception 'Sign in to add a photo.' using errcode = '42501';
  end if;
  if clean !~* '^https://\S+$' or length(clean) > 1000 then
    raise exception 'Paste an image link starting with https://' using errcode = '22023';
  end if;

  return query
    update public.fragrances f
       set image_url = clean
     where f.id = p_id
       and f.image_url is null
       and (f.status = 'approved' or f.added_by = uid)
    returning f.*;
end
$$;
revoke all on function public.add_fragrance_photo(uuid, text) from public, anon;
grant execute on function public.add_fragrance_photo(uuid, text) to authenticated, service_role;

-- ------------------------------------------- catalog functions: approved
create or replace function public.search_fragrances_fuzzy(q text, lim integer default 20)
returns setof public.fragrances
language sql stable
set search_path = public, extensions
as $$
  select f.*
  from fragrances f
  where q <% f.search_text
    and f.status = 'approved'
  order by word_similarity(q, f.search_text)
           + 0.10 * f.priority
           + 0.05 * log(1 + coalesce(f.popularity, 0)) desc
  limit least(greatest(lim, 1), 50)
$$;

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
  select * into b from fragrances where id = p_id and status = 'approved';
  if not found then return null; end if;

  if cardinality(b.accords) > 0 then
    lead_accords := b.accords[1:2];
    if cardinality(b.accords) > 1 and (
      select count(*) from (
        select 1 from fragrances f
        where f.accords @> lead_accords and f.id <> p_id and f.status = 'approved'
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
        where f.accords @> lead_accords and f.id <> p_id and f.status = 'approved'
          and (b.brand is null or f.brand <> b.brand)
        order by f.popularity desc nulls last
        limit 300
      ) c
      order by score desc, c.popularity desc nulls last
      limit 8
    ) s;
  end if;

  if sim = '[]'::jsonb then
    basis := 'family';
    select coalesce(jsonb_agg(to_jsonb(f) order by f.popularity desc nulls last), '[]')
      into sim
    from (
      select * from fragrances f
      where f.tier = b.tier and f.id <> p_id and f.status = 'approved'
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
      where f.brand = b.brand and f.id <> p_id and f.status = 'approved'
      order by f.popularity desc nulls last
      limit 12
    ) f;
  end if;

  return jsonb_build_object('basis', basis, 'similar', sim, 'sameBrand', same_brand);
end
$$;
