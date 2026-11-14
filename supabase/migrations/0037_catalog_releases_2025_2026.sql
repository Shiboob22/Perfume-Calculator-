-- 0037 · Thirty-two releases from 2025 and 2026, entered by hand
--
-- The catalogue was loaded on 2026-09-25 and holds nothing newer than 2024.
-- The owner asked for the new releases as curated entries (2026-11-14), not
-- from a scraped or licensed source. Each row here was checked against the
-- house's own product page or press material, or against an authorised
-- retailer carrying the house's copy: name, house, year, notes and, where the
-- house credits one, the perfumer. docs/catalog/releases-2025-2026.md lists
-- the pages used for every row, and the releases left out because their
-- sources disagree.
--
-- Facts only. No photo, rating or vote count is stored. The accords and the
-- olfactory group are Kyphira's own reading of the house's description, in
-- the catalogue's vocabulary; they are not copied from any site. Where the
-- house gives notes without a pyramid, the notes sit in one list.
--
-- `tier` is given as the family rule (0038) reads these accords; the trigger
-- re-derives it on insert either way.
--
-- Adds rows only. A name already in the catalogue, in any spelling of case or
-- accents, is left alone (so the rows people typed themselves stay theirs).
-- Re-runnable.

insert into public.fragrances
  (name, brand, tier, source, status, added_by, year, gender, perfumers, olfactory_family, country,
   accords, top_notes, middle_notes, base_notes)
select v.name, v.brand, v.tier, 'curated', 'approved', null, v.year, v.gender, v.perfumers, v.olfactory_family, v.country,
       v.accords, v.top_notes, v.middle_notes, v.base_notes
