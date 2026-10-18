import React, { useEffect, useRef } from "react";
import { createGovernor, particlesAt } from "../../lib/fpsGovernor.js";

// Ember and smoke behind the weighing panel. Canvas 2D at half resolution
// (smoke is soft; the browser scales it up), about 2 KB, no library, loaded
// only when the stage is near. Reads the pinned stretch's progress straight
// from the page (a pure function of scroll) and the scroll velocity: the smoke
// thickens while the alcohol goes in and leans with the scroll direction.
//   · off-screen or in a hidden tab: the loop stops;
//   · a frame-rate governor halves it, then stops it (the CSS glow stays);
//   · decorative: aria-hidden, no pointer events.
const FULL = 22;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export default function Smoke() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const stage = canvas?.parentElement;
    const pin = stage?.closest("[data-pin]");
    const ctx = canvas?.getContext("2d");
    if (!ctx || !pin) return undefined;
    const gov = createGovernor();
    const seeds = Array.from({ length: FULL }, (_, i) => ({ x: (i * 0.618) % 1, ph: (i * 0.37) % 1, sp: 0.5 + ((i * 0.29) % 1) * 0.7, r: 0.08 + ((i * 0.53) % 1) * 0.12 }));
    let raf = 0;
    let on = false;
    let last = 0;
    let lastY = scrollY;
    let vel = 0;
    let lean = 0;
    let w = 0;
    let h = 0;
    const size = () => {
      const k = Math.min(devicePixelRatio || 1, 1.5) * 0.5;
      w = Math.max(1, Math.round(stage.clientWidth * k));
      h = Math.max(1, Math.round(stage.clientHeight * k));
      canvas.width = w; canvas.height = h;
    };
    const frame = (now) => {
      raf = 0;
      if (!on || document.hidden) return;
      const dt = last ? now - last : 16;
      last = now;
      const level = gov.push(dt);
      const n = particlesAt(FULL, level);
      const r = pin.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight || 1)));
      const dy = scrollY - lastY; lastY = scrollY;
      vel += (dy / Math.max(dt, 1) - vel) * 0.15;
      lean += (Math.sign(vel) * Math.min(1, Math.abs(vel) / 2) - lean) * 0.05;
      const dusk = smooth(0.38, 0.5, p) * (1 - smooth(0.7, 0.86, p));
      const gain = dusk * (0.75 + Math.min(0.5, Math.abs(vel) / 4));
      ctx.clearRect(0, 0, w, h);
      if (n && gain > 0.01) {
        const t = now / 1000;
        for (let i = 0; i < n; i++) {
          const s = seeds[i];
          const life = (t * 0.06 * s.sp + s.ph) % 1;
          const x = (s.x + Math.sin(t * 0.4 * s.sp + s.ph * 6.28) * 0.04 + lean * life * 0.12) * w;
          const y = h * (1.02 - life * 0.95);
          const rad = (s.r + life * 0.14) * w;
          const a = gain * Math.sin(life * Math.PI) * 0.16;
          const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
          g.addColorStop(0, `rgba(212,146,74,${a})`);
          g.addColorStop(1, "rgba(212,146,74,0)");
          ctx.fillStyle = g;
          ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
        }
      }
      if (level < 2) raf = requestAnimationFrame(frame);
    };
    const start = () => { if (!raf && on) { last = 0; raf = requestAnimationFrame(frame); } };
    size();
    const io = new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on) start(); }, { rootMargin: "0px" });
    io.observe(stage);
    const vis = () => start();
    document.addEventListener("visibilitychange", vis);
    addEventListener("resize", size);
    return () => { cancelAnimationFrame(raf); io.disconnect(); document.removeEventListener("visibilitychange", vis); removeEventListener("resize", size); };
  }, []);
  return <canvas ref={ref} aria-hidden="true" className="wg-smoke" />;
}
