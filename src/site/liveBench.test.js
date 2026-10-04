import { describe, it, expect } from "vitest";
import { benchFigures, benchHref, BENCH_SIZES, BENCH_STRENGTHS } from "./liveBench";

describe("live bench", () => {
  it("gives the handbook's Quick Reference for every size and named strength", () => {
    for (const size of BENCH_SIZES) {
      for (const { pct } of BENCH_STRENGTHS) {
        const f = benchFigures(size, pct);
        expect(f.oil).toBeCloseTo(size * (pct / 100) * 0.95, 6);
        expect(f.alcohol).toBeCloseTo(size * (1 - pct / 100) * 0.81, 6);
        expect(f.total).toBeCloseTo(f.oil + f.alcohol, 6);
      }
    }
    const f = benchFigures(100, 25);
    expect([f.oil, f.alcohol, f.total].map((g) => g.toFixed(2))).toEqual(["23.75", "60.75", "84.50"]);
  });
  it("opens the calculator at the same bottle", () => {
    expect(benchHref(50, 30)).toBe("/app/calculator?size=50&unit=ml&conc=30&ref=home");
  });
});
