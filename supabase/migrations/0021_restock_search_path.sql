-- 0014 pinned restock_inventory's search_path; 0019 replaced the function
-- (CREATE OR REPLACE drops any SET clause), so the advisor's
-- function_search_path_mutable warning came back. Pin it again. Function body
-- and grants are untouched. No data changes.

alter function public.restock_inventory(uuid, uuid, numeric) set search_path = public, pg_temp;
