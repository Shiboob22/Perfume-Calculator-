-- Undo 0037. Drops every push subscription (people would have to turn push on again).
drop table if exists public.push_subscriptions;
