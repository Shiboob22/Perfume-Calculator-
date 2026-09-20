#!/bin/bash
# Look for where supabaseClient is imported and update it or check files
echo "=== Inspecting client import paths ==="
grep -rn "supabaseClient" src/ || echo "Searching completed."

# Ensure the client is pointing directly to environment variables or fallback correctly
cat << 'CLIENT_EOF' > src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment variables.")
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)
CLIENT_EOF

echo "✅ Updated src/lib/supabaseClient.js to safely read env variables."
pkill -f "vite" 2>/dev/null || true
npm run dev
