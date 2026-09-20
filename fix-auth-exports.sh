#!/bin/bash
echo "=== Fixing exports in src/lib/auth.js ==="
cat << 'AUTH_EOF' > src/lib/auth.js
import { supabase } from './supabaseClient'

export { supabase }

export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) throw error
  return session
}

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

echo "✅ Added missing exports (getSession, supabase) to src/lib/auth.js"
pkill -f "vite" 2>/dev/null || true
npm run dev
