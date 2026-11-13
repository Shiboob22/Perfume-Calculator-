-- Undo 0034: the Free plan saves up to 5 formulas again (0031's value).
update public.plans set formula_cap = 5 where id = 'free';
