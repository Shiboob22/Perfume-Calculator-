-- Stock can never go below zero. A restock/adjust that would overdraw an oil
-- stops at 0 (the API already refuses negative absolute stock and thresholds).
-- NOT VALID: existing rows are left exactly as they are; the check applies to
-- every insert/update from now on. Applied to staging and production 2026-10-10
-- on the owner's instruction.

create or replace function public.restock_inventory(p_user_id uuid, p_fragrance_id uuid, p_delta numeric)
returns public.inventory
language sql
as $$
  update inventory
     set stock_g = greatest(stock_g + p_delta, 0),
         updated_at = now()
   where user_id = p_user_id
     and fragrance_id = p_fragrance_id
  returning *;
$$;

alter table public.inventory
  add constraint inventory_stock_non_negative check (stock_g >= 0) not valid;
