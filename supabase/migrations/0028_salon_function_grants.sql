-- 0028 — Salon function grants. Additive (privileges only); no data touched.
--
-- 0027 left Postgres's default PUBLIC EXECUTE on seven Salon functions. None is
-- exploitable (trigger functions cannot run outside a trigger, and
-- salon_has_link is a pure text test), but the advisor flags them, and the rule
-- is: nothing runs that does not need to.
--
-- salon_has_link is used inside CHECK constraints on salon_profiles and
-- salon_posts, and Postgres checks EXECUTE for the inserting role, so
-- `authenticated` keeps it; only public and anon lose it.
revoke all on function public.salon_post_before_insert()   from public, anon, authenticated;
revoke all on function public.salon_like_before_insert()   from public, anon, authenticated;
revoke all on function public.salon_follow_before_insert() from public, anon, authenticated;
revoke all on function public.salon_report_before_insert() from public, anon, authenticated;
revoke all on function public.salon_report_after_insert()  from public, anon, authenticated;
revoke all on function public.salon_post_before_delete()   from public, anon, authenticated;
revoke all on function public.salon_has_link(text) from public, anon;
grant execute on function public.salon_has_link(text) to authenticated;
