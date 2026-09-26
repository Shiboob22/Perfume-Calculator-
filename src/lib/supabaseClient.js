import { AuthClient } from '@supabase/auth-js'
import { PostgrestClient } from '@supabase/postgrest-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nhfpgjikyolrwmbmqrng.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_oEdeyNJFlNmLV5qLDdAJAw_e-dxc115'

// The app only uses auth and table queries, so this wires those two clients
// together the way createClient() does, without shipping realtime, storage
// and functions (most of supabase-js's weight). Same storage key and defaults
// as createClient(), so existing sign-ins carry over.
export const AUTH_STORAGE_KEY = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`

const auth = new AuthClient({
  url: `${supabaseUrl}/auth/v1`,
  headers: { Authorization: `Bearer ${supabaseAnonKey}`, apikey: supabaseAnonKey },
  storageKey: AUTH_STORAGE_KEY,
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true,
  flowType: 'implicit',
})

// Table queries run as the signed-in user (RLS), else with the anon key.
async function fetchWithAuth(input, init = {}) {
  const { data } = await auth.getSession()
  const headers = new Headers(init.headers)
  if (!headers.has('apikey')) headers.set('apikey', supabaseAnonKey)
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${data.session?.access_token ?? supabaseAnonKey}`)
  }
  return fetch(input, { ...init, headers })
}

const rest = new PostgrestClient(`${supabaseUrl}/rest/v1`, { fetch: fetchWithAuth })

export const supabase = {
  auth,
  from: (table) => rest.from(table),
  rpc: (fn, args, options) => rest.rpc(fn, args, options),
}