from (values
  ('Chanel Chance Eau Splendide', 'Chanel', 'floral', 2025::smallint, 'women', array['Olivier Polge']::text[], 'Floral Fruity', 'France', array['Fruity', 'Floral', 'Rose', 'Powdery', 'Musky']::text[], array['Raspberry']::text[], array['Rose Geranium']::text[], array['Iris', 'Cedar', 'White Musk']::text[]),
  ('Chanel Bleu de Chanel L''Exclusif', 'Chanel', 'oriental', 2025::smallint, 'men', array['Olivier Polge']::text[], 'Amber Woody', 'France', array['Woody', 'Amber', 'Leather', 'Aromatic', 'Balsamic']::text[], null::text[], null::text[], array['Sandalwood', 'Labdanum', 'Leather']::text[]),
  ('Chanel Coco Mademoiselle Crush Absolu', 'Chanel', 'oriental', 2026::smallint, 'women', array['Olivier Polge']::text[], 'Amber Floral', 'France', array['Fruity', 'Floral', 'Rose', 'Amber', 'Woody', 'Patchouli']::text[], array['Rose', 'Jasmine', 'Patchouli', 'Vanilla', 'Vetiver']::text[], null::text[], null::text[]),
  ('Dior Miss Dior Essence', 'Dior', 'floral', 2025::smallint, 'women', array['Francis Kurkdjian']::text[], 'Floral Fruity', 'France', array['Fruity', 'Floral', 'White Floral', 'Woody', 'Sweet']::text[], array['Blackberry']::text[], array['Jasmine Sambac']::text[], array['Oak']::text[]),
  ('Dior Homme Parfum (2025)', 'Dior', 'oriental', 2025::smallint, 'men', array['Francis Kurkdjian']::text[], 'Amber Woody', 'France', array['Iris', 'Amber', 'Woody', 'Powdery', 'Patchouli']::text[], array['Iris']::text[], array['Amber']::text[], array['Patchouli', 'Vetiver']::text[]),
  ('Yves Saint Laurent Libre L''Eau Nue', 'Yves Saint Laurent', 'fresh', 2025::smallint, 'women', array['Anne Flipo', 'Carlos Benaïm']::text[], null, 'France', array['Citrus', 'White Floral', 'Lavender', 'Fresh', 'Aromatic']::text[], array['Green Mandarin', 'Bergamot']::text[], array['Orange Blossom']::text[], array['Lavender']::text[]),
  ('Giorgio Armani Acqua di Gio Elixir', 'Giorgio Armani', 'fresh', 2025::smallint, 'men', array['Alberto Morillas']::text[], 'Aromatic Aquatic', 'Italy', array['Aquatic', 'Citrus', 'Leather', 'Woody', 'Aromatic']::text[], array['Bergamot', 'Green Mandarin', 'Nutmeg']::text[], array['Violet Leaf', 'Water Notes']::text[], array['Leather', 'Patchouli', 'Vetiver', 'Labdanum']::text[]),
  ('Carolina Herrera La Bomba', 'Carolina Herrera', 'floral', 2025::smallint, 'women', null::text[], 'Floral Fruity', 'USA', array['Fruity', 'Floral', 'Tropical', 'Sweet', 'Vanilla']::text[], array['Pitaya']::text[], array['Red Frangipani', 'Cherry Peony']::text[], array['Vanilla', 'Patchouli']::text[]),
  ('Jean Paul Gaultier Le Male Elixir Absolu', 'Jean Paul Gaultier', 'fresh', 2025::smallint, 'men', array['Quentin Bisch']::text[], 'Woody Aromatic', 'France', array['Aromatic', 'Lavender', 'Fruity', 'Sweet']::text[], array['Plum']::text[], array['Lavender']::text[], array['Tonka Bean']::text[]),
  ('Valentino Uomo Born in Roma Extradose', 'Valentino', 'woody', 2025::smallint, 'men', array['Guillaume Flavigny']::text[], 'Woody Spicy', 'Italy', array['Woody', 'Warm Spicy', 'Aromatic', 'Lavender']::text[], array['Spicy Notes']::text[], array['Lavandin']::text[], array['Vetiver']::text[]),
  ('Prada Paradoxe Radical Essence', 'Prada', 'floral', 2025::smallint, 'women', array['Nadège Le Garlantezec', 'Shyamala Maisondieu', 'Antoine Maisondieu']::text[], null, 'Italy', array['White Floral', 'Nutty', 'Woody', 'Salty', 'Citrus']::text[], array['Neroli', 'Orange Blossom']::text[], array['Salted Pistachio']::text[], array['Sandalwood']::text[]),
  ('Lancôme Idôle Power', 'Lancôme', 'floral', 2025::smallint, 'women', null::text[], 'Floral Woody Musk', 'France', array['Rose', 'Floral', 'Woody', 'Fruity']::text[], array['Pomarose']::text[], array['Damask Rose']::text[], array['Sandalwood']::text[]),
  ('Guerlain Shalimar L''Essence', 'Guerlain', 'gourmand', 2025::smallint, 'women', array['Delphine Jelk']::text[], 'Amber Vanilla', 'France', array['Vanilla', 'Amber', 'Balsamic', 'Powdery', 'Sweet']::text[], null::text[], null::text[], array['Vanilla', 'Benzoin', 'Tonka Bean', 'Musk']::text[]),
  ('Hermès Barénia Eau de Parfum Intense', 'Hermès', 'woody', 2025::smallint, 'women', array['Christine Nagel']::text[], 'Chypre Floral', 'France', array['Woody', 'Leather', 'Patchouli', 'White Floral', 'Earthy']::text[], array['Butterfly Lily']::text[], array['Oakwood', 'Patchouli']::text[], array['Leather']::text[]),
  ('Tom Ford Black Orchid Reserve', 'Tom Ford', 'woody', 2025::smallint, 'unisex', null::text[], 'Chypre Floral', 'USA', array['Earthy', 'Floral', 'Patchouli', 'Warm Spicy', 'Yellow Floral']::text[], array['Black Orchid', 'Ghost Orchid', 'Black Truffle', 'Ylang-Ylang', 'Timut Pepper', 'Patchouli', 'Roasted Tonka']::text[], null::text[], null::text[]),
  ('Givenchy Gentleman Society Eau de Parfum Ambrée', 'Givenchy', 'woody', 2025::smallint, 'men', array['Karine Dubreuil-Sereni']::text[], 'Woody Floral', 'France', array['Woody', 'Amber', 'Vanilla', 'Aromatic', 'Tobacco']::text[], array['Clary Sage', 'Juniper Berries', 'Nutmeg']::text[], array['Narcissus']::text[], array['Vetiver', 'Vanilla']::text[]),
  ('Dolce&Gabbana Devotion Pour Homme', 'Dolce&Gabbana', 'fresh', 2025::smallint, 'men', array['Olivier Cresp']::text[], null, 'Italy', array['Citrus', 'Coffee', 'Patchouli', 'Woody', 'Aromatic']::text[], array['Lemon']::text[], array['Coffee']::text[], array['Patchouli']::text[]),
  ('Azzaro Forever Wanted Elixir', 'Azzaro', 'woody', 2025::smallint, 'men', null::text[], null, 'France', array['Aromatic', 'Leather', 'Woody', 'Warm Spicy', 'Lavender']::text[], array['Clary Sage', 'Lavandin', 'Cardamom']::text[], null::text[], array['Leather', 'Vetiver', 'Woody Notes']::text[]),
  ('Hugo Boss Boss Bottled Beyond', 'Hugo Boss', 'woody', 2025::smallint, 'men', array['Daphné Bugey', 'Frank Voelkl', 'Bruno Jovanovic']::text[], 'Woody Leather', 'Germany', array['Leather', 'Woody', 'Fresh Spicy']::text[], array['Ginger']::text[], array['Leather']::text[], array['Woody Notes']::text[]),
  ('Mugler Alien Pulp', 'Mugler', 'floral', 2025::smallint, 'women', array['Dominique Ropion']::text[], 'Floral Fruity', 'France', array['Fruity', 'White Floral', 'Musky', 'Woody', 'Sweet']::text[], array['Raspberry']::text[], array['Jasmine']::text[], array['Musk', 'Cashmeran']::text[]),
  ('Kilian Her Majesty', 'Kilian', 'woody', 2026::smallint, null, array['Caroline Dumur']::text[], null, 'France', array['Fruity', 'Rose', 'Woody', 'Musky', 'Mossy']::text[], array['White Peach', 'Rum']::text[], array['Rose', 'Ambrette']::text[], array['Papyrus', 'Cedarwood', 'Oakmoss']::text[]),
  ('Creed Eladaria', 'Creed', 'floral', 2025::smallint, 'women', null::text[], 'Floral', 'France', array['Rose', 'Floral', 'Powdery', 'Musky', 'Citrus']::text[], array['Mandarin', 'Bergamot', 'Pink Pepper']::text[], array['Rose', 'Peony', 'Lily of the Valley']::text[], array['Musk', 'Vanilla', 'Ambroxan', 'Cashmere Wood']::text[]),
  ('Parfums de Marly Castley', 'Parfums de Marly', 'fresh', 2025::smallint, 'men', null::text[], 'Citrus Aromatic', 'France', array['Citrus', 'Fresh Spicy', 'Aromatic', 'Woody', 'Amber']::text[], array['Bergamot', 'Ginger', 'Black Pepper']::text[], array['Neroli', 'Petitgrain', 'Timut Pepper']::text[], array['Akigalawood', 'Benzoin', 'Labdanum']::text[]),
  ('Parfums de Marly Valaya Exclusif', 'Parfums de Marly', 'floral', 2025::smallint, 'women', null::text[], 'Floral', 'France', array['White Floral', 'Almond', 'Powdery', 'Vanilla', 'Musky']::text[], array['Almond', 'Mandarin', 'Bergamot']::text[], array['White Flowers', 'Orange Blossom']::text[], array['Vanilla', 'Ambroxan', 'Akigalawood', 'Sandalwood']::text[]),
  ('Maison Francis Kurkdjian Kurky', 'Maison Francis Kurkdjian', 'gourmand', 2025::smallint, 'unisex', array['Francis Kurkdjian']::text[], null, 'France', array['Fruity', 'Sweet', 'Musky', 'Vanilla']::text[], array['Raspberry', 'Peach']::text[], null::text[], array['Musk', 'Vanilla']::text[]),
  ('Amouage Decision', 'Amouage', 'woody', 2025::smallint, 'unisex', array['Quentin Bisch']::text[], 'Woody Aromatic', 'Oman', array['Balsamic', 'Fresh Spicy', 'Woody', 'Aromatic', 'Amber']::text[], array['Bergamot', 'Pink Pepper', 'Cardamom']::text[], array['Frankincense', 'Juniper Berry', 'Myrrh']::text[], array['Cedarwood', 'Patchouli', 'Vanilla']::text[]),
  ('Byredo Alto Astral', 'Byredo', 'woody', 2025::smallint, 'unisex', array['Jérôme Epinette']::text[], null, 'Sweden', array['Musky', 'Woody', 'Aldehydic', 'Coconut', 'Amber']::text[], array['Coconut Water', 'Aldehydes']::text[], array['Musk', 'Jasmine', 'Incense']::text[], array['Cashmeran', 'Sandalwood', 'Amber']::text[]),
  ('Le Labo Eucalyptus 20', 'Le Labo', 'fresh', 2025::smallint, 'unisex', null::text[], 'Woody Aromatic', 'USA', array['Aromatic', 'Herbal', 'Woody', 'Balsamic', 'Green']::text[], array['Eucalyptus', 'Red Thyme', 'Hyssop', 'Cedarwood', 'Olibanum', 'Labdanum', 'Gurjun Balsam', 'Musk']::text[], null::text[], null::text[]),
  ('Lattafa Asad Elixir', 'Lattafa', 'oriental', 2025::smallint, 'men', null::text[], 'Amber Spicy', 'UAE', array['Warm Spicy', 'Tobacco', 'Amber', 'Woody', 'Vanilla']::text[], array['Pink Pepper', 'Saffron', 'Grapefruit']::text[], array['Tobacco', 'Cedarwood', 'Vanilla']::text[], array['Patchouli', 'Frankincense', 'Cashmeran', 'Amber']::text[]),
  ('Lattafa Khamrah Dukhan', 'Lattafa', 'oriental', 2025::smallint, 'unisex', null::text[], 'Amber Spicy', 'UAE', array['Smoky', 'Warm Spicy', 'Amber', 'Sweet', 'Tobacco']::text[], array['Smoked Spices', 'Pimento', 'Mandarin']::text[], array['Incense', 'Labdanum', 'Orange Blossom', 'Patchouli']::text[], array['Praline', 'Tobacco', 'Amber', 'Tonka Bean', 'Benzoin']::text[]),
  ('Lattafa Eclaire Pistache', 'Lattafa', 'gourmand', 2025::smallint, 'unisex', array['Dalia Izem']::text[], 'Amber Vanilla', 'UAE', array['Nutty', 'Sweet', 'Lactonic', 'Vanilla', 'Coconut']::text[], array['Pistachio']::text[], array['Whipped Cream', 'Cacao', 'Coconut']::text[], array['Vanilla', 'Milk', 'Musk']::text[]),
  ('Rabanne Million Gold Elixir', 'Rabanne', 'oriental', 2025::smallint, 'men', array['Christophe Raynaud', 'Quentin Bisch']::text[], 'Amber Woody', 'Spain', array['Vanilla', 'Woody', 'Amber', 'Balsamic', 'Citrus']::text[], array['Mandarin']::text[], array['Vanilla', 'Cedarwood', 'Benzoin', 'Labdanum']::text[], array['Sandalwood', 'Cypriol', 'Patchouli']::text[])
) as v(name, brand, tier, year, gender, perfumers, olfactory_family, country, accords, top_notes, middle_notes, base_notes)
where not exists (
  select 1 from public.fragrances f
  where f.search_text = regexp_replace(lower(public.immutable_unaccent(v.name)), '[''’`]', '', 'g')
)
on conflict (name) do nothing;

