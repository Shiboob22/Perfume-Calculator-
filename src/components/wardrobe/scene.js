/** The Tonight answer's words rise in one after another; words past `maxWords` are simply shown. Moves y and opacity only. */
export function answerWords(ctx, words) {
  const { gsap, tokens } = ctx;
  const list = Array.from(words ?? []);
  const lead = list.slice(0, tokens.stagger.maxWords);
  const rest = list.slice(tokens.stagger.maxWords);
  if (lead.length) {
    gsap.fromTo(lead, { y: tokens.distance.s, opacity: 0 }, {
      y: 0, opacity: 1, duration: ctx.s(tokens.duration.slow), ease: "kx.out", stagger: ctx.s(tokens.stagger.word),
    });
  }
  if (rest.length) gsap.set(rest, { y: 0, opacity: 1 });
}
