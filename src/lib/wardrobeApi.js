// The Wardrobe's data (migration 0024), read and written straight from the
// browser: every row is private to its owner by row-level security, and the
// caps (300 bottles, 20,000 wearings) are database triggers. Like presets and
// recipes there is no server route to go through.
import { supabase } from "./supabaseClient";

export async function listBottles() {
  const { data, error } = await supabase.from("wardrobe_bottles").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addBottle(row) {
  const { data, error } = await supabase.from("wardrobe_bottles").insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function updateBottle(id, patch) {
  const { data, error } = await supabase.from("wardrobe_bottles").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteBottle(id) {
  const { error } = await supabase.from("wardrobe_bottles").delete().eq("id", id);
  if (error) throw error;
}

// The newest 5,000 wearings (the log's cap is 20,000; five thousand is
// years of daily wear and one request).
export async function listWear() {
  const { data, error } = await supabase.from("wear_log").select("*").order("worn_on", { ascending: false }).order("created_at", { ascending: false }).limit(5000);
  if (error) throw error;
  return data || [];
}

export async function logWear(row) {
  const { data, error } = await supabase.from("wear_log").insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function deleteWear(id) {
  const { error } = await supabase.from("wear_log").delete().eq("id", id);
  if (error) throw error;
}
