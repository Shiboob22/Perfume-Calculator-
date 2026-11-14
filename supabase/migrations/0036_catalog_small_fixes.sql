-- 0036 · Five gaps the catalogue can fill from itself
--
-- A sweep for missing details that need no outside source (2026-11-14) found
-- 20 rows with no year whose name ends in one, and one row with no notes
-- whose duplicate has them.
--
-- Only four of the twenty are edition years: the name says "Edizione
-- Speciale", "Limited Edition", "Collector Edition", or gives the anniversary
-- span. The other sixteen are names or numbers, not launch years ("C.O.Bigelow
-- Lemon No.1999", "I Profumi di Firenze 1941", "Smell Bent 1997"), or cannot
-- be told apart from one, and are left as they are.
--
-- The duplicate pair is "Jardin de France Coeur de Velours": the same
-- fragrance (same house, same year) imported twice, once with notes. The
-- notes are copied as that row holds them, as one flat list.
--
-- Five rows change; existing values are never overwritten. Re-runnable.

update public.fragrances f
set year = v.year
from (values
  ('Acqua di Parma Colonia Assoluta Edizione Speciale 2011', 2011),
  ('Ajmal Dahn Al Oudh Limited Edition 2005', 2005),
  ('Calvin Klein Eternity For Men Collector Edition 2016', 2016),
  ('Guerlain 180 Ans de Créations 1828-2008', 2008)
) as v(name, year)
where f.name = v.name and f.year is null;

update public.fragrances a
set top_notes = b.top_notes
from public.fragrances b
where a.name = 'Jardin de France Coeur de Velours'
  and b.name = 'Jardin De France Cœur De Velours'
  and a.top_notes is null and a.middle_notes is null and a.base_notes is null
  and b.top_notes is not null;
