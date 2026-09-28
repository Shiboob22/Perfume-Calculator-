import { supabase } from "./supabaseClient";
import { authHeaders, apiError } from "./fragranceApi";
import { EXPORT_TABLES } from "./exportData";

// Profile, waitlist and export read and write straight through Supabase:
// each table is owner-only under RLS (supabase/tests/rls_isolation.sql), so
// the user's own session can only ever touch their own rows. Deleting the
// account needs the service role and goes through /api/account.

const PROFILE_FIELDS = "locale, default_unit, default_bottle, digits, onboarded_at";

// The user's profile, or null if they have never saved one.
export async function getProfile() {
  const { data, error } = await supabase.from("profiles").select(PROFILE_FIELDS).maybeSingle();
  if (error) throw error;
  return data;
}

// Merge `changes` into the profile, creating it on first save.
export async function saveProfile(changes) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ user_id: user.id, ...changes, updated_at: new Date().toISOString() })
    .select(PROFILE_FIELDS)
    .single();
  if (error) throw error;
  return data;
}

export async function onWaitlist() {
  const { data, error } = await supabase.from("pro_waitlist").select("created_at").maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

// Joining twice is fine: the second insert hits the primary key and counts
// as already joined.
export async function joinWaitlist(locale) {
  const { error } = await supabase.from("pro_waitlist").insert({ locale });
  if (error && error.code !== "23505") throw error;
}

// Tables keyed by a catalog id also fetch the fragrance's name.
const SELECT = { inventory: "*, fragrances(name)", fragrance_notes: "*, fragrances(name)" };
// The hosted API returns at most 1000 rows per request; page through, in a
// stable order (a unique column) so no row moves between pages.
const PAGE = 1000;
const ORDER = { batches: "id", inventory: "fragrance_id", fragrance_notes: "fragrance_id", calc_presets: "id", profiles: "user_id" };

async function fetchAll(table) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select(SELECT[table] || "*").order(ORDER[table]).range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE) return rows;
  }
}

// Every row the user owns, table by table, for the export.
export async function fetchExport() {
  const results = await Promise.all(EXPORT_TABLES.map(fetchAll));
  return Object.fromEntries(EXPORT_TABLES.map((table, i) => [table, results[i]]));
}

export async function deleteAccount(confirm) {
  const res = await fetch("/api/account", {
    method: "DELETE",
    headers: await authHeaders(),
    body: JSON.stringify({ confirm }),
  });
  if (!res.ok) throw await apiError(res);
}
