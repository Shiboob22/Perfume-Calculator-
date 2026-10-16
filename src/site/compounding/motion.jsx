import React, { useEffect } from "react";
import { MOTION_SCENE } from "../../lib/compounding/config";
import { scrollFallback } from "./fallback";

const round = (n) => Math.round(n * 1000) / 1000;

/** The `--a`/`--b` range of a mark (a share of its own view timeline), staggered by index. */
export function rangeStyle(name, i = 0) {
  const [a, b] = MOTION_SCENE.ranges[name];
  const s = (MOTION_SCENE.stagger[name] || 0) * i;
  return { "--a": round(a + s), "--b": round(b + s) };
}

/** The constants the CSS reads, set once on the scene. */
export function sceneVars() {
  const v = { "--m-ease": MOTION_SCENE.ease };
  for (const [k, px] of Object.entries(MOTION_SCENE.distance)) v[`--m-${k}`] = `${px}px`;
  return v;
}

/**
 * A mark's timeline: the box whose passage across the screen is the clock.
 * It never moves itself (marks inside it do), so it can be measured by the
 * fallback without the motion feeding back into the reading.
 */
export function V({ as: Tag = "div", ...rest }) {
  return <Tag data-vt="" {...rest} />;
}

/** A mark: an element that animates on its nearest `V` timeline. `kf` names its keyframes. */
export function M({ as: Tag = "div", kf, range = kf, i = 0, className = "", style, ...rest }) {
  return <Tag className={`m m-${kf} ${className}`.trim()} style={{ ...rangeStyle(range, i), ...style }} {...rest} />;
}

/**
 * Starts the scroll fallback only where the browser cannot tie animation to
 * scrolling itself (feature-detected, never by user agent) and only while the
 * reader has not asked for reduced motion.
 */
export function useScrollFallback(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof CSS === "undefined" || CSS.supports("animation-timeline: view()")) return undefined;
    const quiet = matchMedia("(prefers-reduced-motion: reduce)");
    let stop = null;
    const sync = () => {
      if (!quiet.matches && !stop) stop = scrollFallback(el);
      else if (quiet.matches && stop) { stop(); stop = null; }
    };
    sync();
    quiet.addEventListener("change", sync);
    return () => { quiet.removeEventListener("change", sync); if (stop) stop(); };
  }, [ref]);
}
