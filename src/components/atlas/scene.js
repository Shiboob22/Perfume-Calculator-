/**
 * The pyramid's light draws in from the start edge, top note to base, once as it
 * scrolls into view. Bands already on the first screen at mount are left as they are.
 * The bands are HTML spans, so plain scaleX + transformOrigin works (no SVG origin handling).
 */
export function pyramidDraw(ctx, bands) {
  const { gsap, ScrollTrigger, tokens } = ctx;
  const fold = globalThis.innerHeight ?? 0;
  const below = Array.from(bands ?? []).filter((b) => b.getBoundingClientRect().top >= fold);
  if (!below.length) return undefined;
  // The CSS scroll timeline on .mo-band would fight the tween (animations beat inline transforms).
  below.forEach((b) => b.classList?.remove("mo-band"));
  const origin = ctx.dir === -1 ? "center right" : "center left";
  gsap.fromTo(below, { scaleX: 0, transformOrigin: origin }, {
    scaleX: 1, transformOrigin: origin, duration: ctx.s(tokens.duration.slow), ease: "kx.out", stagger: ctx.s(tokens.stagger.step),
    scrollTrigger: { trigger: below[0], start: "top 88%", once: true },
  });
  return () => below.forEach((b) => b.classList?.add("mo-band"));
}
