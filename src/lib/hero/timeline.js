// The Compounding hero as a pure function of time (Design/boards/Compounding.dc.html,
// "Hero motion spec"). `heroFrame(T, …)` gives every value the hero draws at
// T seconds into the 9.2 s autoplay; the component only paints it. Times
// follow the board: plates I to XVI arrive every 240 ms from 0.4 s (600 ms
// ease-out); from 4.6 s they blend to amber (1.6 s ease-in-out, 40 ms
// stagger) while the room goes from afternoon to dusk (2.4 s); the amber body
// grows from 5.0 s (1.4 s), contracts to a 30 px ember from 6.4 s (1.0 s);
// smoke from 6.6 s; the headline at 7.5 s (600 ms); rooms I to VI from 8.0 s
// (600 ms, 120 ms stagger).
import { PLATES } from "../../content/hero.js";

export const END = 9.2;
export const clamp = (x) => Math.max(0, Math.min(1, x));
// Ease-out and ease-in-out as the board draws them (cubic), the same curves as MOTION in theme.js.
export const easeOut = (x) => 1 - Math.pow(1 - x, 3);
export const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a, b, p) => a + (b - a) * p;
const mix = (c1, c2, p) => `rgb(${c1.map((v, i) => Math.round(lerp(v, c2[i], p))).join(",")})`;

/** Layout numbers for a container width. The board's own: 8 × 2 plates on a desktop, 4 × 4 under 760 px. */
export function heroLayout(w) {
  const mobile = w < 760;
  const cols = mobile ? 4 : 8;
  const pw = mobile ? 76 : 140;
  const ph = mobile ? 96 : 184;
  const gap = mobile ? 8 : 12;
  const rows = PLATES.length / cols;
  const gridW = cols * pw + (cols - 1) * gap;
  const gridH = rows * ph + (rows - 1) * gap;
  return { mobile, cols, pw, ph, gap, rows, gridW, gridH, scale: Math.min(1, (w - (mobile ? 24 : 96)) / gridW), h: mobile ? 760 : 860, stageY: mobile ? 280 : 360 };
}

/**
 * @param {number} T seconds
 * @param {{ w?: number, ar?: boolean, reduced?: boolean }} o
 */
export function heroFrame(T, { w = 1440, ar = false, reduced = false } = {}) {
  const L = heroLayout(w);
  const { mobile, cols, pw, ph, gap, rows } = L;
  const dusk = easeInOut(clamp((T - 4.6) / 2.4));
  const plates = PLATES.map((d, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const vx = (c - (cols - 1) / 2) * (pw + gap) * (ar ? 1 : -1) * -1;
    const vy = (r - (rows - 1) / 2) * (ph + gap);
    const pa = easeOut(clamp((T - (0.4 + i * 0.24)) / 0.6));
    const pb = easeInOut(clamp((T - 4.6 - i * 0.04) / 1.6));
    const current = i === Math.floor((T - 0.4) / 0.24) && T < 4.4;
    return {
      opacity: pa * (1 - pb),
      x: -vx * pb,
      y: -vy * pb + 14 * (1 - pa),
      scale: 1 - 0.65 * pb,
      bg: mix([30, 26, 22], [212, 146, 74], pb * 0.9),
      border: mix([59, 51, 43], [212, 146, 74], Math.max(pb, current ? 0.6 : 0)),
      arrived: T >= 0.4 + i * 0.24 + 0.3,
    };
  });
  const arrived = plates.filter((p) => p.arrived).length;
  const grams = T >= 4.6 ? 100 : PLATES.slice(0, arrived).reduce((s, d) => s + d[4], 0);

  const grow = easeInOut(clamp((T - 5.0) / 1.4));
  const shrink = easeInOut(clamp((T - 6.4) / 1.0));
  const breath = T > 7.4 && !reduced ? 1 + 0.07 * Math.sin(((T - 7.4) * Math.PI * 2) / 3.2) : 1;
  const maxD = mobile ? 150 : 240;
  const emberD = mobile ? 22 : 30;
  const disc = (lerp(0, maxD, grow) * (1 - shrink) + emberD * shrink) * breath;
  const smokeOn = reduced ? 0 : clamp((T - 6.6) / 1.2);
  const smoke = [0, 1, 2].map((k) => {
    const per = 5.4;
    const p = ((((T - 6.6 + (k * per) / 3) % per) + per) % per) / per;
    const rise = mobile ? 220 : 300;
    return {
      w: (mobile ? 34 : 50) + p * 40,
      h: (mobile ? 80 : 120) + p * 60,
      blur: 14 + p * 18,
      opacity: smokeOn * Math.sin(p * Math.PI) * 0.9,
      x: Math.sin(p * 5 + k) * 18,
      rise: p * rise,
    };
  });
  const headP = easeOut(clamp((T - 7.5) / 0.6));
  const rooms = [0, 1, 2, 3, 4, 5].map((j) => {
    const p = easeOut(clamp((T - 8.0 - j * 0.12) / 0.6));
    return { opacity: p, dy: 8 * (1 - p) };
  });
  return {
    ...L,
    plates, arrived, grams, disc, discOpacity: Math.min(1, grow * 1.4),
    glow: lerp(20, 90, shrink) * breath, glowSpread: lerp(4, 18, shrink),
    smoke, headOpacity: headP, headDy: 12 * (1 - headP), rooms,
    bg: mix([58, 43, 30], [21, 18, 15], dusk),
    lightOpacity: 1 - dusk * 0.85,
    barOpacity: 1 - clamp((T - 6.4) / 0.6),
  };
}
