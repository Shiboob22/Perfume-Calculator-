/**
 * Notebook pages turn into place (a 0.6 degree settle) as they scroll into view, once, in
 * the batches they arrive in. Pages already on the first screen are left alone, so nothing
 * on screen at mount is ever hidden. New pages (Load more) are picked up by re-running.
 */
export function pagesIn(ctx, selector = "[data-page]") {
  const { gsap, ScrollTrigger, tokens, dir } = ctx;
  const fold = globalThis.innerHeight ?? 0;
  const below = Array.from(ctx.root.querySelectorAll(selector)).filter((p) => p.getBoundingClientRect().top >= fold);
  if (!below.length) return undefined;
  // The CSS entrance on .mo-item would fight the tween (animations beat inline transforms).
  const css = below.filter((p) => p.classList?.contains("mo-item"));
  css.forEach((p) => p.classList.remove("mo-item"));
  gsap.set(below, { y: tokens.distance.m, rotation: 0.6 * dir, opacity: 0 });
  ScrollTrigger.batch(below, {
    start: "top 92%", once: true, batchMax: tokens.stagger.max,
    onEnter: (els) => gsap.to(els, {
      y: 0, rotation: 0, opacity: 1, duration: ctx.s(tokens.duration.slow), ease: "kx.out", stagger: ctx.s(tokens.stagger.step), overwrite: true,
    }),
  });
  return () => css.forEach((p) => p.classList.add("mo-item"));
}

/** The composer slides up into place when it opens. */
export function composeIn(ctx, el) {
  if (!el) return;
  ctx.gsap.fromTo(el, { y: ctx.tokens.distance.l, opacity: 0 }, { y: 0, opacity: 1, duration: ctx.s(ctx.tokens.duration.base), ease: "kx.out" });
}
