#!/bin/bash
echo "=== Stopping any running node/vite processes ==="
pkill -f "vite" 2>/dev/null || true
pkill -f "node" 2>/dev/null || true

echo "=== Checking all files that import supabase or auth ==="
grep -rn "supabase" src/ --exclude-dir=node_modules

echo "=== Writing clean, robust src/lib/auth.js ==="
cat << 'AUTH_EOF' > src/lib/auth.js
import { supabase } from './supabaseClient'

export async function signInWithEmail(email) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  })
  if (error) throw error
  return data
}

export async function signInWithProvider(provider) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin },
  })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
AUTH_EOF

echo "=== Launching Vite Development Server Fresh ==="
npm run dev
