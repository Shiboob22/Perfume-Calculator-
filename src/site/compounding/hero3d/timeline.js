// The 3D pour on the home page: every number that places it on the scroll.
// Pure: progress p (0 at the top of the pinned track, 1 at its foot) goes in,
// what the scene and the captions should show comes out. Nothing here reads
// the DOM or three.js, so scrubbing both ways always lands on the same frame.

export const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Smoothstep from a to b. */
export const smooth = (a, b, v) => { const x = clamp((v - a) / (b - a)); return x * x * (3 - 2 * x); };
/** Where p sits inside a [from, to] window, 0 to 1. */
export const seg = ([a, b], p) => clamp((p - a) / (b - a));
export const easeOut = (x) => 1 - Math.pow(1 - x, 3);

/** The beats, as windows of p. */
export const B = Object.freeze({
  tare1: [0.10, 0.16],
  tiers: [[0.16, 0.26], [0.26, 0.36], [0.36, 0.46]],
  tare2: [0.46, 0.50],
  alc: [0.50, 0.70],
  mix: [0.70, 0.82],
  ato: [0.82, 0.87],
  spray: [0.872, 0.90],
  cap: [0.902, 0.95],
  hero: [0.95, 1],
});

/** Where each beat name in the pill starts (Choose, Tare, Top, Heart, Base, Tare, Alcohol, Mix, Atomiser, Name it). */
export const BEAT_STARTS = Object.freeze([0, 0.10, 0.16, 0.26, 0.36, 0.46, 0.50, 0.70, 0.82, 0.95]);

/** Caption windows [from, to]; each cross-fades over FADE at both ends. */
export const CAPTIONS = Object.freeze([[-1, 0.09], [0.11, 0.47], [0.49, 0.70], [0.72, 0.83], [0.85, 2]]);
export const FADE = 0.02;
const SHIFT = 20;

/** Pinned track length (Medium). */
export const TRACK_VH = 700;

/** The bottle sizes and the handbook's named strengths the dials snap to. */
export const SIZES = Object.freeze([10, 30, 50, 100]);
export const STRENGTHS = Object.freeze([15, 20, 25, 30]);

/** Oil shade by named strength (the tier shades of the Bench flacon). */
export const OIL_SHADES = Object.freeze({ 15: "#D9B878", 20: "#C9A157", 25: "#B8893A", 30: "#93662A" });
export const ETHANOL = Object.freeze({ top: "#F1F4F0", deep: "#DCE5DF" });
export const BLEND_TOWARD = "#F3EAD6";

/** The nearest value in a list. */
export const nearest = (list, v) => list.reduce((best, x) => (Math.abs(x - v) < Math.abs(best - v) ? x : best), list[0]);

