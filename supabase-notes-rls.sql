-- RLS policies for the tables the browser writes to directly with the anon key
-- (under a logged-in user's session, i.e. the `authenticated` role).
--
-- Supabase enables RLS with NO policies by default = deny-all, which blocked
-- "Log this batch": saveFragranceNotes() upserts fragrance_notes straight from
-- the client and got "new row violates row-level security policy". fragrances
-- has the same issue when the calculator upserts a custom fragrance.
--
-- This app is single-user (the owner holds the only URL/anon key — see the
-- comment in supabase-schema-v2.sql), so granting the authenticated role full
-- access to these tables is appropriate. For a real multi-user app these tables
-- would instead need a user_id column and per-user policies (as inventory has).
--
-- batches and inventory are NOT covered here on purpose: those are written only
-- through the service-role API routes (api/batches.ts, api/inventory.ts), which
-- bypass RLS and enforce per-user scoping in the handler.

drop policy if exists "auth_all_fragrance_notes" on fragrance_notes;
create policy "auth_all_fragrance_notes"
  on fragrance_notes for all to authenticated
  using (true) with check (true);

drop policy if exists "auth_all_fragrances" on fragrances;
create policy "auth_all_fragrances"
  on fragrances for all to authenticated
  using (true) with check (true);
