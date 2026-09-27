-- =====================================================================
-- 0008 Pro waitlist: signed-in users who asked to hear when Pro opens.
-- One row per user; a user sees and adds only their own row.
-- =====================================================================

create table public.pro_waitlist (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  locale text check (locale in ('en', 'ar')),
  created_at timestamptz not null default now()
);

alter table public.pro_waitlist enable row level security;
create policy pro_waitlist_read_own on public.pro_waitlist for select to authenticated
  using ((select auth.uid()) = user_id);
create policy pro_waitlist_join on public.pro_waitlist for insert to authenticated
  with check ((select auth.uid()) = user_id);
revoke all on table public.pro_waitlist from anon;
revoke update on table public.pro_waitlist from authenticated;
