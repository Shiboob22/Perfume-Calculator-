-- Run this in the Supabase SQL Editor, in addition to the scraper
-- backend's schema.sql (which creates the `perfumes` table).
--
-- Supabase enables Row Level Security by default with NO policies,
-- which blocks ALL access — including reads — once RLS is on. The
-- frontend search feature uses the anon key, so it needs an explicit
-- read policy to see any rows at all.

alter table perfumes enable row level security;

create policy "Public read access"
  on perfumes
  for select
  using (true);

-- Deliberately no insert/update/delete policy here. Writes only happen
-- through the FastAPI scraper backend using the service_role key, which
-- bypasses RLS entirely — the browser should never be able to write
-- directly to this table.
