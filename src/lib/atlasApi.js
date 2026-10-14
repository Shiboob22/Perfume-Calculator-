// The Atlas's data: the catalog through atlas_search and the entity views
// (migration 0025), read straight from the browser. Only signed-in users can
// call any of it. Contributions land as pending rows; moderation is admin-only
// functions. Nothing here writes the catalog directly.
import { supabase } from "./supabaseClient";
import { ENTITY } from "./atlas/entities.js";
import { toRpc } from "./atlas/filters.js";

/** One page of results: { rows, total }. */
export async function searchAtlas(filters) {
  const { data, error } = await supabase.rpc("atlas_search", toRpc(filters));
  if (error) throw error;
  const rows = data || [];
  return { rows, total: rows.length ? Number(rows[0].total) : 0 };
}

export async function getFragrance(id) {
  const { data, error } = await supabase.from("fragrances").select("*").eq("id", id).eq("status", "approved").maybeSingle();
  if (error) throw error;
  return data;
}

/** { basis, similar: [...], same_brand: [...] } or null (the existing similar_fragrances function). */
export async function getRelated(id) {
  const { data, error } = await supabase.rpc("similar_fragrances", { p_id: id });
  if (error) throw error;
  return data;
}

/** Anonymous community counts: { shown, owners?, wearers?, occasions? }. */
export async function getWearStats(id) {
  const { data, error } = await supabase.rpc("atlas_wear_stats", { p_id: id });
  if (error) throw error;
  return data;
}

/** The biggest houses, notes, accords or perfumers (optionally filtered by a typed word). */
export async function listEntities(kind, { q = "", limit = 60 } = {}) {
  const view = ENTITY[kind].view;
  let query = supabase.from(view).select("key, name, fragrances").order("fragrances", { ascending: false }).order("name").limit(limit);
  const word = q.trim().toLowerCase().replace(/[%_*,()\\]/g, " ").trim();
  if (word) query = query.ilike("key", `%${word}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/** One entity's own row (house years and rating, note layers), or null. */
export async function getEntity(kind, key) {
  const { data, error } = await supabase.from(ENTITY[kind].view).select("*").eq("key", key).maybeSingle();
  if (error) throw error;
  return data;
}

/** Arabic names for notes, accords, houses and perfumers (empty until an admin adds some). */
export async function listTerms() {
  const { data, error } = await supabase.from("atlas_terms").select("kind, key, ar").limit(5000);
  if (error) throw error;
  return data || [];
}

export async function submitFragrance(payload) {
  const { data, error } = await supabase.rpc("atlas_submit", { p: payload });
  if (error) throw error;
  return data;
}

export async function isAdmin() {
  const { data, error } = await supabase.rpc("is_admin");
  if (error) throw error;
  return data === true;
}

export async function getQueue() {
  const { data, error } = await supabase.rpc("atlas_queue");
  if (error) throw error;
  return data || [];
}

export async function reviewFragrance(id, approve) {
  const { error } = await supabase.rpc("atlas_review", { p_id: id, p_approve: approve });
  if (error) throw error;
}

export async function refreshAtlas() {
  const { error } = await supabase.rpc("atlas_refresh");
  if (error) throw error;
}

// The opt-in for anonymous community counts lives on the profile. It is read
// and written on its own so the rest of the profile code never depends on the
// column (it exists only once 0025 is on the database).
export async function getWearOptIn() {
  const { data, error } = await supabase.from("profiles").select("wear_stats_opt_in").maybeSingle();
  if (error) throw error;
  return data?.wear_stats_opt_in === true;
}

export async function setWearOptIn(value) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("profiles").upsert({ user_id: user.id, wear_stats_opt_in: !!value, updated_at: new Date().toISOString() });
  if (error) throw error;
}
