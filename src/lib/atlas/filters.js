// The Atlas search form <-> the URL <-> the atlas_search arguments. Pure, so
// a search can be linked, reloaded and tested. Nothing here trusts the URL:
// every value is trimmed, bounded and (for the family) checked.
import { FAMILIES } from "../wardrobe/framework.js";

export const PAGE_SIZE = 24;
export const MAX_PAGE = 500;
const MIN_YEAR = 1700;
const MAX_YEAR = 2100;

const text = (v) => {
  const s = typeof v === "string" ? v.trim().slice(0, 120) : "";
  return s;
};
const year = (v) => {
  const n = Number(v);
  return v !== "" && v != null && Number.isInteger(n) && n >= MIN_YEAR && n <= MAX_YEAR ? n : null;
};

export const EMPTY_FILTERS = Object.freeze({ q: "", family: "", house: "", note: "", accord: "", perfumer: "", from: null, to: null, page: 1 });

/** URLSearchParams (or a query string) → clean filters. */
export function parseFilters(input) {
  const p = input instanceof URLSearchParams ? input : new URLSearchParams(input || "");
  const family = text(p.get("family"));
  const page = Number(p.get("page"));
  let from = year(p.get("from"));
  let to = year(p.get("to"));
  if (from != null && to != null && from > to) [from, to] = [to, from];
  return {
    q: text(p.get("q")),
    family: FAMILIES.includes(family) ? family : "",
    house: text(p.get("house")),
    note: text(p.get("note")),
    accord: text(p.get("accord")),
    perfumer: text(p.get("perfumer")),
    from, to,
    page: Number.isInteger(page) && page >= 1 && page <= MAX_PAGE ? page : 1,
  };
}

/** Filters → the shortest query string that reproduces them. */
export function toParams(filters) {
  const f = { ...EMPTY_FILTERS, ...filters };
  const p = new URLSearchParams();
  for (const k of ["q", "family", "house", "note", "accord", "perfumer"]) if (f[k]) p.set(k, f[k]);
  if (f.from != null) p.set("from", String(f.from));
  if (f.to != null) p.set("to", String(f.to));
  if (f.page > 1) p.set("page", String(f.page));
  return p;
}

/** Filters → the arguments of the atlas_search function. */
export function toRpc(filters, pageSize = PAGE_SIZE) {
  const f = { ...EMPTY_FILTERS, ...filters };
  return {
    p_q: f.q || null, p_note: f.note || null, p_family: f.family || null, p_house: f.house || null,
    p_accord: f.accord || null, p_perfumer: f.perfumer || null,
    p_year_from: f.from, p_year_to: f.to,
    p_limit: pageSize, p_offset: (Math.max(1, f.page) - 1) * pageSize,
  };
}

/** True when nothing narrows the search (the page number doesn't count). */
export const isEmpty = (filters) => !toRpc({ ...filters, page: 1 }) || Object.entries(toRpc({ ...filters, page: 1 })).every(([k, v]) => k === "p_limit" || k === "p_offset" || v == null);

/** Number of pages for a total, at least 1 and never past the cap. */
export const pageCount = (total, pageSize = PAGE_SIZE) => Math.min(MAX_PAGE, Math.max(1, Math.ceil((Number(total) || 0) / pageSize)));
