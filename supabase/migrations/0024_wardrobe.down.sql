-- Reverses 0024_wardrobe.sql. Drops the Wardrobe's tables and their data.
drop table if exists public.wear_log;
drop table if exists public.wardrobe_bottles;
drop function if exists public.wear_log_before_insert();
drop function if exists public.wardrobe_bottle_before_update();
drop function if exists public.wardrobe_bottle_before_insert();
