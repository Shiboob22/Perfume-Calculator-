-- 0021 — restock_inventory keeps its fixed search_path (Phase 11).
--
-- 0014 pinned `search_path = public, pg_temp` on restock_inventory (security
-- advisor: function_search_path_mutable). 0019 then used CREATE OR REPLACE to
-- add the "stock never below zero" rule, and a replace resets function
-- settings, so the pin was lost on staging and production. This puts it back.
--
-- 0019's text now carries the setting itself, so a fresh database built from
-- the migrations gets it either way. No data change; the function body is
-- exactly 0019's. Safe to run twice.

alter function public.restock_inventory(uuid, uuid, numeric) set search_path = public, pg_temp;
