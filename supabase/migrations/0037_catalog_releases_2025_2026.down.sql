-- Undo 0037: remove the thirty-two curated releases it added. DESTRUCTIVE for
-- anything since attached to them: inventory rows and notes on these
-- fragrances go with them (batches, bottles and orders keep their records and
-- lose the link). Check for those before running.
delete from public.fragrances
where source = 'curated' and name in (
  'Chanel Chance Eau Splendide',
  'Chanel Bleu de Chanel L''Exclusif',
  'Chanel Coco Mademoiselle Crush Absolu',
  'Dior Miss Dior Essence',
  'Dior Homme Parfum (2025)',
  'Yves Saint Laurent Libre L''Eau Nue',
  'Giorgio Armani Acqua di Gio Elixir',
  'Carolina Herrera La Bomba',
  'Jean Paul Gaultier Le Male Elixir Absolu',
  'Valentino Uomo Born in Roma Extradose',
  'Prada Paradoxe Radical Essence',
  'Lancôme Idôle Power',
  'Guerlain Shalimar L''Essence',
  'Hermès Barénia Eau de Parfum Intense',
  'Tom Ford Black Orchid Reserve',
  'Givenchy Gentleman Society Eau de Parfum Ambrée',
  'Dolce&Gabbana Devotion Pour Homme',
  'Azzaro Forever Wanted Elixir',
  'Hugo Boss Boss Bottled Beyond',
  'Mugler Alien Pulp',
  'Kilian Her Majesty',
  'Creed Eladaria',
  'Parfums de Marly Castley',
  'Parfums de Marly Valaya Exclusif',
  'Maison Francis Kurkdjian Kurky',
  'Amouage Decision',
  'Byredo Alto Astral',
  'Le Labo Eucalyptus 20',
  'Lattafa Asad Elixir',
  'Lattafa Khamrah Dukhan',
  'Lattafa Eclaire Pistache',
  'Rabanne Million Gold Elixir'
);
