-- Undo 0036: clear the four years and the copied notes again (catalogue data
-- only; the values came from the rows' own names and from a duplicate row).
update public.fragrances set year = null
where name in (
  'Acqua di Parma Colonia Assoluta Edizione Speciale 2011',
  'Ajmal Dahn Al Oudh Limited Edition 2005',
  'Calvin Klein Eternity For Men Collector Edition 2016',
  'Guerlain 180 Ans de Créations 1828-2008'
);
update public.fragrances set top_notes = null
where name = 'Jardin de France Coeur de Velours' and middle_notes is null and base_notes is null;
