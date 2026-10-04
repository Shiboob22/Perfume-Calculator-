// Stroke width by optical size, so every icon reads at about 1.5 px on
// screen: 18 → 1.6, 24 → 1.5, 32 → 1.25, 44+ → 1.1, 96+ → 0.9.
export function strokeFor(size) {
  if (size <= 18) return 1.6;
  if (size <= 24) return 1.5;
  if (size <= 32) return 1.25;
  if (size < 96) return 1.1;
  return 0.9;
}

// At 18 px and below, secondary details are dropped.
export const showsDetail = (size) => size > 18;