-- The family as the rule in 0038 reads each row. Where 0038 is not applied
-- yet, the older trigger has just set its own answer on insert; an update of
-- `tier` alone does not fire it.
update public.fragrances f
set tier = x.tier
from (values
  ('Chanel Chance Eau Splendide', 'floral'),
  ('Chanel Bleu de Chanel L''Exclusif', 'oriental'),
  ('Chanel Coco Mademoiselle Crush Absolu', 'oriental'),
  ('Dior Miss Dior Essence', 'floral'),
  ('Dior Homme Parfum (2025)', 'oriental'),
  ('Yves Saint Laurent Libre L''Eau Nue', 'fresh'),
  ('Giorgio Armani Acqua di Gio Elixir', 'fresh'),
  ('Carolina Herrera La Bomba', 'floral'),
  ('Jean Paul Gaultier Le Male Elixir Absolu', 'fresh'),
  ('Valentino Uomo Born in Roma Extradose', 'woody'),
  ('Prada Paradoxe Radical Essence', 'floral'),
  ('Lancôme Idôle Power', 'floral'),
  ('Guerlain Shalimar L''Essence', 'gourmand'),
  ('Hermès Barénia Eau de Parfum Intense', 'woody'),
  ('Tom Ford Black Orchid Reserve', 'woody'),
  ('Givenchy Gentleman Society Eau de Parfum Ambrée', 'woody'),
  ('Dolce&Gabbana Devotion Pour Homme', 'fresh'),
  ('Azzaro Forever Wanted Elixir', 'woody'),
  ('Hugo Boss Boss Bottled Beyond', 'woody'),
  ('Mugler Alien Pulp', 'floral'),
  ('Kilian Her Majesty', 'woody'),
  ('Creed Eladaria', 'floral'),
  ('Parfums de Marly Castley', 'fresh'),
  ('Parfums de Marly Valaya Exclusif', 'floral'),
  ('Maison Francis Kurkdjian Kurky', 'gourmand'),
  ('Amouage Decision', 'woody'),
  ('Byredo Alto Astral', 'woody'),
  ('Le Labo Eucalyptus 20', 'fresh'),
  ('Lattafa Asad Elixir', 'oriental'),
  ('Lattafa Khamrah Dukhan', 'oriental'),
  ('Lattafa Eclaire Pistache', 'gourmand'),
  ('Rabanne Million Gold Elixir', 'oriental')
) as x(name, tier)
where f.name = x.name and f.source = 'curated' and f.year >= 2025 and f.tier <> x.tier;
