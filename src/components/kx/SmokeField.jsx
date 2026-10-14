import React, { useEffect, useRef } from "react";
import { RIBBONS, ribbonAlpha, ribbonY } from "../../lib/smoke.js";

// Slow ribbons of resin-coloured smoke behind the hero. Canvas 2D (about 2 KB,
// no library). It follows the pointer a little and drifts with scroll.
//   · prefers-reduced-motion: one still frame, no animation loop.
//   · Off-screen or in a background tab: the loop stops.
//   · Decorative: aria-hidden, no pointer events, never takes focus.
// Server-rendered as an empty canvas; everything happens after hydration.
export default function SmokeField({ className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return undefined;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = { x: null, y: null };
    let raf = 0;
    let visible = true;
    let w = 0;
    let h = 0;
    let colour = "#C8893A";
    let frames = 0;

    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now) => {
      if (frames++ % 90 === 0) colour = getComputedStyle(canvas).getPropertyValue("--c-resin").trim() || colour;
      const t = reduced.matches ? 4 : now / 1000;
      const scroll = Math.min(1, window.scrollY / Math.max(1, window.innerHeight));
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = colour;
      for (let i = 0; i < RIBBONS; i++) {
        ctx.globalAlpha = ribbonAlpha(i);
        ctx.beginPath();
        for (let px = 0; px <= w; px += 8) {
          const y = ribbonY(i, px / w, t, { px: pointer.x, py: pointer.y, scroll }) * h;
          if (px === 0) ctx.moveTo(px, y); else ctx.lineTo(px, y);
        }
        ctx.stroke();
      }
    };

    const loop = (now) => {
      draw(now);
      raf = visible && !document.hidden && !reduced.matches ? requestAnimationFrame(loop) : 0;
    };
    const start = () => { if (!raf && !reduced.matches) raf = requestAnimationFrame(loop); };

    const onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = (e.clientX - r.left) / r.width;
      pointer.y = (e.clientY - r.top) / r.height;
      if (pointer.x < -0.2 || pointer.x > 1.2 || pointer.y < -0.2 || pointer.y > 1.2) { pointer.x = null; pointer.y = null; }
    };
    const onVisibility = () => { if (!document.hidden) start(); };
    const onMotion = () => { size(); if (reduced.matches) { cancelAnimationFrame(raf); raf = 0; draw(0); } else start(); };

    size();
    draw(0);
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) start(); });
    io.observe(canvas);
    const ro = new ResizeObserver(() => { size(); if (reduced.matches) draw(0); });
    ro.observe(canvas);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    reduced.addEventListener("change", onMotion);
    start();
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVisibility);
      reduced.removeEventListener("change", onMotion);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className={`pointer-events-none ${className}`} />;
}
