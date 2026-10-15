-- Onboarding asks whether the user sells what they blend, and in which
-- currency. Both optional; the profile is already owner-only under RLS
-- (0007), so no policy changes. Existing rows are untouched.
alter table public.profiles
  add column sells boolean,
  add column currency text check (currency is null or currency ~ '^[A-Z]{3}$');
