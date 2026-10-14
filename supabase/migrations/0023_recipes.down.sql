-- Down for 0023: removes recipes, their versions and the batch link. Batches
-- themselves are kept (only the link column goes).
drop index if exists public.batches_recipe_version_idx;
alter table public.batches drop column if exists recipe_version_id;
drop table if exists public.recipe_versions;
drop table if exists public.recipes;
drop function if exists public.recipe_version_before_insert();
drop function if exists public.recipe_before_insert();
