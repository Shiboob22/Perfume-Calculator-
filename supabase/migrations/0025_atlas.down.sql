-- Reverses 0025_atlas.sql. Rejected rows go back to pending first so the old
-- status check can return. The opt-in column and everything the Atlas added
-- are dropped; the catalog's own rows and columns are untouched.
drop function if exists public.atlas_wear_stats(uuid);
alter table public.profiles drop column if exists wear_stats_opt_in;
drop function if exists public.atlas_review(uuid, boolean);
drop function if exists public.atlas_queue();
drop table if exists public.atlas_reviews;
drop function if exists public.atlas_submit(jsonb);
drop function if exists public.atlas_search(text, text, text, text, text, text, int, int, int, int);
drop table if exists public.atlas_aliases;
drop table if exists public.atlas_terms;
drop function if exists public.atlas_refresh();
drop materialized view if exists public.atlas_perfumers;
drop materialized view if exists public.atlas_accords;
drop materialized view if exists public.atlas_notes;
drop materialized view if exists public.atlas_houses;
update public.fragrances set status = 'pending' where status = 'rejected';
alter table public.fragrances drop constraint fragrances_status_check;
alter table public.fragrances add constraint fragrances_status_check check (status = any (array['approved', 'pending']));
drop index if exists public.fragrances_atlas_fts_idx;
