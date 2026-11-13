-- Undo 0035. DESTRUCTIVE: drops every seller's order queue (buyer names, sizes, statuses).
update public.plans set features = array_remove(features, 'orders') where id = 'pro';
drop table if exists public.seller_orders;
