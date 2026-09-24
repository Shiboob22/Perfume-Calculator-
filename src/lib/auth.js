import { supabase } from './supabaseClient'

// Re-export the single shared client; a second createClient() here would spin up
// a competing GoTrueClient on the same auth storage key.
export { supabase }

// Sign in with Email Magic Link
export async function signInWithEmail(email) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin,
    },
  })
  if (error) throw error
  return data
}

// Sign in with OAuth (Google or Apple)
export async function signInWithProvider(provider) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.origin,
    },
  })
  if (error) throw error
  return data
}

// Sign out
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}