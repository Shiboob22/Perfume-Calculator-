import { supabase } from "./supabaseClient";

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error('Not authenticated');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

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
