import { describe, expect, it } from "vitest";
import { cat, roman } from "./catalogue.js";

describe("catalogue", () => {
  it("writes Roman numerals", () => {
    expect([1, 4, 6, 9, 14, 16, 24].map(roman)).toEqual(["I", "IV", "VI", "IX", "XIV", "XVI", "XXIV"]);
  });
  it("falls back to digits outside a short list", () => {
    expect(roman(0)).toBe("0");
    expect(roman(120)).toBe("120");
  });
  it("pads catalogue numbers", () => {
    expect(cat("R", 318)).toBe("R·0318");
    expect(cat("K", 14, 3)).toBe("K·014");
    expect(cat("A", -3)).toBe("A·0000");
  });
});
