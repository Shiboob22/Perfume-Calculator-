import { motionOn, reduced, lowPower } from "./env.js";

// Smooth wheel scrolling (Lenis) for the public home page only. It is loaded
// on demand, so no other route pays for it, and it is switched off whenever
// the layer is off, the reader asked for less motion, or the device is
// low-power. Native scroll position stays the source of truth, so the CSS
// view timelines, the Compounding fallback, find-in-page and in-page links
// (focus included) behave exactly as they do without it.

/** Pure gate, so the rules are testable: the layer on, motion allowed, a device with headroom. */
export function smoothAllowed({ on = motionOn(), isReduced = reduced(), low = lowPower() } = {}) {
  return Boolean(on) && !isReduced && !low;
}

/** Starts smooth scrolling when allowed. Returns the function that stops it. */
export function startSmoothScroll() {
  if (typeof window === "undefined" || !smoothAllowed()) return () => {};
  let lenis = null;
  let raf = 0;
  let dead = false;
  const stop = () => {
    cancelAnimationFrame(raf);
    lenis?.destroy();
    lenis = null;
  };
  const tick = (t) => {
    lenis?.raf(t);
    raf = requestAnimationFrame(tick);
  };
  // Kill switch: /dev/motion overrides (mo-env) and a change to the reduced-motion setting.
  const check = () => { if (!smoothAllowed()) stop(); };
  const mq = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
  window.addEventListener("mo-env", check);
  mq?.addEventListener?.("change", check);

  import("lenis")
    .then(({ default: Lenis }) => {
      if (dead || !smoothAllowed()) return;
      // anchors stay native (a skip link must move focus); no touch smoothing.
      lenis = new Lenis({ autoRaf: false, lerp: 0.1, anchors: false, syncTouch: false });
      raf = requestAnimationFrame(tick);
    })
    .catch(() => { /* the chunk failed to load: native scroll, nothing lost */ });

  return () => {
    dead = true;
    window.removeEventListener("mo-env", check);
    mq?.removeEventListener?.("change", check);
    stop();
  };
}
