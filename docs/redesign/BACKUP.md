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

The schema alone is already in `supabase/migrations/0000`–`0020`; this adds the data (36 batches at last count, the owner's Pro plan, 81,823 catalog rows).
