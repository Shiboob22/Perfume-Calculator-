// The Atlas's addresses and entity kinds. No imports: pages and tests read it.
//   /atlas                     search
//   /atlas/browse              houses, notes, accords, perfumers
//   /atlas/fragrance/<id>      one fragrance
//   /atlas/<kind>/<key>        a house, note, accord or perfumer
//   /atlas/contribute          suggest a fragrance
//   /atlas/review              the moderation queue (admins)
export const ENTITY_KINDS = ["house", "note", "accord", "perfumer"];

// Entity kind → the atlas_search filter argument, the materialized view that
// lists it, and the filter field name on the search form.
export const ENTITY = {
  house: { view: "atlas_houses", rpc: "p_house", field: "house" },
  note: { view: "atlas_notes", rpc: "p_note", field: "note" },
  accord: { view: "atlas_accords", rpc: "p_accord", field: "accord" },
  perfumer: { view: "atlas_perfumers", rpc: "p_perfumer", field: "perfumer" },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const entityHref = (kind, key) => `/atlas/${kind}/${encodeURIComponent(String(key).toLowerCase())}`;
export const fragranceHref = (id) => `/atlas/fragrance/${id}`;

/** pathname → which view and what it needs. Anything unknown is the search. */
export function parseAtlasPath(pathname) {
  const parts = String(pathname).replace(/\/+$/, "").split("/").filter(Boolean).slice(1); // drop "atlas"
  const [a, b] = parts;
  if (!a) return { view: "search" };
  if (a === "browse") return { view: "browse" };
  if (a === "contribute") return { view: "contribute" };
  if (a === "review") return { view: "review" };
  if (a === "fragrance" && b && UUID.test(b)) return { view: "fragrance", id: b };
  if (ENTITY_KINDS.includes(a) && b) {
    let key = "";
    try { key = decodeURIComponent(b).trim().toLowerCase().slice(0, 120); } catch { key = ""; }
    if (key) return { view: "entity", kind: a, key };
  }
  return { view: "search" };
}

/**
 * The name to show for an entity: the Arabic term if there is one and the
 * page is Arabic, else the catalog's own name.
 * @param terms rows of atlas_terms ({ kind, key, ar })
 */
export function termName(terms, kind, key, locale, fallback) {
  if (locale === "ar") {
    const hit = (terms || []).find((t) => t.kind === kind && t.key === String(key).toLowerCase());
    if (hit?.ar) return hit.ar;
  }
  return fallback ?? key;
}
