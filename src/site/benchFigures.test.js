import { describe, it, expect } from "vitest";
import { benchFigures, benchHref, BENCH_SIZES, BENCH_STRENGTHS } from "./benchFigures";

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

import { ledgerFigures, scaleDigits, LEDGER_SIZES } from "./benchFigures";
describe("Scent Ledger bench", () => {
  it("50 mL at 25% is 11.88 g oil and 30.38 g ethanol", () => {
    const f = ledgerFigures(50, 25);
    expect([f.oilText, f.alcoholText]).toEqual(["11.88", "30.38"]);
    expect(`${f.oilPct} : ${f.alcoholPct}`).toBe("28.1 : 71.9");
  });
  it("every bottle and strength follows the handbook's arithmetic", () => {
    for (const size of LEDGER_SIZES) for (const pct of [15, 20, 25, 30]) {
      const f = ledgerFigures(size, pct);
      expect(f.oilText).toBe((size * pct / 100 * 0.95).toFixed(2));
      expect(f.alcoholText).toBe((size * (1 - pct / 100) * 0.81).toFixed(2));
    }
  });
  it("the bottle grows 0.72 to 1.0 with the size", () => {
    expect(ledgerFigures(10, 25).bottleScale).toBeCloseTo(0.72);
    expect(ledgerFigures(100, 25).bottleScale).toBeCloseTo(1);
  });
  it("pads the scale to five places with hidden blanks", () => {
    expect(scaleDigits("2.38")).toEqual([{ blank: true, n: 0 }, { n: 2 }, { dot: true }, { n: 3 }, { n: 8 }]);
  });
});
