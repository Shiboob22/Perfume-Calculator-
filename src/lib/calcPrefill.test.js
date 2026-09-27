import { describe, it, expect } from "vitest";
import { prefillFromQuery } from "./calcPrefill";

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
