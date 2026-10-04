-- Phase 10: the resting journal becomes Pro (owner's decision, 2026-10-04).
-- Adds the `journal.checkins` feature to the Pro plan. No data changes:
-- existing check-ins stay readable, deletable and exported on Free; only
-- new check-ins need Pro (checked in api/checkins.ts).
update public.plans
   set features = array_append(features, 'journal.checkins')
 where id = 'pro'
   and not ('journal.checkins' = any(features));
