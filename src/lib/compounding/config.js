// The home page's scroll scene, "Weighed" (v7, direction A): every constant that
// sets the feel of it, in one place. Plain data, no imports from the app, so the
// prerender, the tests and the debug page read the same numbers.
//
// Scroll is the pour. Progress runs 0 → 1 over the whole scene and the stages
// divide it: the batch is read, the oil goes in, the alcohol goes in, the six
// rooms are weighed, and the Bench takes over. The grams gauge in the margin
// follows the scroll and ends on the batch weight the Bench starts from.
// (The file keeps its old name: the `compounding` flag and its build alias
// still switch the scene.)

/** The five stages, in order. `to` is the progress at which the stage ends. */
export const STAGES = Object.freeze([
  { id: "reading", from: 0, to: 0.16 },
  { id: "oil", from: 0.16, to: 0.38 },
  { id: "alcohol", from: 0.38, to: 0.62 },
  { id: "rooms", from: 0.62, to: 0.9 },
  { id: "handoff", from: 0.9, to: 1 },
]);

/** The weight scale: a thin vertical gauge, grams, tabular figures. */
export const SCALE = Object.freeze({
  // The gauge is full at the worked example's batch weight (100 mL at 25%),
  // so the scene ends on the number the calculator starts with.
  size: 100,
  pct: 25,
  decimals: 2,
});

/**
 * Motion. Every mark moves on its own view timeline: 0 is the moment it
 * touches the bottom edge of the screen, 1 the moment it leaves the top
 * (CSS `cover`). `ranges` are [from, to] on that line; `stagger` is added per
 * index inside a group. Distances are px, and only transform and opacity move.
 * The gauge follows the whole scene instead: 0 when the scene's top meets the
 * top of the screen, 1 when its foot meets the foot of the screen.
 * The CSS reads these as custom properties (see motion.jsx), so the numbers
 * live here and nowhere else.
 */
export const MOTION_SCENE = Object.freeze({
  ease: "cubic-bezier(.2,0,0,1)",
  ranges: Object.freeze({
    drift: [0.02, 0.3], // a stage's words settle (movement only, never a fade)
    pan: [0, 0.55], // the brass pan fills behind the reading
    beam: [0.12, 0.5], // a weight on the beam grows from the reading edge
    plate: [0, 0.3], // a room's plate arrives
    ember: [0.06, 0.3], // the ember takes
  }),
  /** Ambient loops at rest (the ember's breath, 3.2 s). */
  ambient: Object.freeze({ emberBreathMs: 3200 }),
  stagger: Object.freeze({ plate: 0.035 }),
  distance: Object.freeze({ plate: 28, drift: 24 }),
  /** Below this many logical cores, or with Save-Data, parallax-style marks are dropped. */
  lowPowerCores: 4,
});

/** Progress (0–1) → the stage it falls in. */
export function stageAt(progress) {
  const p = Math.min(1, Math.max(0, progress));
  return STAGES.find((s) => p < s.to) ?? STAGES[STAGES.length - 1];
}
