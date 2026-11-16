import { flushSync } from "react-dom";
import { calm, lowPower, motionOn, reduced, supportsViewTransitions } from "./env.js";
import { onScreen } from "./carry.js";

// Route changes. React Router's `viewTransition` option does nothing under
// <BrowserRouter> (only a data router starts one), so the transition is
// started here: the navigation runs inside document.startViewTransition(),
// and the transition's "new state" is taken once the new location has
// committed (PageTransition calls navCommitted()).
//
// M2 (carry): a navigation has a direction (<html data-mo-nav="forward|back|fade">,
// read by motion.css), and it can carry one element to where it opens: the
// source is marked `data-mo-share="<key>"`, the destination
// `data-mo-share-to="<key>"`. Both get the name `mo-share` only while the
// transition runs, one at a time, and only when both are on screen; on a
// low-power device it is a plain cross-fade.

let settle = null; // resolves the transition's update callback
let viaTransition = false; // the last navigation ran inside a View Transition
let clearTimer = 0;

/** Whether a navigation can run as a View Transition right now. */
export const canTransition = () => motionOn() && supportsViewTransitions() && !reduced();

const SHARE = "mo-share";
const esc = (s) => (typeof CSS !== "undefined" && CSS.escape ? CSS.escape(s) : String(s).replace(/["\\]/g, "\\$&"));
const visible = (el) => Boolean(el?.isConnected) && onScreen(el.getBoundingClientRect(), window.innerWidth, window.innerHeight);

/** The element a share starts from: inside (or at) the tapped element, else anywhere on the page. */
function shareSource(key, from) {
  const sel = `[data-mo-share="${esc(key)}"]`;
  const el = (from?.matches?.(sel) ? from : from?.querySelector?.(sel)) ?? document.querySelector(sel);
  return visible(el) ? el : null;
}

/** Moves the name from the source to the destination, once the new state is in the DOM. */
function handOver(src, key) {
  const dest = document.querySelector(`[data-mo-share-to="${esc(key)}"]`);
  if (!visible(dest)) return src.isConnected ? src : null; // nowhere to go: it stays where it is
  src.style.viewTransitionName = "";
  dest.style.viewTransitionName = SHARE;
  return dest;
}

/**
 * Runs `update` inside a View Transition when possible, else just runs it.
 * `ready(resolve)` decides when the new state may be pictured. While it runs,
 * <html data-mo-vt> gives the header, footer and bar their names (so they stay
 * put while the page crossfades; the names are not permanent: a name alone
 * creates a stacking context) and <html data-mo-nav> carries the direction.
 */
function run(update, { direction = "fade", share = null, from = null } = {}) {
  if (!canTransition()) { update(() => {}); return false; }
  const el = document.documentElement;
  // Low power and Motion: Calm cross-fade only: no direction, no shared element travelling.
  const low = lowPower() || calm();
  el.setAttribute("data-mo-vt", "");
  el.setAttribute("data-mo-nav", low ? "fade" : direction);
  const src = share && !low ? shareSource(share, from) : null;
  if (src) src.style.viewTransitionName = SHARE;
  let named = src;
  const t = document.startViewTransition(() => new Promise((resolve) => {
    let once = false;
    const go = () => { if (once) return; once = true; if (src) named = handOver(src, share); resolve(); };
    update(go);
    // Never hold the page: if the new state does not arrive, let go.
    setTimeout(go, 1000);
  }));
  const done = () => {
    el.removeAttribute("data-mo-vt");
    el.removeAttribute("data-mo-nav");
    if (src) src.style.viewTransitionName = "";
    if (named) named.style.viewTransitionName = "";
  };
  t.finished.then(done, done);
  clearTimeout(clearTimer);
  clearTimer = setTimeout(done, 2500);
  return true;
}

/**
 * Runs `go` (a navigation) inside a View Transition when possible. The new
 * state is pictured when PageTransition reports the location committed.
 * Options: `direction` ("forward", "back", "fade"), `share` (a key) and
 * `from` (the tapped element, to find the share's source in it).
 */
export function startNav(go, opts) {
  const ran = run((resolve) => { settle = resolve; go(); }, opts);
  if (ran) viaTransition = true;
  return ran;
}

/**
 * The same for a change inside one page that is not a navigation (a formula
 * loaded on the Bench): `update` sets React state, flushed at once. Only runs
 * as a transition when the share has a source on screen; otherwise it is
 * just the update (no cross-fade of a page that did not change).
 */
export function carry(update, { share, from } = {}) {
  if (!canTransition() || lowPower() || calm() || !share || !shareSource(share, from)) { update(); return false; }
  return run((resolve) => { flushSync(update); resolve(); }, { direction: "fade", share, from });
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
