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

export async function upsertFragrance(name, tier, source = "custom") {
  const { data, error } = await supabase
    .from("fragrances")
    .upsert({ name: name.trim(), tier, source }, { onConflict: "name" })
    .select()
    .single();
  if (error) throw error;
  return data;
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
  const { data, error } = await supabase
    .from("fragrances")
    .update({ image_url: clean })
    .eq("id", fragranceId)
    .is("image_url", null)
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("This fragrance already has a photo.");
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
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.item;
}

export async function setStock(fragranceId, stockGrams) {
  const headers = await authHeaders();
  const res = await fetch('/api/inventory', {
    method: 'POST',
    headers,
    body: JSON.stringify({ fragrance_id: fragranceId, stock_g: stockGrams }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.item;
}

export async function setLowStockThreshold(fragranceId, thresholdGrams) {
  const headers = await authHeaders();
  const res = await fetch('/api/inventory', {
    method: 'POST',
    headers,
    body: JSON.stringify({ fragrance_id: fragranceId, low_stock_threshold_g: thresholdGrams }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.item;
}
