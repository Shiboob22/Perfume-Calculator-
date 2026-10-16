// Stroke width: the board's 1.25 px on the 24 px grid, held up to 32 px; larger
// drawings thin so they still read as line: 44+ → 1.1, 96+ → 0.9.
export function strokeFor(size) {
  if (size <= 32) return 1.25;
  if (size < 96) return 1.1;
  return 0.9;
}

// At 18 px and below, secondary details are dropped.
export const showsDetail = (size) => size > 18;
