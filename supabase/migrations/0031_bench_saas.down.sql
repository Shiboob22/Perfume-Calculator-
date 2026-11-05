-- Reverses 0031_bench_saas.sql. DESTRUCTIVE: drops recipe ingredients,
-- batch numbers, reminder flags, note tags and trial dates. Show the owner
-- before running it anywhere but staging.
drop function if exists public.start_pro_trial(uuid);

alter table public.batch_checkins drop constraint if exists batch_checkins_tags_check;
alter table public.batch_checkins drop column if exists tags;

drop trigger if exists batches_before_insert_number on public.batches;
drop function if exists public.batch_before_insert_number();
drop index if exists public.batches_user_batch_no_key;
alter table public.batches drop column if exists batch_no, drop column if exists remind;

-- 0023's recipe cap (50 for everyone).
create or replace function public.recipe_before_insert() returns trigger
language plpgsql set search_path = public as $$
begin
  if (select count(*) from public.recipes where user_id = new.user_id) >= 50 then
    raise exception 'too many recipes' using errcode = '54000';
  end if;
  return new;
end $$;

drop table if exists public.recipe_ingredients;
drop function if exists public.recipe_ingredient_before_insert();
drop function if exists public.plan_limit(uuid, text);
drop function if exists public.effective_plan(uuid);

-- A trial row becomes Free again before 'trial' leaves the check.
update public.user_plans set plan_id = 'free', source = 'manual' where source = 'trial';
alter table public.user_plans drop constraint if exists user_plans_source_check;
alter table public.user_plans add constraint user_plans_source_check check (source in ('manual', 'provider'));
alter table public.user_plans drop column if exists trial_started_at, drop column if exists trial_ends_at;

update public.plans set features = array_remove(features, 'journal.reminders') where id = 'pro';
alter table public.plans drop column if exists formula_cap, drop column if exists ingredient_cap, drop column if exists journal_window;
