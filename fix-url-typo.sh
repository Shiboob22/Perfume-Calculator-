#!/bin/bash
# 1. Fix the URL in .env.local
cat << ENV_EOF > .env.local
VITE_SUPABASE_URL=https://nhfpgjikyolrwmbmqrng.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_oEdeyNJF1NmLV5qLDdAJAw_e-dxc115
ENV_EOF

# 2. Fix the URL in supabaseClient.js (restoring standard Vite env loading with the corrected fallback)
cat << 'CLIENT_EOF' > src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nhfpgjikyolrwmbmqrng.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_oEdeyNJF1NmLV5qLDdAJAw_e-dxc115'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
CLIENT_EOF

echo "✅ Corrected the missing 'o' in the Supabase URL."
pkill -f "vite" 2>/dev/null || true
npm run dev
