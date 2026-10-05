// The unfinished assessment, kept in this browser so nothing is lost to a
// reload or a tab switch. Reads are validated; storage may be missing or full.
import { QUESTIONS } from "./questions";
import { profileFromRow } from "./index";

const KEY = "sh-selector-draft-v1";
const ROW_FIELDS = ["id", "name", "brand", "tier", "accords", "top_notes", "middle_notes", "base_notes", "olfactory_family", "image_url", "year", "rating", "popularity"];
export const LAST_STEP = QUESTIONS.length + 1; // 0 intro · 1..N questions · N+1 results

const slim = (row) => Object.fromEntries(ROW_FIELDS.filter((k) => row?.[k] != null).map((k) => [k, row[k]]));

export function serializeDraft({ step, answers, known }) {
  return JSON.stringify({ v: 1, step, answers, known: known.map((k) => ({ status: k.status, row: slim(k.profile.row) })) });
}

/** A draft from stored text, or null if it is absent or unusable. */
export function parseDraft(text) {
  try {
    const d = JSON.parse(text);
    if (!d || d.v !== 1 || typeof d.answers !== "object" || d.answers === null || Array.isArray(d.answers)) return null;
    const step = Number.isInteger(d.step) ? Math.min(Math.max(d.step, 0), LAST_STEP) : 0;
    const known = (Array.isArray(d.known) ? d.known : [])
      .filter((k) => ["loved", "disliked", "unsure"].includes(k?.status))
      .map((k) => ({ status: k.status, profile: profileFromRow(k.row) }))
      .filter((k) => k.profile);
    return { step, answers: d.answers, known };
  } catch {
    return null;
  }
}

export function loadDraft() {
  try { return parseDraft(localStorage.getItem(KEY)); } catch { return null; }
}
export function saveDraft(draft) {
  try { localStorage.setItem(KEY, serializeDraft(draft)); } catch { /* private mode or full: carry on */ }
}
export function clearDraft() {
  try { localStorage.removeItem(KEY); } catch { /* nothing to clear */ }
}