/** Hex colour a → b by t. */
export function mixHex(a, b, t) {
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = rgb(a), C = rgb(b);
  return "#" + A.map((v, i) => Math.round(v + (C[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

export const oilShade = (pct) => OIL_SHADES[nearest(STRENGTHS, pct)];

/** The flacon's scale for a bottle size: cube root of mL/100, held to 0.42 to 1.25. */
export const bottleScale = (ml) => Math.min(1.25, Math.max(0.42, Math.cbrt(Math.max(0, ml) / 100)));

/** Each caption's opacity and vertical shift (px). */
export function captions(p) {
  return CAPTIONS.map(([a, b]) => {
    const fi = clamp((p - a) / FADE), fo = clamp((b - p) / FADE);
    return { o: fi * fo, y: (1 - fi) * SHIFT - (1 - fo) * SHIFT };
  });
}

/** Index of the beat name to show. */
export function beatIndex(p) {
  let i = 0;
  BEAT_STARTS.forEach((v, k) => { if (p >= v) i = k; });
  return i;
}

/** Each oil tier in the step-1 list: "active", "done" or "pending". */
export function tierState(i, p) {
  const [a, b] = B.tiers[i];
  if (p >= a && (p < b || (i === 2 && p < B.tare2[1]))) return "active";
  return p >= b ? "done" : "pending";
}

/** Whether the TARE label is lit. */
export const taring = (p) => (p >= B.tare1[0] && p < B.tare1[1]) || (p >= B.tare2[0] && p < B.tare2[1]);

/** How far the oil has gone in, across all three tiers (0 to 1). */
export const oilT = (p) => clamp((p - B.tiers[0][0]) / (B.tiers[2][1] - B.tiers[0][0]));

/**
 * What the scale reads at p: 0 until the first tare, the oil going in, 0 again
 * through the second tare, the alcohol going in, then the whole batch.
 */
export function readout(p, oil, alc) {
  if (p < B.tare1[0]) return 0;
  if (p < B.tiers[2][1]) return oil * oilT(p);
  if (p < B.tare2[1]) return 0;
  if (p < B.alc[1]) return alc * seg(B.alc, p);
  return alc + oil * easeOut(seg(B.mix, p));
}

/** How much a stream is pouring, and whether it is the alcohol. */
export function stream(p) {
  const win = (a, b, e) => clamp((p - a) / e) * clamp((b - p) / e);
  const o = win(B.tiers[0][0] + 0.03, B.tiers[2][1], 0.015);
  const a = win(B.alc[0] + 0.01, B.alc[1] - 0.005, 0.015);
  return { on: Math.max(o, a), alc: a > o };
}

/** Camera keyframes: p, distance factor, camera height, look-at height, orbit (rad). */
export const KF = Object.freeze([
  [0, 1, 2.05, 1.45, 0], [0.12, 1, 2.1, 1.5, 0], [0.2, 0.96, 2.55, 1.65, 0.14], [0.46, 0.96, 2.5, 1.62, 0.1],
  [0.54, 0.95, 2.35, 1.58, -0.14], [0.7, 0.95, 2.3, 1.55, -0.1], [0.77, 0.86, 1.95, 1.4, 0],
  [0.84, 0.78, 2.75, 2.15, 0.12], [0.9, 0.74, 2.9, 2.35, 0.05], [0.97, 0.9, 2.2, 1.4, 0], [1, 0.9, 2.2, 1.4, 0],
]);

/** The camera at p, smoothstepped between neighbouring keys. */
export function camera(p) {
  let i = 0;
  while (i < KF.length - 2 && p > KF[i + 1][0]) i++;
  const A = KF[i], C = KF[i + 1], t = smooth(A[0], C[0], p);
  const lerp = (j) => A[j] + (C[j] - A[j]) * t;
  return { dist: lerp(1), camY: lerp(2), lookY: lerp(3), orbit: lerp(4) };
}

/** The ending's strength (caustics, glints, breathing), 0 before p = .95. */
export const heroAmount = (p) => clamp((p - 0.95) / 0.035);

/** Cap lift (0 seated, 1 tipped aside), atomiser in (0 to 1), and cap return. */
export function capState(p) {
  const back = smooth(B.cap[0], B.cap[1], p);
  return { lift: smooth(B.tare1[0], B.tare1[1], p) * (1 - back), atomiser: smooth(B.ato[0], B.ato[1], p), back };
}

/** Deterministic falling-drop seeds: 8 top, 10 heart, 10 base notes, then 24 alcohol drops. */
export const TIER_COUNTS = Object.freeze([8, 10, 10]);
export const DROPS = Object.freeze((() => {
  const rnd = (i) => { const v = Math.sin(i * 12.9898 + 1.7) * 43758.5453; return v - Math.floor(v); };
  const a = [];
  let idx = 0;
  TIER_COUNTS.forEach((n, tier) => {
    for (let k = 0; k < n; k++, idx++) a.push({ tier, x: 0.06 + 0.88 * rnd(idx), r: rnd(idx + 99), z: rnd(idx + 31), ph: rnd(idx + 7) * 6.28, s: (k / n) * 0.6 });
  });
  for (let k = 0; k < 24; k++, idx++) a.push({ tier: 3, x: 0.35 + 0.3 * rnd(idx), r: rnd(idx + 99), z: rnd(idx + 31), ph: 0, s: (k / 24) * 0.72 });
  return a;
})());
