import { describe, it, expect } from "vitest";
import { prefillFromQuery, startingBottle } from "./calcPrefill";

const q = (s) => prefillFromQuery(new URLSearchParams(s));

describe("prefillFromQuery", () => {
  it("reads a guide's link", () => {
    expect(q("size=100&unit=ml&conc=25")).toEqual({ size: 100, unit: "ml", conc: 25 });
  });
  it("ignores missing, unknown and out-of-range values", () => {
    expect(q("")).toEqual({ size: null, unit: null, conc: null });
    expect(q("size=-5&unit=gallon&conc=150")).toEqual({ size: null, unit: null, conc: null });
    expect(q("size=abc&unit=__proto__&conc=0")).toEqual({ size: null, unit: null, conc: null });
  });
});

describe("startingBottle", () => {
  const none = { size: null, unit: null, conc: null };
  it("prefers the link's values", () => {
    expect(startingBottle({ ...none, size: 30, unit: "g" }, { default_bottle: 50, default_unit: "ml" })).toEqual({ size: 30, unit: "g" });
    expect(startingBottle({ ...none, unit: "oz" }, { default_bottle: 50, default_unit: "ml" })).toEqual({ size: 100, unit: "oz" });
  });
  it("uses the saved bottle with its unit", () => {
    expect(startingBottle(none, { default_bottle: "50", default_unit: "g" })).toEqual({ size: 50, unit: "g" });
  });
  it("keeps a saved unit without a size, and falls back to 100 mL", () => {
    expect(startingBottle(none, { default_unit: "floz" })).toEqual({ size: 100, unit: "floz" });
    expect(startingBottle(none, null)).toEqual({ size: 100, unit: "ml" });
    expect(startingBottle(none, { default_bottle: 0, default_unit: "cups" })).toEqual({ size: 100, unit: "ml" });
  });
});
