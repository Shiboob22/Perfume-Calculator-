-- 0034 · Free keeps every saved formula it had before the Bench SaaS round.
--
-- Before 0031, every user, Free or Pro, could save up to 50 recipes (the
-- runaway guard in 0023). 0031 set the Free plan's formula_cap to 5, which
-- took saving away from Free users. The owner's rule for this round: a limit
-- that reduces what a Free user can do today is not applied. So Free goes
-- back to no plan limit: formula_cap null, the same as Pro. The 50-per-user
-- guard in the insert trigger (0031: coalesce(plan_limit(...), 50)) still
-- applies to every plan, as it did before.
--
-- One row of `plans` changes; no user data is touched. Re-runnable.

update public.plans set formula_cap = null where id = 'free' and formula_cap is not null;
