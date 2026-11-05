// The realistic bench (Bench SaaS Phase 6): the motion clock's frames and the
// glass flacon's geometry. Pure: the components only draw what these return.
//
// One clock drives the scale digits and the bottle, so a change reads as one
// gesture: the digits roll to the new reading with a small overshoot, the
// last decimal hunts for ±0.01 like a scale finding its weight, and the
// bottle pours (cap up, a stream, a ripple, the surface settling).

import { tierFor, STRENGTH_TIERS } from "./strength";
import { INGREDIENT_TYPES } from "./mixture";

/** Timings, ms. A test pins them to the prototype. */
export const BENCH_MOTION = Object.freeze({
  roll: 350, // digits travel to the new reading
  settle: 120, // then the last decimal jitters before it rests
  jitterStep: 40, // one jitter value per step: +0.01, −0.01, 0
  flow: 450, // the stream runs
  flowFade: 150, // and thins away
  wobble: 650, // the surface wobble decays to rest
  resize: 480, // spring between bottle sizes
  overshoot: 0.9, // ease-out-back strength
});

/** The spring used between bottle sizes (CSS). */
export const RESIZE_EASE = "cubic-bezier(.34,1.35,.64,1)";

/** Ease-out-back: overshoots a little past 1, then comes back. */
export function easeOutBack(x: number, k: number = BENCH_MOTION.overshoot): number {
  const p = Math.min(1, Math.max(0, x)) - 1;
  return 1 + (k + 1) * p ** 3 + k * p ** 2;
}

export interface RollFrame {
  values: number[];
  flow: number; // 0..1, how much stream is falling
  wobble: number; // signed surface tilt, decaying to 0
  settled: boolean; // the STABLE mark
  done: boolean; // nothing left to draw: stop the clock
}

/** The final, resting frame (also what reduced motion shows at once). */
export const restFrame = (to: readonly number[]): RollFrame => ({ values: to.slice(), flow: 0, wobble: 0, settled: true, done: true });

/**
 * The frame `elapsed` ms after a change from `from` to `to`. `jitter` says
 * which way each value hunts while settling (+1, −1 or 0): the oil and the
 * ethanol move against each other, the share does not hunt. Values never
 * read below zero.
 */
export function rollFrame(from: readonly number[], to: readonly number[], elapsed: number, jitter: readonly number[] = [1, -1, 0]): RollFrame {
  const M = BENCH_MOTION;
  const e = Math.max(0, elapsed);
  if (e >= M.wobble) return restFrame(to);
  const p = Math.min(1, e / M.roll);
  let values: number[];
  if (p < 1) {
    const k = easeOutBack(p);
    values = to.map((t, i) => (from[i] ?? t) + (t - (from[i] ?? t)) * k);
  } else {
    const step = e < M.roll + M.settle ? Math.floor((e - M.roll) / M.jitterStep) : 2;
    const j = step === 0 ? 0.01 : step === 1 ? -0.01 : 0;
    values = to.map((t, i) => t + j * (jitter[i] ?? 0));
  }
  values = values.map((v) => Math.max(0, v));
  const flow = e < M.flow ? 1 : Math.max(0, 1 - (e - M.flow) / M.flowFade);
  const decay = 1 - e / M.wobble;
  return { values, flow, wobble: decay * decay * Math.sin(e / 55), settled: e >= M.roll + M.settle, done: false };
}

/** The flacon's linear size for a batch volume: 100 mL is 1, by the cube root, clamped. */
export const BOTTLE_SCALE = Object.freeze({ min: 0.42, max: 1.25 });
export function bottleScale(totalMl: unknown): number {
  const ml = Math.max(0, Number(totalMl) || 0);
  return Math.min(BOTTLE_SCALE.max, Math.max(BOTTLE_SCALE.min, Math.cbrt(ml / 100)));
}

/** Oil shades by strength tier (EDT → Extrait), lightest to deepest, per theme. */
export const TIER_SHADES = Object.freeze({
  light: Object.freeze(["#D9B878", "#C9A157", "#B8893A", "#93662A", "#6B4520"]),
  dark: Object.freeze(["#E6B77E", "#DDA462", "#D4924A", "#B47436", "#8C5426"]),
});
export type Theme = keyof typeof TIER_SHADES;

/** The pale ethanol tint, top and bottom of the glass. */
export const ETHANOL_TINT = Object.freeze({
  light: Object.freeze({ top: "#F1F4F0", deep: "#DCE5DF" }),
  dark: Object.freeze({ top: "#34413B", deep: "#27322D" }),
});

