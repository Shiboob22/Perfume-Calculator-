// The Compounding: every constant that sets the feel of the home page's scroll
// scene, in one place. Plain data, no imports from the app, so the prerender,
// the tests and the debug page read the same numbers.
//
// Scroll is time in the room. Progress runs 0 → 1 over the whole scene and the
// stages divide it. Checkpoint 1 (static composition) uses the stage list and
// the scale; the motion constants below are filled in at checkpoint 2.

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

/** Motion (checkpoint 2). Durations in ms are for UI fills, never for the scene itself. */
export const MOTION_SCENE = Object.freeze({
  ease: "cubic-bezier(.2,0,0,1)",
  settle: 0.35, // share of a plate's own span spent settling into place
});

/** Progress (0–1) → the stage it falls in. */
export function stageAt(progress) {
  const p = Math.min(1, Math.max(0, progress));
  return STAGES.find((s) => p < s.to) ?? STAGES[STAGES.length - 1];
}
