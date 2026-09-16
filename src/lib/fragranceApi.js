import { supabase } from "./supabaseClient";

/* ---------------- Fragrances (classification) ---------------- */

export async function searchFragrances(query, limit = 8) {
  if (!query || !query.trim()) return [];
  const { data, error } = await supabase
    .from("fragrances")
    .select("*")
    .ilike("name", `%${query.trim()}%`)
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function getFragranceByExactName(name) {
  if (!name || !name.trim()) return null;
  const { data, error } = await supabase
    .from("fragrances")
    .select("*")
    .ilike("name", name.trim())
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertFragrance(name, tier, source = "custom") {
  const { data, error } = await supabase
    .from("fragrances")
    .upsert({ name: name.trim(), tier, source }, { onConflict: "name" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/* ---------------- Personal notes ---------------- */

export async function getFragranceNotes(fragranceId) {
  if (!fragranceId) return null;
  const { data, error } = await supabase
    .from("fragrance_notes")
    .select("*")
    .eq("fragrance_id", fragranceId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveFragranceNotes(fragranceId, { oilType, pricePerGram, notes }) {
  const { data, error } = await supabase
    .from("fragrance_notes")
    .upsert({
      fragrance_id: fragranceId,
      oil_type: oilType || null,
      price_per_gram: pricePerGram || null,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/* ---------------- Batches (production history) ---------------- */

export async function logBatch(batch) {
  const { data, error } = await supabase.from("batches").insert(batch).select().single();
  if (error) throw error;
  return data;
}

export async function listBatches(limit = 100) {
  const { data, error } = await supabase
    .from("batches")
    .select("*")
    .order("blend_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function deleteBatch(id) {
  const { error } = await supabase.from("batches").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- Inventory (stock on hand) ---------------- */

export async function listInventory() {
  const { data, error } = await supabase
    .from("inventory")
    .select("*, fragrances(name, tier)")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// Read-modify-write rather than an atomic SQL increment — keeps the
// logic visible in the app instead of hidden in a DB function, and
// write volume here is low enough (one adjustment per logged batch)
// that a race condition is not a realistic concern for single-user use.
export async function adjustInventory(fragranceId, deltaGrams) {
  const { data: existing, error: readErr } = await supabase
    .from("inventory")
    .select("stock_g")
    .eq("fragrance_id", fragranceId)
    .maybeSingle();
  if (readErr) throw readErr;
  const newStock = Math.max(0, (existing?.stock_g || 0) + deltaGrams);
  const { data, error } = await supabase
    .from("inventory")
    .upsert({ fragrance_id: fragranceId, stock_g: newStock, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function setStock(fragranceId, stockGrams) {
  const { data, error } = await supabase
    .from("inventory")
    .upsert({ fragrance_id: fragranceId, stock_g: stockGrams, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function setLowStockThreshold(fragranceId, thresholdGrams) {
  const { data, error } = await supabase
    .from("inventory")
    .upsert({ fragrance_id: fragranceId, low_stock_threshold_g: thresholdGrams, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}
