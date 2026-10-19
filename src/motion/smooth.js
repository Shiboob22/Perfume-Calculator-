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

// Lenis' destroy() does not cancel its 400 ms velocity-reset timer, which can put
// the `lenis` class back on <html> after teardown. Once that timer has passed and
// no instance is alive, strip whatever `lenis` classes are left.
const LEAK_MS = 450;
let live = 0;
function clearLeakedClasses() {
  if (live > 0) return;
  const el = document.documentElement;
  for (const name of [...el.classList]) {
    if (name === "lenis" || name.startsWith("lenis-")) el.classList.remove(name);
  }
}

/** Starts smooth scrolling when allowed. Returns the function that stops it. */
export function startSmoothScroll() {
  if (typeof window === "undefined" || !smoothAllowed()) return () => {};
  let lenis = null;
  let raf = 0;
  let dead = false;
  const stop = () => {
    cancelAnimationFrame(raf);
    if (!lenis) return;
    lenis.destroy();
    lenis = null;
    live -= 1;
    setTimeout(clearLeakedClasses, LEAK_MS);
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
      live += 1;
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
