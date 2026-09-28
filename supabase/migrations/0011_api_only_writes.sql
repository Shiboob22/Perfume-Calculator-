-- =====================================================================
-- 0011 batches and inventory are written only through /api.
-- The API enforces the Free batch cap, the rate limits, the Pro gate on
-- inventory and a column whitelist, but the authenticated role could also
-- write these tables straight through PostgREST and skip all of that.
-- The app never does (it uses /api/batches and /api/inventory, which run
-- as the service role). Reads stay, so the data export keeps working.
-- Privileges only: no rows or columns change.
-- =====================================================================

revoke insert, update, delete, truncate on table public.batches, public.inventory from authenticated;
