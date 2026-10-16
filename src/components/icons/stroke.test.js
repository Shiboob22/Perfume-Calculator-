import { describe, expect, it } from "vitest";
import { showsDetail, strokeFor } from "./stroke.js";

describe("icon optical sizes", () => {
  it("thins the stroke as the icon grows", () => {
    expect([18, 24, 32, 44, 60, 96, 120].map(strokeFor)).toEqual([1.25, 1.25, 1.25, 1.1, 1.1, 0.9, 0.9]);
    expect(strokeFor(14)).toBe(1.25);
  });
  it("drops secondary detail at 18 px", () => {
    expect(showsDetail(18)).toBe(false);
    expect(showsDetail(24)).toBe(true);
  });
});
