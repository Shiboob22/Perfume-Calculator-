/** A milestone dot that just got its note: it grows in from nothing. */
export function noteSaved(ctx, dotEl) {
  if (!dotEl) return;
  ctx.gsap.fromTo(dotEl, { scale: 0 }, { scale: 1, duration: ctx.s(ctx.tokens.duration.slow), ease: "kx.out" });
}
