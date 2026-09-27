// Measuring a concentrate's own density: weigh a known volume. On a scale
// that reads to 0.01 g, the reading can be off by one step, so the density
// is only as good as ±0.01 g ÷ the volume weighed (±0.001 g/mL at 10 mL).
export function measuredDensity(grams: number, ml: number) {
  if (!(grams > 0) || !(ml > 0)) return null;
  return { density: grams / ml, plusMinus: 0.01 / ml };
}
