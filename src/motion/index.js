import { flagOn } from "../lib/flags.js";
import { syncEnv } from "./env.js";

export { TOKENS, motionVars, staggerIndex, splitWords, countValue } from "./config.js";
export { motionOn, reduced, lowPower, supportsViewTransitions } from "./env.js";
export { Reveal, Stagger, TextReveal, DrawLine, Pin, CountUp, Skeleton, PageTransition, Link, useNavigate } from "./components.jsx";
export { useExit } from "./useExit.js";
export { Light, Magnetic, Tilt, pointerMotion } from "./pointer.jsx";
export { Progress } from "./Progress.jsx";
export { useSmoothScroll } from "./useSmoothScroll.js";

/**
 * Turns the layer on or off for this page: <html data-motion> when the
 * `motion` flag is on, plus the low-power marker. index.html does the same
 * before first paint; this covers a flag set by ?flag=motion in this load.
 */
export function initMotion() {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  if (flagOn("motion")) el.setAttribute("data-motion", ""); else el.removeAttribute("data-motion");
  syncEnv();
  window.addEventListener("mo-env", syncEnv);
}
