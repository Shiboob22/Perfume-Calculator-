-- =====================================================================
-- 0010 rate limits: a fixed-window counter the API functions call before
-- costly or abusable work (Ask, live catalog lookups, batch logging,
-- account deletion). Service role only; users never see or touch it.
-- New table and function only; no existing data changes.
-- =====================================================================

create table public.rate_limits (
  key text not null,              -- e.g. 'ai:<user id>', 'live:<ip>'
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);

alter table public.rate_limits enable row level security;
revoke all on table public.rate_limits from anon, authenticated;
-- No policies: only the service role touches this table.

-- Count one hit for `p_key` in the current window of `p_window_seconds`
-- and return true while the count is within `p_limit`. Old windows are
-- swept now and then (about 1 call in 100) so the table stays small.
create function public.hit_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare
  ws timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  n integer;
begin
  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, ws, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning r.hits into n;

  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return n <= p_limit;
end;
$$;

revoke execute on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;
