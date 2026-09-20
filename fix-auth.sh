#!/bin/bash
# 1. Ensure .env.local has the correct environment variable keys structure if missing
if [ ! -f .env.local ]; then
  echo "Creating .env.local template..."
  echo "VITE_SUPABASE_URL=https://your-project-id.supabase.co" > .env.local
  echo "VITE_SUPABASE_ANON_KEY=your-supabase-anon-key" >> .env.local
  echo "Please update .env.local with your actual Supabase credentials!"
fi

# 2. Kill any running vite processes
echo "Stopping any active local dev servers..."
pkill -f "vite" 2>/dev/null || true

# 3. Clean node_modules cache if needed and restart dev server
echo "Restarting Vite development server..."
npm run dev
