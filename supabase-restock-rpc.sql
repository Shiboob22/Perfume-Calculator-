-- Atomic restock for the inventory table.
--
-- Replaces the previous read-modify-write in api/inventory.ts (PATCH), which
-- could lose concurrent restocks: two overlapping requests both read the old
-- stock, each added its delta, and the second write clobbered the first.
--
-- This performs the add inside a single UPDATE statement. Postgres takes a row
-- lock for the duration of the statement, so `stock_g + p_delta` reads and
-- writes the row indivisibly — concurrent restocks serialize and none is lost.
--
-- Matches the live (multi-user) inventory schema: rows keyed by
-- (user_id, fragrance_id). Restocks only an existing row; returns the updated
-- row, or no rows if the item does not exist for that user.

create or replace function restock_inventory(
  p_user_id uuid,
  p_fragrance_id uuid,
  p_delta numeric
)
returns inventory
language sql
as $$
  update inventory
     set stock_g = stock_g + p_delta,
         updated_at = now()
   where user_id = p_user_id
     and fragrance_id = p_fragrance_id
  returning *;
$$;
