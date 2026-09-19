const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// 1. Parse .env and .env.local manually
function loadEnv() {
  const env = {};
  ['.env', '.env.local'].forEach((file) => {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      content.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...vals] = trimmed.split('=');
          if (key && vals.length) {
            env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
          }
        }
      });
    }
  });
  return env;
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;

if (!supabaseUrl) {
  console.error('Error: Could not find VITE_SUPABASE_URL in .env or .env.local');
  process.exit(1);
}

// Extract project reference from https://<ref>.supabase.co
const projectRef = supabaseUrl.replace(/^https?:\/\//, '').split('.')[0];
const dbPassword = env.SUPABASE_DB_PASSWORD || process.env.SUPABASE_DB_PASSWORD || 'YOUR_SUPABASE_DB_PASSWORD';

if (dbPassword === 'YOUR_SUPABASE_DB_PASSWORD') {
  console.log('\n--- ATTENTION REQUIRED ---');
  console.log('Please pass your Supabase DB password or set SUPABASE_DB_PASSWORD in .env.local');
  console.log('You can find your password in Supabase Dashboard -> Project Settings -> Database.');
  process.exit(1);
}

const connectionString = `postgres://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`;
const client = new Client({ connectionString });

async function runMigration() {
  try {
    await client.connect();
    console.log('Connected to Supabase Postgres...');

    const sql = `
      DO $$ 
      BEGIN 
        -- Rename fragrance_name to name if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory' AND column_name='fragrance_name') THEN
          ALTER TABLE inventory RENAME COLUMN fragrance_name TO name;
        -- Rename oil_name to name if it exists
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory' AND column_name='oil_name') THEN
          ALTER TABLE inventory RENAME COLUMN oil_name TO name;
        -- Add name column if missing entirely
        ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory' AND column_name='name') THEN
          ALTER TABLE inventory ADD COLUMN name text;
        END IF;

        -- Ensure stock_g column exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory' AND column_name='stock_g') THEN
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory' AND column_name='stock') THEN
            ALTER TABLE inventory RENAME COLUMN stock TO stock_g;
          ELSE
            ALTER TABLE inventory ADD COLUMN stock_g numeric DEFAULT 0;
          END IF;
        END IF;
      END $$;
    `;

    await client.query(sql);
    console.log('Schema migration completed successfully! Columns aligned to "name" and "stock_g".');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await client.end();
  }
}

runMigration();
