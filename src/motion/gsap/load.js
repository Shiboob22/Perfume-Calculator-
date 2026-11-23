import { flagOn } from "../../lib/flags.js";
import { reportError } from "../../lib/reportError.js";
import { motionOn, reduced, lowPower } from "../env.js";
import { registerEases } from "./ease.js";

// GSAP for the app rooms, loaded on demand so no route pays for it up front.
// Off with the `roommotion` flag off, the motion layer off, reduced motion or
// low power: callers get null and keep the static page.

/** Pure gate, so the rules are testable. */
export function gsapAllowed({ on = motionOn(), flag = flagOn("roommotion"), isReduced = reduced(), low = lowPower() } = {}) {
  return Boolean(on) && Boolean(flag) && !isReduced && !low;
}

const defaultImporter = () => Promise.all([import("gsap"), import("gsap/ScrollTrigger"), import("gsap/Flip")]);

let loaded = null;
let promise = null;
let reported = false;

/** The modules once a load has resolved, else null. Synchronous. */
export const peekGsap = () => loaded;

/** Test hook: forgets the cache. */
export function _resetGsap() { loaded = promise = null; reported = false; }

/** Loads GSAP once. Resolves null when not allowed or when the chunk fails (reported once). */
export function loadGsap({ importer = defaultImporter, report = (e) => reportError(e), allow } = {}) {
  if (!gsapAllowed(allow)) return Promise.resolve(null);
  if (promise) return promise;
  promise = importer().then(([g, st, fl]) => {
    const gsap = g.gsap ?? g.default;
    gsap.registerPlugin(st.ScrollTrigger, fl.Flip);
    registerEases(gsap);
    return (loaded = { gsap, ScrollTrigger: st.ScrollTrigger, Flip: fl.Flip });
  }).catch((e) => {
    promise = null;
    if (!reported) { reported = true; report(Object.assign(new Error("gsap-load"), { cause: e })); }
    return null;
  });
  return promise;
}
