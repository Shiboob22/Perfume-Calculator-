// The motion system's tokens, in one place. Plain data with no imports, so
// the Tailwind config (which writes them out as CSS custom properties), the
// primitives, the tests and /dev/motion all read the same numbers.
//
// Character: quiet and precise. Fades with a small rise, hairlines drawn,
// slow settles. Nothing bounces. Only `transform` and `opacity` move.

export const TOKENS = Object.freeze({
  /** Milliseconds. fast: hover/press. base: UI in and out. slow: an entrance. ambient: a loop (2 s or more). */
  duration: Object.freeze({ fast: 150, base: 250, slow: 600, ambient: 2200 }),

  /** `out` is the standard ease (a quick start, a long settle); `inOut` is for things that travel. */
  ease: Object.freeze({ out: "cubic-bezier(.2,0,0,1)", inOut: "cubic-bezier(.65,0,.35,1)" }),

  /** Stagger: ms between siblings, at most `max` steps (a long list still finishes in time); `word` is the step between words of a heading. */
  stagger: Object.freeze({ step: 60, max: 8, word: 40, maxWords: 14 }),

  /** px. The rise of an entrance, by size. */
  distance: Object.freeze({ xs: 4, s: 8, m: 16, l: 32 }),

  /**
   * When an entrance fires: when an element's top comes within `lead` of the
   * bottom of the screen. Anything already inside that line when the page is
   * set up is on the fold and is never hidden: the first screen does not animate.
   */
  view: Object.freeze({ lead: 0.12 }),

  /** At or below this many logical cores (or with Save-Data) the layer drops parallax and canvas. */
  lowPowerCores: 4,
});

/** `--mo-*` custom properties for :root. Written by tailwind.config.js. */
export function motionVars(tokens = TOKENS) {
  const v = {
    "--mo-dir": "1",
    "--mo-ease": tokens.ease.out,
    "--mo-ease-io": tokens.ease.inOut,
    "--mo-step": `${tokens.stagger.step}ms`,
    "--mo-word": `${tokens.stagger.word}ms`,
  };
  for (const [k, ms] of Object.entries(tokens.duration)) v[`--mo-${k}`] = `${ms}ms`;
  for (const [k, px] of Object.entries(tokens.distance)) v[`--mo-d-${k}`] = `${px}px`;
  return v;
}

/** Position of a child in a stagger: its index, held at the cap. */
export const staggerIndex = (i, max = TOKENS.stagger.max) => Math.max(0, Math.min(Math.trunc(i), max));

/** A heading's words, for the masked reveal. Whole words only: Arabic letters must keep their joins. */
export function splitWords(text) {
  return String(text ?? "").trim().split(/\s+/).filter(Boolean);
}

/** The value of a count-up `t` (0 to 1) of the way along: ease-out, so it lands softly. */
export function countValue(from, to, t) {
  const p = Math.min(1, Math.max(0, t));
  const eased = 1 - (1 - p) ** 3;
  return from + (to - from) * eased;
}
