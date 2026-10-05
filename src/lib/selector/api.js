// Catalog access for the Scent Selector: ONE request for the candidate pool,
// cached for the page view. The pool is then profiled and ranked in the
// browser; nothing here runs per render.
//
// Preferred: the selector_candidates() database function (migration 0018):
// the most popular, the best rated and a popularity-neutral sample of
// fragrances sharing the target accords. Until that migration is applied to
// a project, the function is missing and we fall back to the most popular
// matches alone (the pool this feature first shipped with).
import { supabase } from "../supabaseClient";
import { SCORING } from "./config";
import { profilesFromRows } from "./index";

export const COLUMNS = "id,name,tier,source,brand,gender,year,rating,popularity,image_url,accords,top_notes,middle_notes,base_notes,olfactory_family";
const pools = new Map();

// PostgREST answers a missing function with PGRST202 (404).
const missingFunction = (error) => error?.code === "PGRST202" || error?.code === "42883" || error?.status === 404;

async function load(accords, limit) {
  const wide = await supabase.rpc("selector_candidates", { target: accords, lim: limit }).select(COLUMNS);
  if (!wide.error) return wide.data;
  if (!missingFunction(wide.error)) throw wide.error;
  const { data, error } = await supabase.from("fragrances").select(COLUMNS)
    .eq("status", "approved").overlaps("accords", accords)
    .order("popularity", { ascending: false, nullsFirst: false }).limit(limit);
  if (error) throw error;
  return data;
}

/** Candidate profiles for these accords. Rejects on a network/database error (not cached). */
export function fetchCandidates(accords, limit = SCORING.candidateLimit) {
  const list = [...new Set(accords)].filter(Boolean).sort();
  const key = `${limit}:${list.join("|")}`;
  if (pools.has(key)) return pools.get(key);
  const request = load(list, limit).then(profilesFromRows);
  pools.set(key, request);
  request.catch(() => pools.delete(key));
  return request;
}
