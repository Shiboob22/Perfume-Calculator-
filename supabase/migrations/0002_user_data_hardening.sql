-- =====================================================================
-- 0002 user data hardening: batches, inventory, fragrance_notes.
--
-- Owner-only RLS already exists on all three (auth.uid() = user_id). This
-- closes the gaps around it:
--   - batches.user_id becomes NOT NULL (0 null rows in production);
--   - a user's batches and inventory are deleted with their account
--     (fragrance_notes already cascades), so account deletion works;
--   - policies apply to `authenticated` only and use (select auth.uid()),
--     evaluated once per query instead of once per row;
--   - the duplicate fragrance_notes policy goes;
--   - anon loses all table rights on user data (RLS already returned
--     nothing; this removes the grant too);
--   - restock_inventory(p_user_id, …) can no longer be called from the
--     browser: it takes any user id and relied on RLS alone. Only the
--     service role (api/inventory.ts) calls it;
--   - a duplicate index on batches(user_id) is dropped.
--
-- Data: no row is changed or removed.
-- =====================================================================

alter table public.batches alter column user_id set not null;

alter table public.batches
  drop constraint batches_user_id_fkey,
  add constraint batches_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.inventory
  drop constraint inventory_user_id_fkey,
  add constraint inventory_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

drop policy batches_own on public.batches;
create policy batches_own on public.batches
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy inventory_own on public.inventory;
create policy inventory_own on public.inventory
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy own_fragrance_notes on public.fragrance_notes;
drop policy fragrance_notes_own on public.fragrance_notes;
create policy fragrance_notes_own on public.fragrance_notes
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table public.batches, public.inventory, public.fragrance_notes from anon;

revoke execute on function public.restock_inventory(uuid, uuid, numeric) from public, anon, authenticated;

drop index public.idx_batches_user_id; -- same as batches_user_idx
