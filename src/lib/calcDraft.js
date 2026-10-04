// The calculator's inputs, kept for this tab (sessionStorage) so switching
// to Batches and back doesn't wipe a half-entered blend. Closing the tab
// ends the draft. A calculator link always wins over a draft.
const KEY = "sh-calc-draft-v1";

// What a draft may hold, and what each field must look like to be used.
const FIELDS = {
  fragName: "string", tierKey: "string", batchSize: "any", batchUnit: "string", concPct: "any",
  mode: "string", ethanolPricePerL: "any", bottleCost: "any", bottles: "any",
  oilType: "string", pricePerGram: "any", notes: "string",
  actualOilG: "any", actualEthG: "any", blendedBy: "string", blendDate: "string",
  measuredDensity: "number", densities: "object", chosenFamily: "boolean", chosenConc: "boolean",
};

const ok = (type, v) => (type === "any" ? typeof v === "string" || typeof v === "number"
  : type === "object" ? v !== null && typeof v === "object" && !Array.isArray(v)
  : typeof v === type);

/** The fields of `draft` that are known and well-formed. */
export function cleanDraft(draft) {
  if (!draft || typeof draft !== "object") return null;
  const out = {};
  for (const [k, type] of Object.entries(FIELDS)) if (Object.hasOwn(draft, k) && ok(type, draft[k])) out[k] = draft[k];
  return Object.keys(out).length ? out : null;
}

/** True when a calculator link carried any value: then the draft is ignored. */
export function linkCarriesValues(prefill) {
  return Object.values(prefill || {}).some((v) => v != null);
}

export function loadDraft(storage = globalThis.sessionStorage) {
  try { return cleanDraft(JSON.parse(storage?.getItem(KEY) || "null")); } catch { return null; }
}

export function saveDraft(draft, storage = globalThis.sessionStorage) {
  try { storage?.setItem(KEY, JSON.stringify(cleanDraft(draft) || {})); } catch { /* full or blocked: no draft */ }
}

export function clearDraft(storage = globalThis.sessionStorage) {
  try { storage?.removeItem(KEY); } catch { /* blocked */ }
}
