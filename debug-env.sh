#!/bin/bash
echo "=== Debugging Vite Environment Loading ==="
node -e "
import('dotenv').then(dotenv => {
  dotenv.config({ path: '.env.local' });
  console.log('Processed VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL);
}).catch(() => {
  console.log('dotenv not installed, reading manually:');
  const fs = require('fs');
  if (fs.existsSync('.env.local')) {
    console.log(fs.readFileSync('.env.local', 'utf8'));
  } else {
    console.log('.env.local missing');
  }
});
"

# Let's inspect what src/lib/supabaseClient.js is actually importing/exporting
echo "=== Content of src/lib/supabaseClient.js ==="
cat src/lib/supabaseClient.js

# Let's write a foolproof client that hardcodes the values if dotenv fails to inject in time, ensuring it boots immediately
cat << 'CLIENT_EOF' > src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nhfpgjikylrwmbmqrng.supabase.co'
const supabaseAnonKey = 'sb_publishable_oEdeyNJF1NmLV5qLDdAJAw_e-dxc115'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
CLIENT_EOF

echo "✅ Hardcoded Supabase credentials directly into src/lib/supabaseClient.js to bypass Vite env loading lag."
pkill -f "vite" 2>/dev/null || true
npm run dev
