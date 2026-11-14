-- =====================================================================
-- 0038 checks: classify_family() (family from the stated group and
-- position-weighted accords), its parity with classifyFamily() in
-- api/_lib/tier.ts, and the trigger that keeps fragrances.tier in step.
-- Run against STAGING only (Supabase MCP execute_sql, or psql -f).
-- Any failure raises "FAMILY_RULE FAILED: …"; the block always ends by
-- raising "FAMILY_RULE PASSED …" so the rows it made roll back.
-- =====================================================================
do $$
declare
  checks int := 0;
  sum_sql text;
  fid uuid;
  t text;
  n int;
begin
  -- ------------------------------------------------------- golden cases
  if public.classify_family(array['Woody','Oud','Warm Spicy','Aromatic','Vanilla','Balsamic'], null) <> 'oriental' then raise exception 'FAMILY_RULE FAILED: a late vanilla made a gourmand'; end if; checks := checks + 1;
  if public.classify_family(array['Citrus','Vanilla','Sweet'], null) <> 'gourmand' then raise exception 'FAMILY_RULE FAILED: citrus-led gourmand'; end if; checks := checks + 1;
  if public.classify_family(array['Fresh Spicy','Amber','Citrus','Aromatic','Musky','Woody'], null) <> 'fresh' then raise exception 'FAMILY_RULE FAILED: fresh spicy read as spicy'; end if; checks := checks + 1;
  if public.classify_family(array['Citrus','Woody','Warm Spicy','Aromatic','Amber','Fresh Spicy'], 'Woody Aromatic') <> 'woody' then raise exception 'FAMILY_RULE FAILED: the group vote (Bleu de Chanel)'; end if; checks := checks + 1;
  if public.classify_family(array['Vanilla','Sweet','Tobacco','Warm Spicy','Fruity','Woody'], 'Amber Spicy') <> 'gourmand' then raise exception 'FAMILY_RULE FAILED: accords outvote the group (Tobacco Vanille)'; end if; checks := checks + 1;
  if public.classify_family('{}', 'Leather') <> 'woody' then raise exception 'FAMILY_RULE FAILED: group alone'; end if; checks := checks + 1;
  if public.classify_family(null, 'Amber Vanilla') <> 'gourmand' then raise exception 'FAMILY_RULE FAILED: null accords, gourmand group'; end if; checks := checks + 1;
  if public.classify_family(array['Metallic','Musky'], null) is not null then raise exception 'FAMILY_RULE FAILED: no evidence should be null'; end if; checks := checks + 1;
  if public.classify_family(array['  WARM SPICY '], null) <> 'oriental' then raise exception 'FAMILY_RULE FAILED: case and spaces'; end if; checks := checks + 1;
  if public.classify_family(array['Fougère'], null) <> 'fresh' then raise exception 'FAMILY_RULE FAILED: accents'; end if; checks := checks + 1;
  if public.classify_tier('{}') <> 'fresh' then raise exception 'FAMILY_RULE FAILED: classify_tier fallback'; end if; checks := checks + 1;
  if public.classify_tier(array['Sweet','Woody']) <> 'woody' then raise exception 'FAMILY_RULE FAILED: classify_tier follows the vote'; end if; checks := checks + 1;

  -- ---------------------------------------------- parity with tier.ts
  -- The same 4,000 generated cases and the same checksum as
  -- PARITY_ACCORDS / PARITY_GROUPS / PARITY_CHECKSUM in api/_lib/tier.test.ts.
  with v as (select array['Citrus','Green','Aquatic','Marine','Ozonic','Herbal','Lavender','Tropical','Salty','Fougère',
      'Fresh','Fresh Spicy','Aromatic','Fruity',
      'Floral','White Floral','Yellow Floral','Rose','Violet','Iris','Tuberose','Aldehydic','Powdery',
      'Woody','Earthy','Mossy','Patchouli','Leather','Leathery','Smoky','Conifer','Chypre',
      'Amber','Oriental','Warm Spicy','Soft Spicy','Spicy','Balsamic','Resinous','Oud','Cinnamon',
      'Vanilla','Gourmand','Caramel','Chocolate','Cacao','Coffee','Honey','Praline','Tobacco','Almond',
      'Nutty','Lactonic','Coconut','Creamy','Rum','Whiskey','Sweet',
      'Musky','Animalic','Metallic','Mineral','WARM SPICY',' citrus ','Synthetic']::text[] as v),
  g as (select array[null,'Floral','Floral Fruity','Amber Floral','Amber Woody','Woody Aromatic','Amber Vanilla',
      'Citrus Aromatic','Chypre Floral','Leather','Aromatic Fougère','Floral Fruity Gourmand','Woody Tobacco',
      'Musk','']::text[] as g),
  cases as (
    select i,
      (select coalesce(array_agg(v.v[((i*31 + j*17 + j*j*7) % cardinality(v.v)) + 1] order by j), '{}'::text[])
         from generate_series(0, (i % 12) - 1) j) as accords,
      g.g[((i/12) % cardinality(g.g)) + 1] as grp
    from generate_series(0, 3999) i, v, g)
  select md5(string_agg(coalesce(public.classify_family(accords, grp), '-'), ',' order by i)) into sum_sql from cases;
  if sum_sql <> '2706ee5228dd264575dd2fc1199944cb' then raise exception 'FAMILY_RULE FAILED: checksum % differs from tier.ts', sum_sql; end if; checks := checks + 1;

  -- ------------------------------------------------------------ trigger
  -- Insert: the family follows the evidence, whatever was passed.
  insert into public.fragrances (name, tier, source, status, accords, olfactory_family)
  values ('family-rule-test ' || gen_random_uuid(), 'fresh', 'curated', 'approved', array['Vanilla','Caramel','Sweet'], null)
  returning id, tier into fid, t;
  if t <> 'gourmand' then raise exception 'FAMILY_RULE FAILED: insert kept % for a gourmand', t; end if; checks := checks + 1;

  -- A change of group re-derives it.
  update public.fragrances set olfactory_family = 'Woody Aromatic', accords = array['Woody','Citrus'] where id = fid returning tier into t;
  if t <> 'woody' then raise exception 'FAMILY_RULE FAILED: group change gave %', t; end if; checks := checks + 1;

  -- No evidence: the family already there stays.
  update public.fragrances set olfactory_family = null, accords = array['Metallic'] where id = fid returning tier into t;
  if t <> 'woody' then raise exception 'FAMILY_RULE FAILED: no evidence overwrote the family with %', t; end if; checks := checks + 1;

  -- A family set by hand stays until the evidence changes.
  update public.fragrances set tier = 'floral' where id = fid returning tier into t;
  if t <> 'floral' then raise exception 'FAMILY_RULE FAILED: a hand-set family did not stick'; end if; checks := checks + 1;
  update public.fragrances set year = 2026 where id = fid returning tier into t;
  if t <> 'floral' then raise exception 'FAMILY_RULE FAILED: an unrelated update re-derived the family'; end if; checks := checks + 1;

  -- A typed oil with no accords keeps the family the blender chose.
  insert into public.fragrances (name, tier, source, status)
  values ('family-rule-test ' || gen_random_uuid(), 'oriental', 'custom', 'pending') returning tier into t;
  if t <> 'oriental' then raise exception 'FAMILY_RULE FAILED: a typed oil lost its family'; end if; checks := checks + 1;

  -- ----------------------------------------------------------- backfill
  select count(*) into n from public.fragrances f
   where f.source <> 'custom' and f.name not like 'family-rule-test %'
     and public.classify_family(f.accords, f.olfactory_family) <> f.tier;
  if n <> 0 then raise exception 'FAMILY_RULE FAILED: % catalogue rows differ from the rule', n; end if; checks := checks + 1;

  -- The saved families are out of the API's reach.
  if has_schema_privilege('anon', 'catalog_backup', 'usage') or has_schema_privilege('authenticated', 'catalog_backup', 'usage') then
    raise exception 'FAMILY_RULE FAILED: catalog_backup is open to API roles';
  end if; checks := checks + 1;

  raise exception 'FAMILY_RULE PASSED % checks', checks;
end
$$;
