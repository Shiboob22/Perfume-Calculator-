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

// Every row the user owns, table by table, for the export.
export async function fetchExport() {
  const results = await Promise.all(EXPORT_TABLES.map((table) => supabase.from(table).select("*")));
  const data = {};
  results.forEach(({ data: rows, error }, i) => {
    if (error) throw error;
    data[EXPORT_TABLES[i]] = rows;
  });
  return data;
}

export async function deleteAccount(confirm) {
  const res = await fetch("/api/account", {
    method: "DELETE",
    headers: await authHeaders(),
    body: JSON.stringify({ confirm }),
  });
  if (!res.ok) throw await apiError(res);
}
