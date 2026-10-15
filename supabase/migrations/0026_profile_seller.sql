-- Onboarding asks whether the user sells what they blend, and in which
-- currency. Both optional; the profile is already owner-only under RLS
-- (0007), so no policy changes. Existing rows are untouched.
-- Applied to staging and production on 2026-10-15 as "profile_seller" (the
-- number 0023 was taken on production by 0023_recipes from another branch).
alter table public.profiles
  add column sells boolean,
  add column currency text check (currency is null or currency ~ '^[A-Z]{3}$');
