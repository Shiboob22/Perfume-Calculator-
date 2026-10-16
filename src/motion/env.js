import { TOKENS } from "./config.js";

// What the motion layer may do on this device. Everything reads at use, so
// /dev/motion can override reduced motion and low power (window.__motion) and
// tell the layer with a "mo-env" event.

const root = () => (typeof document === "undefined" ? null : document.documentElement);

/** The layer is switched on (the `motion` flag sets <html data-motion>). Always false on the server. */
export const motionOn = () => Boolean(root()?.hasAttribute("data-motion"));

/** The reader asked for less motion (or /dev/motion says so). */
export function reduced() {
  if (typeof window === "undefined") return true;
  const o = window.__motion?.reduce;
  return o ?? (typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches);
}

/** Save-Data, or few cores (or /dev/motion says so). */
export function lowPower() {
  if (typeof window === "undefined") return false;
  const o = window.__motion?.low;
  if (o != null) return o;
  const n = navigator;
  return Boolean(n.connection?.saveData) || (n.hardwareConcurrency > 0 && n.hardwareConcurrency <= TOKENS.lowPowerCores);
}

/** The browser can run a View Transition. */
export const supportsViewTransitions = () => typeof document !== "undefined" && typeof document.startViewTransition === "function";

/** Keeps <html data-mo-low> in step with lowPower() (CSS drops parallax under it). */
export function syncEnv() {
  const el = root();
  if (!el) return;
  if (lowPower()) el.setAttribute("data-mo-low", ""); else el.removeAttribute("data-mo-low");
}
