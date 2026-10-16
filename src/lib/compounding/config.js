// The Compounding: every constant that sets the feel of the home page's scroll
// scene, in one place. Plain data, no imports from the app, so the prerender,
// the tests and the debug page read the same numbers.
//
// Scroll is time in the room. Progress runs 0 → 1 over the whole scene and the
// stages divide it. The stage list and the scale
// set the static composition; the motion constants set how it moves.

/** The six stages, in order. `to` is the progress at which the stage ends. */
export const STAGES = Object.freeze([
  { id: "afternoon", from: 0, to: 0.12 },
  { id: "sixteen", from: 0.12, to: 0.46 },
  { id: "pour", from: 0.46, to: 0.62 },
  { id: "dusk", from: 0.62, to: 0.74 },
  { id: "burn", from: 0.74, to: 0.9 },
  { id: "handoff", from: 0.9, to: 1 },
]);

/**
 * The light in each stage. Fixed scenes, independent of the light/dark toggle
 * (the last stage hands back to the page's own theme). Every ink/background
 * pair is held to WCAG AA by compounding.test.js; `accent` is for type and
 * borders on that stage's ground; `resin` is the fill colour for drawn marks
 * (grains, the mass, the ember), with no text on it.
 */
export const STAGE_LIGHT = Object.freeze({
  afternoon: { bg: "#EDEAE3", ink: "#100E0A", dim: "#4E4A43", accent: "#7A581B", resin: "#C8893A", line: "#CFC9BC" },
  sixteen: { bg: "#F0E8D7", ink: "#100E0A", dim: "#4D4636", accent: "#7A581B", resin: "#C8893A", line: "#D2C6AA" },
  pour: { bg: "#E6D3AA", ink: "#100E0A", dim: "#45391F", accent: "#6B4A12", resin: "#B87A28", line: "#C9B27F" },
  dusk: { bg: "#3C2815", ink: "#F6F2EA", dim: "#DCCBB0", accent: "#E3A857", resin: "#D79A45", line: "#6A4B2A" },
  burn: { bg: "#1A120B", ink: "#F6F2EA", dim: "#D3C3AA", accent: "#E3A857", resin: "#E3A857", line: "#4A3622" },
});

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
 * (CSS `cover`). `RANGES` are [from, to] on that line; `STAGGER` is added per
 * index inside a group. Distances are px, and only transform and opacity move.
 * The gauge follows the whole scene instead: 0 when the scene's top meets the
 * top of the screen, 1 when its foot meets the foot of the screen.
 * The CSS reads these as custom properties (see motion.jsx), so the numbers
 * live here and nowhere else.
 */
export const MOTION_SCENE = Object.freeze({
  ease: "cubic-bezier(.2,0,0,1)",
  ranges: Object.freeze({
    parallax: [0.5, 1], // the afternoon bowl lags the page
    drift: [0.02, 0.3], // a stage's words settle (movement only, never a fade)
    plate: [0, 0.3], // a catalogue plate arrives
    grain: [0.08, 0.32], // a grain drops into the bowl
    merge: [0.06, 0.42], // grains draw together
    mass: [0.2, 0.58], // and become one amber mass
    ember: [0.06, 0.3], // the ember takes
    smoke: [0.12, 0.6], // smoke rises
    clear: [0.82, 1], // smoke clears
    wisp: [0, 0.3], // a room comes out of the smoke
    veil: [0, 0.4], // the handoff's haze lifts
  }),
  stagger: Object.freeze({ plate: 0.035, grain: 0.012, merge: 0.006, smoke: 0.05, wisp: 0.035 }),
  distance: Object.freeze({ plate: 28, drift: 24, parallax: 40, grain: 34, smoke: 70, wisp: 44 }),
});

/** Progress (0–1) → the stage it falls in. */
export function stageAt(progress) {
  const p = Math.min(1, Math.max(0, progress));
  return STAGES.find((s) => p < s.to) ?? STAGES[STAGES.length - 1];
}
