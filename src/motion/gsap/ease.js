import { TOKENS } from "../config.js";

/** "cubic-bezier(.22,1,.36,1)" to [0.22, 1, 0.36, 1]. */
export function parseBezier(str) {
  const m = /cubic-bezier\(([^)]+)\)/.exec(str);
  const n = m ? m[1].split(",").map(Number) : [];
  if (n.length !== 4 || n.some(Number.isNaN)) throw new Error(`Not a cubic-bezier: ${str}`);
  return n;
}

/** The CSS cubic-bezier as a function of time t (0 to 1): Newton on x, bisection if the slope is flat. */
export function cubicBezier(x1, y1, x2, y2) {
  const c = (a, b, s) => 3 * (1 - s) ** 2 * s * a + 3 * (1 - s) * s * s * b + s ** 3;
  const d = (a, b, s) => 3 * (1 - s) ** 2 * a + 6 * (1 - s) * s * (b - a) + 3 * s * s * (1 - b);
  return (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let s = t;
    for (let i = 0; i < 8; i++) {
      const err = c(x1, x2, s) - t;
      if (Math.abs(err) < 1e-6) return c(y1, y2, s);
      const slope = d(x1, x2, s);
      if (Math.abs(slope) < 1e-6) break;
      s -= err / slope;
    }
    let lo = 0, hi = 1;
    s = t;
    for (let i = 0; i < 30; i++) {
      if (c(x1, x2, s) < t) lo = s; else hi = s;
      s = (lo + hi) / 2;
    }
    return c(y1, y2, s);
  };
}

/** Registers the tokens' two curves with GSAP as "kx.out" and "kx.inOut". */
export function registerEases(gsap) {
  gsap.registerEase("kx.out", cubicBezier(...parseBezier(TOKENS.ease.out)));
  gsap.registerEase("kx.inOut", cubicBezier(...parseBezier(TOKENS.ease.inOut)));
}
