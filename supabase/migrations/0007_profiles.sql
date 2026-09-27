-- =====================================================================
-- 0007 profiles: onboarding answers and preferences, one row per user.
-- Owner-only. The owner's account is marked as onboarded so they never
-- see the first-run questions. No existing data changes.
-- =====================================================================

create table public.profiles (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  locale text check (locale in ('en', 'ar')),
  default_unit text check (default_unit in ('ml', 'floz', 'g', 'oz')),
  default_bottle numeric check (default_bottle is null or default_bottle > 0),
  digits text check (digits in ('latn', 'arab')),
  onboarded_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy profiles_own on public.profiles
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
revoke all on table public.profiles from anon;

insert into public.profiles (user_id, onboarded_at)
select id, now() from auth.users where email = 'hishamshiboob@gmail.com'
on conflict (user_id) do nothing;
