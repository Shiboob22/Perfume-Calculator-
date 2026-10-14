# Backup before the first production migration

Supabase free has no backups, and the Kyphira work will add migrations to production. Take a copy first. I (Claude) have no production database password and did not run this; you run it.

Get the connection string from Supabase → project `nhfpgjikyolrwmbmqrng` → Connect → Session pooler (it contains the password). Then, on your Mac:

```bash
# Schema and data of the app's tables, without the 81k-row catalog's search index rebuild cost.
pg_dump "$PROD_DB_URL" --schema=public --no-owner --no-privileges -Fc -f ~/Documents/kyphira-backup/prod-public-$(date +%F).dump

# Auth users (emails, ids) — the app's tables reference them.
pg_dump "$PROD_DB_URL" --schema=auth --data-only --no-owner -Fc -f ~/Documents/kyphira-backup/prod-auth-$(date +%F).dump
```

Check it opened: `pg_restore -l ~/Documents/kyphira-backup/prod-public-*.dump | head`. Keep the folder outside the repo.

The schema alone is already in `supabase/migrations/0000`–`0020`; this adds the data (47 batches on 2026-10-14, the owner's Pro plan, 81,825 catalog rows).

## What was actually taken (2026-10-14)

A data-only export of the user-owned production tables, read through the Supabase connector (no database password needed), saved **outside the repo** at `~/Documents/kyphira-backup/prod-user-data-2026-10-14.json` (mode 600, 0.5 MB):

| Table | Rows |
|---|---|
| batches | 47 |
| batch_checkins | 61 |
| shared_recipes | 1 |
| inventory | 4 |
| fragrance_notes | 20 |
| profiles, user_plans, admins | 1 each |
| plans | 2 |
| calc_presets, pro_waitlist | 0 |
| fragrances (custom + curated only) | 473 |

**Not in it:** the ~81.3k imported catalogue rows (re-importable, not user data), `auth.users`, `rate_limits`, and the schema (already in `supabase/migrations/0000`–`0020`). It is a JSON export, not a restorable `pg_dump`. The `pg_dump` commands above remain the way to get a full restorable copy, and still need your connection string.
