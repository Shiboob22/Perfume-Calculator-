-- 0016 — Where sign-ups and waitlist joins come from (Phase 8). Additive.
--
-- profiles.signup_ref: the call to action that brought a new user (a
--   recipe page, a guide, the home page), saved once at onboarding.
-- pro_waitlist.source: where the user joined the Pro waitlist (a locked
--   feature, the batch cap, the account page).
-- Short slugs only. Both nullable; RLS is unchanged (each user reads and
-- writes only their own row). The owner reports on them in aggregate only.

alter table public.profiles add column if not exists signup_ref text;
alter table public.profiles
  add constraint profiles_signup_ref_slug check (signup_ref is null or signup_ref ~ '^[a-z0-9_-]{1,60}$');

alter table public.pro_waitlist add column if not exists source text;
alter table public.pro_waitlist
  add constraint pro_waitlist_source_slug check (source is null or source ~ '^[a-z0-9_.-]{1,40}$');
