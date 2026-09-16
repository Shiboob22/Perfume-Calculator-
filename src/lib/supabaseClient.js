import { createClient } from "@supabase/supabase-js";

// This client runs in the browser, so it must use the ANON/public key —
// never the service_role key from the FastAPI scraper backend's .env.
// Reads work via the RLS policy in supabase-rls.sql; writes are not
// exposed here on purpose (they go through the backend's service_role
// key, which bypasses RLS).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — copy .env.example to .env and fill them in."
  );
}

export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "");
