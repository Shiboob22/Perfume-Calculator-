import React, { useEffect, useRef } from "react";
import { SMOKE } from "../../lib/compounding/config";
import { plumePoint, smokeAt } from "../../lib/compounding/smoke";
import { SmokeStrokes } from "./parts";
import { lowPower, quiet } from "./env";

// The smoke behind the burn: canvas 2D, drawn from the stage's scroll
// position alone (no clock), only when the position changes and only while
// the stage is on screen. The SVG strokes underneath are the static
// fallback: they stay when scripts are off, the device is low-power, or
// motion is reduced (where they are hidden by CSS, as before).
export default function CanvasSmoke() {
  const box = useRef(null);
  useEffect(() => {
    const el = box.current;
    const canvas = el?.querySelector("canvas");
    const stage = el?.closest("[data-stage]");
    const ctx = canvas?.getContext("2d");
    if (!el || !stage || !ctx) return undefined;
    let raf = 0;
    let on = false;
    let visible = false;
    let w = 0;
    let h = 0;
    let colour = "#E3A857";
    let last = -1;

    const size = () => {
      const dpr = lowPower() ? 1 : Math.min(window.devicePixelRatio || 1, SMOKE.maxDpr);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      last = -1;
    };
    const draw = () => {
      raf = 0;
      const r = stage.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
      if (p === last) return;
      last = p;
      ctx.clearRect(0, 0, w, h);
      const { rise, alive } = smokeAt(p);
      if (rise <= 0 || alive <= 0) return;
      const n = lowPower() ? SMOKE.lowPlumes : SMOKE.plumes;
      ctx.lineWidth = SMOKE.lineWidth;
      ctx.strokeStyle = colour;
      ctx.lineCap = "round";
      const steps = 36;
      const fade = [1, 0.6, 0.25]; // the tip thins out: three bands, strongest at the ember
      for (let i = 0; i < n; i++) {
        const gain = SMOKE.alpha * alive * (i % 3 === 0 ? 1 : 0.7);
        for (let b = 0; b < fade.length; b++) {
          ctx.globalAlpha = gain * fade[b];
          ctx.beginPath();
          const from = Math.floor((b * steps) / fade.length);
          const to = Math.floor(((b + 1) * steps) / fade.length);
          for (let s = from; s <= to; s++) {
            const q = plumePoint(i, n, (s / steps) * rise, p);
            const x = q.x * w;
            const y = h * (1 - 0.04 - q.y * 0.94);
            if (s === from) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }
    };
    const ask = () => { if (visible && !raf) raf = requestAnimationFrame(draw); };

    const start = () => {
      if (on || quiet() || lowPower()) return;
      on = true;
      colour = getComputedStyle(stage).getPropertyValue("--st-accent").trim() || colour;
      el.dataset.canvas = "";
      size();
      window.addEventListener("scroll", ask, { passive: true });
      window.addEventListener("resize", size, { passive: true });
      ask();
    };
    const stop = () => {
      if (!on) return;
      on = false;
      cancelAnimationFrame(raf); raf = 0;
      window.removeEventListener("scroll", ask);
      window.removeEventListener("resize", size);
      ctx.clearRect(0, 0, w, h);
      delete el.dataset.canvas;
    };
    const sync = () => (quiet() || lowPower() ? stop() : start());

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) { last = -1; ask(); } });
    io.observe(stage);
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    mq.addEventListener("change", sync);
    window.addEventListener("cmp-env", sync);
    sync();
    return () => { stop(); io.disconnect(); mq.removeEventListener("change", sync); window.removeEventListener("cmp-env", sync); };
  }, []);

  return (
    <div ref={box} className="cmp-smoke absolute inset-0 pointer-events-none" aria-hidden="true">
      <SmokeStrokes />
      <canvas className="cmp-canvas absolute inset-0 w-full h-full" />
    </div>
  );
}
