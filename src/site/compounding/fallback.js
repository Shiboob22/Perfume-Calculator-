// Where CSS scroll-driven animations do not exist, this carries the same
// scene: one passive scroll listener writes `--progress` on the scene and
// `--vp` on each timeline box, once a frame. The stylesheet turns those into
// the same keyframes. Nothing here decides what moves.
const clamp = (n) => (n < 0 ? 0 : n > 1 ? 1 : n);

export function scrollFallback(scene) {
  const boxes = [...scene.querySelectorAll("[data-vt]")];
  const pins = [...scene.querySelectorAll("[data-pin]")];
  let queued = 0;
  const paint = () => {
    queued = 0;
    const vh = innerHeight;
    const s = scene.getBoundingClientRect();
    const r = boxes.map((b) => b.getBoundingClientRect());
    scene.style.setProperty("--progress", clamp(-s.top / (s.height - vh || 1)).toFixed(4));
    boxes.forEach((b, i) => b.style.setProperty("--vp", clamp((vh - r[i].top) / (vh + r[i].height)).toFixed(4)));
    // A pinned stretch: 0 when its top meets the top of the screen, 1 when its foot meets the foot.
    pins.forEach((p) => { const b = p.getBoundingClientRect(); p.style.setProperty("--pp", clamp(-b.top / (b.height - vh || 1)).toFixed(4)); });
  };
  const ask = () => { queued = queued || requestAnimationFrame(paint); };
  scene.setAttribute("data-fallback", "");
  paint();
  addEventListener("scroll", ask, { passive: true });
  addEventListener("resize", ask);
  return () => {
    cancelAnimationFrame(queued);
    removeEventListener("scroll", ask);
    removeEventListener("resize", ask);
    scene.removeAttribute("data-fallback");
  };
}
