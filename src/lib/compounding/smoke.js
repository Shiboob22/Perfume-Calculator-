import { SMOKE } from "./config.js";

const clamp = (n) => Math.min(1, Math.max(0, n));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/** How far the plumes have climbed (0–1) and how visible they still are, at burn progress `p`. */
export function smokeAt(p) {
  return { rise: smooth(SMOKE.rise[0], SMOKE.rise[1], p), alive: 1 - smooth(SMOKE.clear[0], SMOKE.clear[1], p) };
}

/**
 * Plume `i` of `n` at height `u` (0 at the ember, 1 at the tip): x and y as
 * shares of the field, y measured from the foot. The sway depends on the
 * scroll position only, so the same position always draws the same smoke.
 */
export function plumePoint(i, n, u, p) {
  const base = 0.5 + (n === 1 ? 0 : (i / (n - 1) - 0.5) * 0.18);
  const phase = p * 5.2 + i * 1.9;
  const x = base + SMOKE.sway * u * (Math.sin(u * (3.2 + i * 0.4) + phase) * 0.7 + Math.sin(u * 7.1 - phase * 0.6 + i) * 0.3)
    + (i / Math.max(1, n - 1) - 0.5) * 0.5 * u * u;
  return { x, y: u };
}
