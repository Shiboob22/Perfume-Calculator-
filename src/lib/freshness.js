// Keeps the app on the release that is live (2026-11-13). The service worker
// answers a page from its saved copy when the network is slow (after 3 s) or
// offline, and that copy then keeps running: the owner's phone stayed on a
// release from before the order queue was switched on. So the app asks the
// server which release is live (/version.json, written at build time, never
// cached) when it opens and whenever the tab comes back, and reloads once
// onto a newer one. Pure decisions here; main.jsx wires them to the browser.

export const VERSION_URL = "/version.json";
/** Not more often than this when the tab keeps coming back. */
export const CHECK_EVERY_MS = 60_000;
const RELOADED_KEY = "kyphira.reloadedFor";

/**
 * Whether to reload: only for a real, different release, and only once per
 * release in this tab (if the network serves the old page again, we stop
 * rather than loop). Never in a development build ("local").
 */
export function shouldReload({ built, live, reloadedFor }) {
  if (!built || built === "local" || !live || typeof live !== "string") return false;
  if (live === built) return false;
  return reloadedFor !== live;
}

/** Someone is typing or a sheet is open: wait for the next check rather than lose it. */
export function busy(doc) {
  if (!doc) return false;
  if (doc.querySelector?.("dialog[open]")) return true;
  const el = doc.activeElement;
  return Boolean(el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable));
}

/**
 * One check. Returns what happened: "current", "reloading", "busy",
 * "skipped" (already reloaded for that release) or "failed" (offline,
 * server error); nothing is ever thrown.
 */
export async function checkForUpdate({ built, fetchFn, storage, doc, reload, updateWorker }) {
  let live;
  try {
    const res = await fetchFn(VERSION_URL, { cache: "no-store" });
    if (!res.ok) return "failed";
    live = (await res.json())?.release;
  } catch {
    return "failed";
  }
  let reloadedFor = null;
  try { reloadedFor = storage?.getItem(RELOADED_KEY) ?? null; } catch { /* storage blocked */ }
  if (live === built) return "current";
  if (!shouldReload({ built, live, reloadedFor })) return "skipped";
  if (busy(doc)) return "busy";
  try { storage?.setItem(RELOADED_KEY, live); } catch { /* storage blocked: reload anyway, once */ }
  try { await updateWorker?.(); } catch { /* the page reload still fetches the new release */ }
  reload();
  return "reloading";
}
