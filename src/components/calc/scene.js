// Bench room scenes. Event-driven: callers pass the ctx from useSceneCtx (null
// when GSAP is not loaded or motion is off) and do the plain thing themselves.

/** A blend row the user just added slides in 8 px and fades up. */
export function rowIn(ctx, el) {
  if (!ctx || !el) return;
  ctx.gsap.fromTo(el, { y: ctx.tokens.distance.s, opacity: 0 }, { y: 0, opacity: 1, duration: ctx.s(ctx.tokens.duration.base), ease: "kx.out" });
}

/** The reverse; resolves when it has finished (at once without GSAP). The caller removes the row after. */
export function rowOut(ctx, el) {
  if (!ctx || !el) return Promise.resolve();
  return new Promise((resolve) => {
    const ran = ctx.add(() => {
      ctx.gsap.to(el, { y: ctx.tokens.distance.s, opacity: 0, duration: ctx.s(ctx.tokens.duration.base), ease: "kx.out", onComplete: resolve, onInterrupt: resolve }); // a revert must not strand the row
      return true;
    });
    if (!ran) resolve();
  });
}

/** Slides the decorative ring onto the lit tier; `instant` places it with no tween. scale:true keeps it to transforms. */
export function tierRing(ctx, ring, target, instant = false) {
  if (!ctx || !ring || !target) return;
  ctx.Flip.fit(ring, target, instant ? { scale: true } : { duration: ctx.s(ctx.tokens.duration.base), ease: "kx.out", scale: true });
}

/** Puts the ring on the lit tier: slides it, except the first time or once reduced motion is on (scene.add refuses then), when it is placed at once. */
export function placeRing(ctx, ring, target, { first = false, ok = true } = {}) {
  if (first || !ok) tierRing(ctx, ring, target, true);
  else ctx?.add?.(() => tierRing(ctx, ring, target));
}

/** "Logged as No. 042" settles in: scale 1.04 to 1 from the inline start, no bounce. The text is live, so no opacity. */
export function stamp(ctx, el) {
  if (!ctx || !el) return;
  ctx.gsap.fromTo(el, { scale: 1.04, transformOrigin: ctx.dir === -1 ? "right center" : "left center" }, { scale: 1, duration: ctx.s(ctx.tokens.duration.slow), ease: "kx.out" });
}
