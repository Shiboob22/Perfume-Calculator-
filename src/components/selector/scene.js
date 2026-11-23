/**
 * Ranked matches arrive top match first: each row rises 8 px and fades in, one stagger step
 * after the one above it. Rows past the stagger cap start together on the last step, so none
 * is left hidden. Rows are passed in rank (DOM) order.
 */
export function resultsIn(ctx, rows) {
  if (!ctx || !rows?.length) return;
  const { gsap, tokens } = ctx;
  const tl = gsap.timeline();
  rows.forEach((row, i) => {
    tl.fromTo(row, { y: tokens.distance.s, opacity: 0 }, {
      y: 0, opacity: 1, duration: ctx.s(tokens.duration.slow), ease: "kx.out",
    }, ctx.s(Math.min(i, tokens.stagger.max - 1) * tokens.stagger.step)); // position in seconds
  });
}