/** Mix two #rrggbb colours, t of the way from a to b. */
export function mixHex(a: string, b: string, t: number): string {
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = rgb(a);
  const B = rgb(b);
  return `#${A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

/** The oil's gradient for a strength: the tier's shade, lit at the top, deeper at the base. */
export function oilShade(pct: unknown, theme: Theme = "light") {
  const i = Math.max(0, STRENGTH_TIERS.indexOf(tierFor(pct)));
  const base = (TIER_SHADES[theme] ?? TIER_SHADES.light)[i];
  return { base, top: mixHex(base, "#FFFFFF", 0.22), deep: mixHex(base, "#000000", 0.25) };
}

// The glass cavity, in the flacon's viewBox (0 0 120 155).
export const CAVITY = Object.freeze({ left: 20, right: 100, top: 52, height: 91, bottom: 143, mouth: 24, middle: 60 });

const f2 = (n: number) => n.toFixed(2);

/**
 * The liquid this frame: the oil (concentrate) settles under the ethanol and
 * fills `share` of the cavity. The surface climbs the walls (meniscus), tilts
 * with `wobble`; while `flow` runs a tapered stream falls from the mouth to
 * the surface and a ripple spreads from where it lands.
 */
export function liquidShape(share: number, wobble = 0, flow = 0) {
  const C = CAVITY;
  const s = Math.min(1, Math.max(0, Number(share) || 0));
  const y = C.top + C.height * (1 - s);
  const a = Math.min(3.5 * Math.abs(wobble), C.height * s) * Math.sign(wobble);
  const m = Math.min(2.2, C.height * s);
  const surface = `M${C.left} ${f2(y - m)} C22 ${f2(y)} 26 ${f2(y)} 30 ${f2(y)} Q45 ${f2(y - a)} 60 ${f2(y)} T90 ${f2(y)} C94 ${f2(y)} 98 ${f2(y)} ${C.right} ${f2(y - m)}`;
  const w1 = 1.4 * flow;
  const w2 = 0.6 * flow;
  return {
    oilPath: s > 0 ? `${surface} V${C.bottom} H${C.left} Z` : `M${C.left} ${C.bottom} H${C.right} V${C.bottom} H${C.left} Z`,
    surfacePath: s > 0 ? surface : "",
    surfaceY: f2(y),
    bandY: f2(y - 1.5),
    rippleRx: f2(3 + 4 * Math.abs(wobble) + 6 * (1 - flow)),
    rippleOpacity: f2(0.55 * flow),
    streamPath: flow > 0 ? `M${f2(C.middle - w1)} ${C.mouth} L${f2(C.middle + w1)} ${C.mouth} L${f2(C.middle + w2)} ${f2(y)} L${f2(C.middle - w2)} ${f2(y)} Z` : `M${C.middle} ${C.mouth} L${C.middle} ${C.mouth} Z`,
  };
}

export interface LayerInput { type?: string | null; pct?: unknown }

/**
 * A blend's materials as layers in the concentrate: each one's volume share,
 * stacked from the base of the glass. The top layer stops short of the
 * surface so the meniscus stays the oil's.
 */
export function blendLayers(rows: readonly LayerInput[] | null | undefined, share: number) {
  const list = rows ?? [];
  const sum = list.reduce((a, r) => a + (Number(r.pct) > 0 ? Number(r.pct) : 0), 0);
  const rho = (t: unknown) => (INGREDIENT_TYPES[t as keyof typeof INGREDIENT_TYPES] ?? INGREDIENT_TYPES.eo).density;
  const vols = list.map((r) => (sum > 0 && Number(r.pct) > 0 ? Number(r.pct) / sum / rho(r.type) : 0));
  const vSum = vols.reduce((a, v) => a + v, 0);
  if (!(vSum > 0)) return [];
  const hC = CAVITY.height * Math.min(1, Math.max(0, Number(share) || 0));
  const out: { type: string; y: string; h: string }[] = [];
  let yb: number = CAVITY.bottom;
  list.forEach((r, n) => {
    const h = (hC * vols[n]) / vSum;
    yb -= h;
    const last = n === list.length - 1 ? 2.5 : 0;
    const hh = Math.max(0, h - last);
    if (hh > 0) out.push({ type: INGREDIENT_TYPES[r.type as keyof typeof INGREDIENT_TYPES] ? String(r.type) : "eo", y: f2(yb + last), h: f2(hh) });
  });
  return out;
}

/** Faint "8" segments behind a reading, the way an unlit LCD shows them. */
export const ghostDigits = (shown: string) => shown.replace(/\d/g, "8");
