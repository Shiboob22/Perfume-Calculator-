import { TOKENS } from "../config.js";

const PROPS = new Set(["x", "y", "xPercent", "yPercent", "scale", "scaleX", "scaleY", "rotation", "opacity"]);
const CONTROL = new Set(["duration", "ease", "delay", "stagger", "overwrite", "immediateRender", "paused", "force3D", "clearProps", "absolute", "nested", "scrollTrigger", "onComplete", "onStart", "onUpdate", "onReverseComplete", "startAt", "id", "data"]);
const EASES = new Set(["kx.out", "kx.inOut", "none"]);

/** A fake GSAP: every tween/set/Flip call is recorded in `calls`; matchMedia runs its handler at once. */
export function stubGsap() {
  const calls = [];
  const rec = (fn) => (targets, vars, to) => {
    const c = { fn, targets, vars: fn === "fromTo" ? to : vars };
    if (fn === "fromTo") c.from = vars;
    calls.push(c);
    return { kill() {} };
  };
  const tl = () => {
    const t = { to: rec("tl.to"), from: rec("tl.from"), fromTo: rec("tl.fromTo"), set: rec("tl.set") };
    for (const k of Object.keys(t)) { const f = t[k]; t[k] = (...a) => (f(...a), t); }
    return t;
  };
  const mms = [];
  const gsap = {
    to: rec("to"), from: rec("from"), fromTo: rec("fromTo"), set: rec("set"), timeline: tl,
    registerPlugin() {}, registerEase() {},
    matchMedia() {
      const mm = {
        added: [], reverted: 0, cleanup: null,
        add(query, fn, scope) { mm.added.push({ query, scope }); mm.cleanup = fn(); },
        revert() { mm.reverted++; if (typeof mm.cleanup === "function") mm.cleanup(); mm.cleanup = null; },
      };
      mms.push(mm);
      return mm;
    },
  };
  const Flip = {
    getState: (targets) => ({ targets }),
    from(state, vars) { calls.push({ fn: "Flip.from", targets: state.targets, vars }); return { kill() { Flip.killed = (Flip.killed || 0) + 1; } }; },
  };
  const ScrollTrigger = { create: (vars) => { calls.push({ fn: "ScrollTrigger.create", targets: null, vars }); return { kill() {} }; } };
  return { gsap, Flip, ScrollTrigger, calls, mms };
}

const closeTo = (a, b) => Math.abs(a - b) < 1e-9;

function durationOk(d) {
  const { duration, stagger } = TOKENS;
  return Object.values(duration).some((t) => {
    for (let k = 0; k <= stagger.max; k++) if (closeTo(d, (t + k * stagger.step) / 1000)) return true;
    return false;
  });
}

function check(vars, where) {
  for (const [k, v] of Object.entries(vars ?? {})) {
    if (!PROPS.has(k) && !CONTROL.has(k)) throw new Error(`${where}: prop "${k}" is not allowed (transform and opacity only)`);
    if (k === "rotation" && Math.abs(v) > 1) throw new Error(`${where}: rotation ${v} is over 1 degree`);
    if (k === "ease" && !EASES.has(v)) throw new Error(`${where}: ease "${v}" is not kx.out, kx.inOut or none`);
    if (k === "duration" && !durationOk(v)) throw new Error(`${where}: duration ${v} is not a token (in seconds) or a token plus stagger steps`);
  }
}

/** Throws when a recorded call breaks the global motion rules. */
export function assertSceneRules(calls) {
  calls.forEach((c, i) => {
    if (c.fn.startsWith("ScrollTrigger")) return;
    check(c.from, `call ${i} (${c.fn}) from`);
    check(c.vars, `call ${i} (${c.fn})`);
  });
}
