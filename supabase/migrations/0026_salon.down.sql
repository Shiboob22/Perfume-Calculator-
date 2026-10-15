-- Reverses 0026_salon.sql. Drops the Salon's objects only; nothing else is touched.
-- (Destroys Salon data: profiles, posts, likes, follows, reports, the action log.)
drop function if exists public.salon_unsuspend(text);
drop function if exists public.salon_moderate(uuid, text);
drop function if exists public.salon_report_queue();
drop function if exists public.salon_profile(text);
drop function if exists public.salon_feed(text, text, boolean, int, timestamptz);
drop table if exists public.salon_actions;
drop table if exists public.salon_reports;
drop table if exists public.salon_follows;
drop table if exists public.salon_likes;
drop table if exists public.salon_posts;
drop table if exists public.salon_profiles;
drop function if exists public.salon_report_after_insert();
drop function if exists public.salon_report_before_insert();
drop function if exists public.salon_follow_before_insert();
drop function if exists public.salon_like_before_insert();
drop function if exists public.salon_post_before_insert();
drop function if exists public.salon_has_link(text);
