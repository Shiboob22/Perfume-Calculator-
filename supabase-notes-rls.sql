-- RLS + ownership for the tables the browser writes to directly with the anon
-- key (under a logged-in user's session = the `authenticated` role).
--
-- History: "Log this batch" first failed with deny-all RLS, then (after a naive
-- blanket policy) with "null value in column user_id ... violates not-null".
-- fragrance_notes is a PER-USER table (user_id uuid not null), but the client
-- upsert in saveFragranceNotes() never set user_id.
--
-- Fix: default user_id to the caller's uid from the JWT, and scope RLS so each
-- user only sees/writes their own notes. The client stays unchanged — the
-- default fills user_id on insert. This also resolves the security review
-- finding that a blanket `to authenticated using(true)` grant on a user-scoped
-- table lets any authenticated principal read/write everyone's rows.

-- fragrance_notes: per-user ownership -------------------------------------
alter table fragrance_notes alter column user_id set default auth.uid();

drop policy if exists "auth_all_fragrance_notes" on fragrance_notes;
drop policy if exists "own_fragrance_notes" on fragrance_notes;
create policy "own_fragrance_notes"
  on fragrance_notes for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- fragrances: SHARED catalog (curated + scraped, no user_id). Authenticated
-- users may read, insert and update, but NOT delete: a client-side delete would
-- cascade into the service-role-only inventory/batches tables. Deletes remain a
-- service-role-only operation.
drop policy if exists "auth_all_fragrances" on fragrances;
drop policy if exists "auth_select_fragrances" on fragrances;
drop policy if exists "auth_insert_fragrances" on fragrances;
drop policy if exists "auth_update_fragrances" on fragrances;
create policy "auth_select_fragrances" on fragrances for select to authenticated using (true);
create policy "auth_insert_fragrances" on fragrances for insert to authenticated with check (true);
create policy "auth_update_fragrances" on fragrances for update to authenticated using (true) with check (true);
