-- =====================================================================
-- 0006 calculator presets: "my usual 50 mL at 25%", per user.
-- Owner-only, like the other user tables.
-- =====================================================================

create table public.calc_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 60),
  amount numeric not null check (amount > 0),
  unit text not null check (unit in ('ml', 'floz', 'g', 'oz')),
  concentration_pct numeric not null check (concentration_pct > 0 and concentration_pct < 100),
  created_at timestamptz not null default now()
);
create index calc_presets_user_idx on public.calc_presets (user_id);

alter table public.calc_presets enable row level security;
create policy calc_presets_own on public.calc_presets
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
revoke all on table public.calc_presets from anon;
