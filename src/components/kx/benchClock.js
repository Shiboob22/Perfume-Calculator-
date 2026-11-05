import { useEffect, useState, useSyncExternalStore } from "react";
import { rollFrame, restFrame } from "../../lib/calc";
import { reduced } from "../../motion/env.js";

// The bench's one animation clock (Bench SaaS Phase 6). The scale digits, the
// phone's pinned readout and the flacon all read the same frame, so a change
// reads as one gesture. requestAnimationFrame only, and only while something
// moves: the clock stops at the resting frame.
//
// retarget() starts from whatever the display shows right now, so holding
// + or − keeps rolling on from the last value instead of starting from zero.
// The first target, reduced motion and a hidden tab jump straight to rest.

const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => v === b[i]);

export function createBenchClock({ jitter } = {}) {
  let frame = null;
  let from = null;
  let to = null;
  let t0 = 0;
  let raf = 0;
  const subs = new Set();
  const emit = () => subs.forEach((fn) => fn());
  const tick = (now) => {
    frame = rollFrame(from, to, now - t0, jitter);
    raf = frame.done ? 0 : requestAnimationFrame(tick);
    emit();
  };
  const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
  return {
    get: () => frame,
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    retarget(target) {
      const next = target.map((v) => (Number.isFinite(Number(v)) ? Number(v) : 0));
      if (same(next, to)) return;
      const jump = !frame || reduced() || (typeof document !== "undefined" && document.hidden) || typeof requestAnimationFrame !== "function";
      if (jump) { stop(); to = next; frame = restFrame(next); emit(); return; }
      from = frame.values;
      to = next;
      t0 = performance.now();
      if (!raf) raf = requestAnimationFrame(tick);
    },
    stop,
  };
}

/** The clock's current frame; `fallback` (the target) before the first one. */
export function useBenchFrame(clock, fallback) {
  const frame = useSyncExternalStore(clock.subscribe, clock.get, () => null);
  return frame ?? restFrame(fallback);
}

const themeNow = () => {
  if (typeof document === "undefined") return "light";
  const d = document.documentElement.dataset.theme;
  if (d === "light" || d === "dark") return d;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

/** "light" or "dark" as shown now; follows the toggle and the system setting. */
export function useThemeName() {
  const [theme, setTheme] = useState(themeNow);
  useEffect(() => {
    const update = () => setTheme(themeNow());
    const mo = new MutationObserver(update);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    mq?.addEventListener?.("change", update);
    return () => { mo.disconnect(); mq?.removeEventListener?.("change", update); };
  }, []);
  return theme;
}
