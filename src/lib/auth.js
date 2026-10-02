import { supabase } from './supabaseClient'

// Re-export the single shared client; a second createClient() here would spin up
// a competing GoTrueClient on the same auth storage key.
export { supabase }

// Sign in with Email Magic Link
export async function signInWithEmail(email) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Back into the app (and to the page they came from, e.g. a guide's
      // "Open in calculator" link), not to the public home page.
      emailRedirectTo: window.location.origin + (window.location.pathname.startsWith('/app') ? window.location.pathname + window.location.search : '/app'),
    },
  })
  if (error) throw error
  return data
}

// Sign in with OAuth (Google)
export async function signInWithProvider(provider) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.origin + (window.location.pathname.startsWith('/app') ? window.location.pathname + window.location.search : '/app'),
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