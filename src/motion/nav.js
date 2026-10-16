import { motionOn, reduced, supportsViewTransitions } from "./env.js";

// Route changes. React Router's `viewTransition` option does nothing under
// <BrowserRouter> (only a data router starts one), so the transition is
// started here: the navigation runs inside document.startViewTransition(),
// and the transition's "new state" is taken once the new location has
// committed (PageTransition calls navCommitted()).

let settle = null; // resolves the transition's update callback
let viaTransition = false; // the last navigation ran inside a View Transition
let clearTimer = 0;

/** Whether a navigation can run as a View Transition right now. */
export const canTransition = () => motionOn() && supportsViewTransitions() && !reduced();

/**
 * Runs `go` (a navigation) inside a View Transition when possible, else just
 * runs it. <html data-mo-vt> is set while it runs: the header, footer and bar
 * take their view-transition names from it, so they stay put while the page
 * crossfades (the names are not permanent: a name alone creates a stacking context).
 */
export function startNav(go) {
  if (!canTransition()) { go(); return false; }
  const el = document.documentElement;
  el.setAttribute("data-mo-vt", "");
  viaTransition = true;
  const t = document.startViewTransition(() => new Promise((resolve) => {
    settle = resolve;
    go();
    // Never hold the page: if the location does not commit, let go.
    setTimeout(resolve, 1000);
  }));
  const done = () => { el.removeAttribute("data-mo-vt"); };
  t.finished.then(done, done);
  clearTimeout(clearTimer);
  clearTimer = setTimeout(done, 2500);
  return true;
}

/** The new location is in the DOM: the transition may take its picture. */
export function navCommitted() {
  settle?.();
  settle = null;
}

/** True once per navigation that ran as a View Transition (so the fallback fade is skipped for it). */
export function takeViaTransition() {
  const v = viaTransition;
  viaTransition = false;
  return v;
}

/** A plain left click that the router would handle itself (no new tab, no download). */
export function isPlainClick(e, target) {
  return e.button === 0 && !(e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) && (!target || target === "_self");
}
