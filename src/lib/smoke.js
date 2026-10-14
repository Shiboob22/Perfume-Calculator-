// The hero's smoke field: a few slow ribbons. Pure geometry, so the canvas
// component only draws.
//
// ribbonY gives the height (0..1 of the field) of ribbon `i` at horizontal
// position x (0..1) and time t (seconds). Each ribbon is two slow sine waves;
// the pointer (px, py in 0..1, or null) bends ribbons near it, and `scroll`
// (0..1) lifts the whole field a little as the page moves.
export const RIBBONS = 6;

export function ribbonY(i, x, t, { px = null, py = null, scroll = 0 } = {}) {
  const base = 0.2 + (i / (RIBBONS - 1)) * 0.6;
  const speed = 0.045 + i * 0.011;
  let y = base
    + 0.07 * Math.sin(x * (3.1 + i * 0.37) + t * speed * 6.28 + i * 1.7)
    + 0.035 * Math.sin(x * (7.3 - i * 0.29) - t * speed * 4.1 + i * 0.9);
  if (px != null && py != null) {
    const d = x - px;
    y += (py - y) * 0.16 * Math.exp(-(d * d) / 0.018);
  }
  return y - scroll * 0.12;
}

// Opacity of ribbon i: the middle ones are strongest, none above 0.32.
export const ribbonAlpha = (i) => 0.12 + 0.2 * Math.sin((Math.PI * (i + 0.5)) / RIBBONS);
