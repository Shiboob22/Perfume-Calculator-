-- 0014 — Supabase advisor fixes (Phase 8). Additive; no data changes.
--
-- 1. Indexes for four foreign keys the performance advisor reports as
--    unindexed. Without them, deleting a batch (or a user, by cascade) scans
--    the whole child table to find the rows to remove.
-- 2. restock_inventory gets a fixed search_path (security advisor:
--    function_search_path_mutable). Phase 8 calls it from the batch log.

create index if not exists batch_checkins_batch_user_idx on public.batch_checkins (batch_id, user_id);
create index if not exists shared_recipes_batch_user_idx on public.shared_recipes (batch_id, user_id);
create index if not exists fragrance_notes_user_idx on public.fragrance_notes (user_id);
create index if not exists user_plans_plan_idx on public.user_plans (plan_id);

alter function public.restock_inventory(uuid, uuid, numeric) set search_path = public, pg_temp;
