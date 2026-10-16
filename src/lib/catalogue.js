// Roman numerals and catalogue numbers (Design System, "Details"): rooms,
// plates and lists take Roman numerals; records take a letter and a number,
// always left to right ("R·0318", "K·014").

const ROMAN = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];

/** 1 → "I", 16 → "XVI". Beyond 39 or below 1 the digits are returned, since a list that long is not a list of rooms. */
export function roman(n) {
  const v = Math.trunc(Number(n));
  if (!(v >= 1 && v <= 39)) return String(n);
  let out = "";
  let rest = v;
  for (const [value, symbol] of ROMAN) while (rest >= value) { out += symbol; rest -= value; }
  return out;
}

/** cat("R", 318) → "R·0318". `width` is the digit count (default 4). */
export function cat(prefix, n, width = 4) {
  const v = Math.max(0, Math.trunc(Number(n) || 0));
  return `${prefix}·${String(v).padStart(width, "0")}`;
}
