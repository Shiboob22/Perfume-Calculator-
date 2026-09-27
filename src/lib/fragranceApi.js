import { supabase } from "./supabaseClient";

export async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error('Not authenticated');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/* ---------------- Fragrances (classification) ---------------- */

// Every word must appear in the accent/apostrophe-folded `search_text`
// column, in any order — same matching as /api/search.
export async function searchFragrances(query, limit = 8) {
  const words = (query || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[%_*,()\\]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6);
  if (words.length === 0) return [];
  let q = supabase.from("fragrances").select("*");
  for (const w of words) q = q.ilike("search_text", `%${w}%`);
  const { data, error } = await q
    .order("priority", { ascending: false })
    .order("popularity", { ascending: false, nullsFirst: false })
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

// Find a fragrance by exact name, or add it as the user's own pending row.
// A database function, because the row may already exist under another
// user or the shared catalog, where the user has no right to write.
export async function ensureFragrance(name, tier) {
  const { data, error } = await supabase.rpc("ensure_fragrance", { p_name: name.trim(), p_tier: tier });
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Could not save this fragrance.");
  return data[0];
}

// Save a Gemini estimate (from lookupFragrance) to the shared catalog.
// ignoreDuplicates: never overwrite an existing curated/scraped row — if the
// name is already there, return that row instead.
export async function saveAiFragrance(estimate) {
  const row = {
    name: estimate.name.trim(),
    tier: estimate.tier,
    source: estimate.source,
    top_notes: estimate.top_notes,
    middle_notes: estimate.middle_notes,
    base_notes: estimate.base_notes,
    accords: estimate.accords,
  };
  const { data, error } = await supabase
    .from("fragrances")
    .upsert(row, { onConflict: "name", ignoreDuplicates: true })
    .select();
  if (error) throw error;
  if (data && data.length > 0) return data[0];
  const existing = await getFragranceByExactName(row.name);
  if (!existing) throw new Error("Could not save to catalog.");
  return existing;
}

// Attach a bottle photo to a catalog row that has none (the few perfumes no
// dataset had a photo for). Only fills an empty image_url, never replaces one.
export async function addFragrancePhoto(fragranceId, url) {
  const clean = String(url || "").trim();
  if (!/^https:\/\/\S+$/i.test(clean) || clean.length > 1000) {
    throw new Error("Paste an image link starting with https://");
  }
  // Catalog rows aren't writable by users; this function only fills an
  // empty image_url on a row the caller can see.
  const { data, error } = await supabase.rpc("add_fragrance_photo", { p_id: fragranceId, p_url: clean });
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("This fragrance already has a photo.");
  return data[0];
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
  const headers = await authHeaders();
  const res = await fetch('/api/batches', {
    method: 'POST',
    headers,
    body: JSON.stringify(batch),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.batch;
}

export async function listBatches(limit = 100) {
  const headers = await authHeaders();
  const res = await fetch(`/api/batches?limit=${limit}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.batches || [];
}

export async function deleteBatch(id) {
  const headers = await authHeaders();
  const res = await fetch(`/api/batches?id=${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
}

/* ---------------- Inventory (stock on hand) ---------------- */

export async function listInventory() {
  const headers = await authHeaders();
  const res = await fetch('/api/inventory', { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return (data.items || []).map(item => ({
    fragrance_id: item.fragrance_id,
    stock_g: Number(item.stock_g || 0),
    low_stock_threshold_g: Number(item.low_threshold_g || 10),
    fragrances: { name: item.name, tier: item.tier },
    updated_at: item.updated_at,
  }));
}

export async function adjustInventory(fragranceId, deltaGrams) {
  const headers = await authHeaders();
  const res = await fetch('/api/inventory', {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ fragrance_id: fragranceId, restock_g: deltaGrams }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    // err.code === 'not_tracked': this oil has no inventory row yet.
    throw Object.assign(new Error(err.error || `HTTP ${res.status}`), { status: res.status, code: err.code });
  }
  const data = await res.json();
  return data.item;
}

// POST writes only the fields given: an existing row keeps the rest, a new
// row starts from the column defaults (0 g stock, 10 g threshold).
async function upsertInventory(fields) {
  const headers = await authHeaders();
  const res = await fetch('/api/inventory', {
    method: 'POST',
    headers,
    body: JSON.stringify(fields),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.item;
}

// Start tracking an oil. Leaves stock alone if it is already tracked.
export function trackInventory(fragranceId) {
  return upsertInventory({ fragrance_id: fragranceId });
}

export function setStock(fragranceId, stockGrams) {
  return upsertInventory({ fragrance_id: fragranceId, stock_g: stockGrams });
}

export function setLowStockThreshold(fragranceId, thresholdGrams) {
  return upsertInventory({ fragrance_id: fragranceId, low_stock_threshold_g: thresholdGrams });
}
