import { TOKENS } from "./config.js";
import { motionOn } from "./env.js";

// One IntersectionObserver for every entrance, and one for loops that should
// stop while off screen. An entrance plays once: after it fires the element
// is dropped from the observer and keeps data-mo="in" for good.

let entrances = null;
let ambient = null;

function reveal(el) {
  el.setAttribute("data-mo", "in");
  entrances?.unobserve(el);
}

function entranceObserver() {
  if (entrances) return entrances;
  const bottom = Math.round(TOKENS.view.lead * 100);
  entrances = new IntersectionObserver((list) => {
    for (const e of list) {
      // Below the line: wait. In view, or already scrolled past: play (a jump
      // past it plays out of sight).
      if (e.isIntersecting || e.boundingClientRect.top < 0) reveal(e.target);
    }
  }, { rootMargin: `0px 0px -${bottom}% 0px` });
  return entrances;
}

/**
 * Hides `el` and shows it when it is reached, once, if it starts below the
 * fold. On the fold (or with no IntersectionObserver) it is left alone, so the
 * first screen never animates and nothing is ever stuck hidden. Returns a cleanup.
 */
export function watch(el) {
  if (!el || typeof IntersectionObserver === "undefined" || !motionOn()) return undefined;
  const state = el.getAttribute("data-mo");
  // Already played, or set to play on mount: leave it. Already hidden (a
  // re-run of the effect, as React's strict mode does): just watch it again.
  if (state && state !== "hidden") return undefined;
  if (!state) {
    const top = el.getBoundingClientRect().top;
    if (top < window.innerHeight * (1 - TOKENS.view.lead)) return undefined;
    el.setAttribute("data-mo", "hidden");
  }
  const io = entranceObserver();
  io.observe(el);
  return () => io.unobserve(el);
}

/** Pauses a looping animation while the element is off screen (CSS reads data-mo-off). */
export function watchAmbient(el) {
  if (!el || typeof IntersectionObserver === "undefined") return undefined;
  ambient ??= new IntersectionObserver((list) => {
    for (const e of list) {
      if (e.isIntersecting) e.target.removeAttribute("data-mo-off"); else e.target.setAttribute("data-mo-off", "");
    }
  });
  ambient.observe(el);
  return () => ambient.unobserve(el);
}
