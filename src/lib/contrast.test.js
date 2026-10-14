import { describe, it, expect } from "vitest";
import { contrastRatio, wcagGrade } from "./contrast.js";

describe("contrast", () => {
  it("black on white is 21:1", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
  });
  it("is symmetric and 1:1 for equal colours", () => {
    expect(contrastRatio("#123456", "#123456")).toBeCloseTo(1, 10);
    expect(contrastRatio("#C8893A", "#100E0A")).toBeCloseTo(contrastRatio("#100E0A", "#C8893A"), 10);
  });
  it("grades by the WCAG thresholds", () => {
    expect(wcagGrade(7)).toBe("AAA");
    expect(wcagGrade(4.5)).toBe("AA");
    expect(wcagGrade(3)).toBe("AA large");
    expect(wcagGrade(2.99)).toBe("fail");
  });
});
