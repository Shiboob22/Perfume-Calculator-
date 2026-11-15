// Motion M2, carry: continuity between screens. Pure parts, tested in carry.test.js.
//
// Direction has meaning: going deeper into a room moves forward (the new view
// comes in from the end edge), coming out of it moves back (from the start
// edge), and changing room is a cross-fade. "start" and "end" follow the
// reading direction, so Arabic mirrors (the CSS multiplies by --mo-dir).

/** A path's segments, without the query, the hash or the Arabic prefix. */
export function pathSegments(path) {
  const segs = String(path ?? "").split(/[?#]/)[0].split("/").filter(Boolean);
  return segs[0] === "ar" ? segs.slice(1) : segs;
}

/** "forward", "back" or "fade" for a move from one path to another. */
export function navDirection(from, to) {
  const a = pathSegments(from);
  const b = pathSegments(to);
  if (!a.length || !b.length || a[0] !== b[0]) return "fade"; // another room (or home): a cross-fade
  if (b.length > a.length) return "forward";
  if (b.length < a.length) return "back";
  return "fade";
}

/**
 * The direction of a browser back or forward (a POP): React Router keeps the
 * entry's position in history.state.idx. Unknown positions read as back, the
 * common case (the phone's back gesture).
 */
export function popDirection(prevIdx, idx) {
  if (Number.isInteger(prevIdx) && Number.isInteger(idx) && idx > prevIdx) return "forward";
  return "back";
}

/**
 * Where each history entry was scrolled to, so coming back to a list lands
 * where it was left. Keeps the newest `max` entries; `load` and `persist`
 * read and write a JSON string (sessionStorage in the browser).
 */
export function createScrollMemory({ max = 50, load = () => null, persist = () => {} } = {}) {
  const map = new Map();
  try {
    const saved = JSON.parse(load() ?? "[]");
    if (Array.isArray(saved)) for (const [k, y] of saved) if (typeof k === "string" && Number.isFinite(y)) map.set(k, y);
  } catch { /* a broken copy starts empty */ }
  return {
    set(key, y) {
      if (!key || !Number.isFinite(y)) return;
      map.delete(key);
      map.set(key, Math.max(0, Math.round(y)));
      while (map.size > max) map.delete(map.keys().next().value);
    },
    get: (key) => map.get(key),
    flush() { try { persist(JSON.stringify([...map])); } catch { /* storage full or blocked */ } },
    get size() { return map.size; },
  };
}

/** Whether a box (from getBoundingClientRect) is at least partly on a screen of this size. */
export function onScreen(rect, width, height) {
  if (!rect || !(rect.width > 0) || !(rect.height > 0)) return false;
  return rect.bottom > 0 && rect.right > 0 && rect.top < height && rect.left < width;
}
