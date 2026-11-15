// Motion M6, control: how much the site moves on this device, chosen by the
// reader in More and Account. Three levels (D2):
//   full  everything the grammar allows;
//   calm  feedback (presses, saved states, sheets) and cross-fades stay;
//         travel (page slides, rows sliding, words rising), the signature,
//         pointer effects and the scroll scenes go;
//   off   nothing moves, as under the system's Reduce motion.
// Kept on the device (localStorage), applied before first paint by the inline
// script in index.html as <html data-mo-level="calm|off"> (no attribute is
// full). With no choice made, a device that asks for reduced motion starts on
// calm, and its own setting still stills the CSS whatever the choice.

export const LEVELS = Object.freeze(["full", "calm", "off"]);
export const LEVEL_KEY = "kyphira.motion";

const valid = (v) => (LEVELS.includes(v) ? v : null);

/** The stored choice, or null when none (or storage is blocked). */
export function storedLevel(storage) {
  try { return valid(storage?.getItem(LEVEL_KEY) ?? null); } catch { return null; }
}

/** The level in force: the stored choice, else calm when the device asks for less motion, else full. */
export function resolveLevel({ stored = null, systemReduce = false } = {}) {
  return valid(stored) ?? (systemReduce ? "calm" : "full");
}

/** Writes the level onto an element (<html>): full removes the attribute. */
export function applyLevel(el, level) {
  if (!el) return;
  if (level === "calm" || level === "off") el.setAttribute("data-mo-level", level);
  else el.removeAttribute("data-mo-level");
}

const doc = () => (typeof document === "undefined" ? null : document.documentElement);
const systemReduce = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const store = () => { try { return globalThis.localStorage ?? null; } catch { return null; } };

/** The level on this page now. */
export function currentLevel() {
  return resolveLevel({ stored: storedLevel(store()), systemReduce: systemReduce() });
}

/** The level written on <html> (what CSS sees): "full" when no attribute. */
export const pageLevel = () => valid(doc()?.getAttribute("data-mo-level")) ?? "full";

/**
 * Saves a choice, applies it at once and tells the layer and the home scene
 * (the "mo-env" and "cmp-env" events they already listen to).
 */
export function setLevel(level) {
  const v = valid(level);
  if (!v) return;
  try { store()?.setItem(LEVEL_KEY, v); } catch { /* private mode: applies to this page only */ }
  applyLevel(doc(), v);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("mo-env"));
    window.dispatchEvent(new Event("cmp-env"));
  }
}
