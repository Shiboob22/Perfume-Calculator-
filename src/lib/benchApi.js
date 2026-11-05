// The Bench SaaS data functions (src/lib/benchData.ts) bound to the app's
// real clients: the browser's PostgREST client (RLS as the signed-in user)
// and /api with the session token.
import { supabase } from "./supabaseClient";
import { authHeaders } from "./fragranceApi";
import * as data from "./benchData";

export { LimitError, ApiError } from "./benchData";

async function api(path, { method = "GET", body } = {}) {
  return fetch(path, { method, headers: await authHeaders(), body: body === undefined ? undefined : JSON.stringify(body) });
}

export const listFormulas = () => data.listFormulas(supabase);
export const saveFormula = (entitlements, formulasUsed, input) => data.saveFormula(supabase, entitlements, formulasUsed, input);
export const deleteFormula = (id) => data.deleteFormula(supabase, id);
export const logBatch = (batch) => data.logBatch(api, batch);
export const upsertNote = (note) => data.upsertNote(api, note);
export const toggleRemind = (batchId, remind) => data.toggleRemind(api, batchId, remind);
export const startTrial = () => data.startTrial(api);
