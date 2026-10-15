-- Reverses 0028_salon_function_grants.sql: restores the default PUBLIC EXECUTE.
grant execute on function public.salon_post_before_insert()   to public;
grant execute on function public.salon_like_before_insert()   to public;
grant execute on function public.salon_follow_before_insert() to public;
grant execute on function public.salon_report_before_insert() to public;
grant execute on function public.salon_report_after_insert()  to public;
grant execute on function public.salon_post_before_delete()   to public;
grant execute on function public.salon_has_link(text)         to public;
