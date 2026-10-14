// Rounding to 0.01 g, half away from zero, on the decimal value the user
// means. Binary floats store 4.275 as 4.27499…, so plain toFixed(2) shows
// 4.27 where the handbook prints 4.28. Scaling first and trimming to 12
// significant digits recovers 427.5 exactly before rounding.
export function round2(x: number): number {
  if (!Number.isFinite(x)) return NaN;
  const scaled = Number((x * 100).toPrecision(12));
  return (Math.sign(scaled) * Math.round(Math.abs(scaled))) / 100 + 0; // + 0 turns -0 into 0
}

/** round2() as text with exactly two decimals, e.g. "4.28". */
export function fmt2(x: number): string {
  const r = round2(x);
  return Number.isFinite(r) ? r.toFixed(2) : "—";
}

/**
 * The total the calculator shows: the sum of the two rounded pours, so the
 * figure on a card always adds up on the scale. 30 mL at 15 % reads
 * 4.28 + 20.66 = 24.94, where rounding the exact total would give 24.93.
 */
export function shownTotal(oil: number, ethanol: number): number {
  return round2(round2(oil) + round2(ethanol));
}
