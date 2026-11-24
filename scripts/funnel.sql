-- Activation funnel: sign-up -> onboarding -> first batch -> second batch.
-- Read-only. Counts only, never emails or ids. Run on production through the
-- Supabase connector (or SQL editor); paste the result into
-- docs/experiments/BASELINE-<month>.md.
--
-- "Activated" = first batch logged within 7 days of sign-up (the primary
-- metric). "Came back" = a second batch on a later day than the first.
-- Cohorts are by sign-up week (Monday start, UTC).

with u as (
  select
    au.id,
    au.created_at as signed_up,
    p.onboarded_at,
    coalesce(nullif(split_part(p.signup_ref, '-', 1), ''), 'direct') as ref
  from auth.users au
  left join public.profiles p on p.user_id = au.id
),
b as (
  select
    user_id,
    min(created_at) as first_batch,
    min(created_at) filter (where created_at::date > first_day) as later_batch
  from (
    select user_id, created_at,
           min(created_at::date) over (partition by user_id) as first_day
    from public.batches
  ) x
  group by user_id
),
f as (
  select
    date_trunc('week', u.signed_up)::date as cohort_week,
    u.ref,
    u.onboarded_at is not null as onboarded,
    b.first_batch is not null as any_batch,
    b.first_batch <= u.signed_up + interval '7 days' as activated_7d,
    b.later_batch is not null as came_back,
    extract(epoch from (b.first_batch - u.signed_up)) / 3600 as hours_to_first
  from u left join b on b.user_id = u.id
)
select
  cohort_week,
  count(*)                                          as signed_up,
  count(*) filter (where onboarded)                 as onboarded,
  count(*) filter (where any_batch)                 as logged_a_batch,
  count(*) filter (where activated_7d)              as activated_7d,
  count(*) filter (where came_back)                 as came_back,
  round(100.0 * count(*) filter (where activated_7d) / count(*), 0) as activation_pct,
  round(percentile_cont(0.5) within group (order by hours_to_first)::numeric, 1) as median_hours_to_first,
  string_agg(distinct ref, ', ')                    as sources
from f
group by cohort_week
order by cohort_week;
