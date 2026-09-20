#!/bin/bash
echo "===================================================="
echo "Instructions to get your Supabase URL & Anon Key:"
echo "===================================================="
echo "1. Go to your Supabase Dashboard (https://app.supabase.com)"
echo "2. Open your project."
echo "3. Go to Project Settings (the gear icon on the left sidebar)."
echo "4. Click on 'API' under Project Settings."
echo "5. Copy your 'Project URL' and 'anon public' API key."
echo "===================================================="
echo ""

read -p "Paste your Supabase Project URL: " SUPABASE_URL
read -p "Paste your Supabase Anon Key: " SUPABASE_KEY

if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_KEY" ]; then
  cat << ENV_EOF > .env.local
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_KEY
ENV_EOF
  echo ""
  echo "✅ Success! .env.local has been updated with your Supabase credentials."
  echo "Restarting your Vite development server..."
  pkill -f "vite" 2>/dev/null || true
  npm run dev
else
  echo "❌ Error: Empty values provided. Please run the script again."
fi
