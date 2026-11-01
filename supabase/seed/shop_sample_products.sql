-- PLACEHOLDER products for trying the Shop on staging or a preview. Not a
-- migration: do not run this on production. Replace names, photos and prices
-- with the real ones (edit the rows in the Supabase table editor).
insert into public.shop_products (slug, name_en, name_ar, description_en, description_ar, price_egp, variants, sort) values
  ('sample-decant', 'Sample decant (placeholder)', 'عينة صغيرة (تجريبي)',
   'A small decant to try a scent before committing to a full bottle. Placeholder text.',
   'عينة صغيرة لتجربة العطر قبل شراء زجاجة كاملة. نص تجريبي.',
   150, '[{"id":"5ml","label_en":"5 mL","label_ar":"٥ مل","price_egp":150},{"id":"10ml","label_en":"10 mL","label_ar":"١٠ مل","price_egp":260}]'::jsonb, 1),
  ('diy-starter-kit', 'DIY blending kit (placeholder)', 'طقم خلط العطور (تجريبي)',
   'Beaker, pipettes, labels and a printed quick reference. Placeholder text.',
   'كوب قياس وماصات وملصقات ومرجع سريع مطبوع. نص تجريبي.',
   650, '[]'::jsonb, 2),
  ('handbook-vol-3', 'The Scent Handbook, Vol. III: Formulation (placeholder)', 'دليل العطر، المجلد الثالث: التركيب (تجريبي)',
   'The printed handbook on formulating by mass. Placeholder text.',
   'الكتاب المطبوع عن تركيب العطور بالوزن. نص تجريبي.',
   400, '[]'::jsonb, 3)
on conflict (slug) do nothing;
