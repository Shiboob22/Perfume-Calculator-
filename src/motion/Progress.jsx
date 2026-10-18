import React, { useEffect, useRef } from "react";
import { motionOn, reduced } from "./env.js";

/**
 * A 2 px hairline across the top of the page that fills with scroll (from the
 * right in Arabic). Scroll timelines draw it where the browser has them; a
 * passive scroll listener drives it elsewhere. Decorative.
 */
export function Progress() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !motionOn() || reduced() || (typeof CSS !== "undefined" && CSS.supports("animation-timeline: scroll()"))) return undefined;
    el.setAttribute("data-js", "");
    let raf = 0;
    const paint = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - innerHeight;
      el.style.setProperty("--sp", max > 0 ? Math.min(1, scrollY / max).toFixed(4) : "0");
    };
    const ask = () => { raf = raf || requestAnimationFrame(paint); };
    paint();
    addEventListener("scroll", ask, { passive: true });
    addEventListener("resize", ask);
    return () => { cancelAnimationFrame(raf); removeEventListener("scroll", ask); removeEventListener("resize", ask); };
  }, []);
  return <div ref={ref} aria-hidden="true" className="mo-progress" />;
}
