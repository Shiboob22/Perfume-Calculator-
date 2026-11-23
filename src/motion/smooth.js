import { motionOn, reduced, lowPower } from "./env.js";
import { peekGsap } from "./gsap/load.js";
import { flagOn } from "../lib/flags.js";

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

/** Routes that read like a page: the library, the Atlas, the Salon, the Wardrobe and the Nose (and /ar/ forms). */
export const SMOOTH_ROUTES = /^(\/ar)?\/(library|atlas|salon)(\/|$)|^(\/ar)?\/(wardrobe|nose)$/;

const wideFine = () => typeof matchMedia === "function" && matchMedia("(min-width: 1024px) and (pointer: fine)").matches;

/** Pure gate for the rooms: the `roommotion` flag, an allowlisted path, a wide screen with a fine pointer, plus the smoothAllowed rules. */
export function roomSmoothAllowed(pathname, { wide = wideFine(), fine = wide, rooms = flagOn("roommotion"), ...rest } = {}) {
  return Boolean(rooms) && SMOOTH_ROUTES.test(pathname || "") && Boolean(wide) && Boolean(fine) && smoothAllowed(rest);
}

// Sheets and the tour pause smoothing; nested pauses count.
let pauses = 0;
let controller = null;
/** Test hook: the live instance's pause/resume. */
export function _setController(c) { controller = c; pauses = 0; }

/** Stops the live Lenis; the returned function resumes it once every pause has been released. */
export function pauseSmooth() {
  if (++pauses === 1) controller?.pause();
  let done = false;
  return () => {
    if (done) return;
    done = true;
    if (--pauses === 0) controller?.resume();
  };
}

/** Starts smooth scrolling when allowed. Returns the function that stops it. */
export function startSmoothScroll() {
  if (typeof window === "undefined" || !smoothAllowed()) return () => {};
  let lenis = null;
  let raf = 0;
  let dead = false;
  let drive = null; // undoes the GSAP ticker sync
  const halt = () => {
    cancelAnimationFrame(raf);
    drive?.();
    drive = null;
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
  const begin = () => {
    if (dead || lenis || pauses > 0 || !smoothAllowed()) return;
    import("lenis")
      .then(({ default: Lenis }) => {
        if (dead || lenis || pauses > 0 || !smoothAllowed()) return;
        // anchors stay native (a skip link must move focus); no touch smoothing; a sheet scrolls natively.
        lenis = new Lenis({ autoRaf: false, lerp: 0.1, anchors: false, syncTouch: false, prevent: (node) => Boolean(node.closest?.("dialog")) });
        live += 1;
        const g = peekGsap();
        if (g) {
          const cb = (t) => lenis?.raf(t * 1000);
          g.gsap.ticker.add(cb);
          g.gsap.ticker.lagSmoothing(0);
          lenis.on("scroll", g.ScrollTrigger.update);
          drive = () => g.gsap.ticker.remove(cb);
        } else raf = requestAnimationFrame(tick);
      })
      .catch(() => { /* the chunk failed to load: native scroll, nothing lost */ });
  };
  // Kill switch: /dev/motion overrides (mo-env) and a change to the reduced-motion setting.
  const check = () => { if (!smoothAllowed()) halt(); };
  const mq = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
  window.addEventListener("mo-env", check);
  mq?.addEventListener?.("change", check);
  const mine = { pause: halt, resume: begin };
  controller = mine;
  begin();

  return () => {
    dead = true;
    window.removeEventListener("mo-env", check);
    mq?.removeEventListener?.("change", check);
    if (controller === mine) controller = null;
    halt();
  };
}
