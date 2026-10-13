import { describe, it, expect } from "vitest";
import { calculate } from "./calculator";
import { solveRun, solveFromOil } from "./solve";
import { measuredDensity } from "./density";
import { round2 } from "./round";

const base = { amount: 100, unit: "ml" as const, concPct: 25, oilDensity: 0.95, ethanolDensity: 0.81 };

describe("calculate (Calculator screen)", () => {
  it("is quiet for normal inputs and warns about odd ones", () => {
    expect(calculate(base).warnings).toEqual([]);
    expect(calculate({ ...base, amount: 0 }).warnings.map((w) => w.code)).toEqual(["amount_not_positive"]);
    expect(calculate({ ...base, oilDensity: 1.6 }).warnings.map((w) => w.code)).toEqual(["oil_density_implausible"]);
    expect(calculate({ ...base, range: [20, 22] }).warnings.map((w) => w.code)).toEqual(["outside_family_range"]);
  });

  it("costs the batch per bottle and per mL", () => {
    const r = calculate({ ...base, pricePerGram: 2, ethanolPricePerL: 40, bottleCost: 10, bottles: 2 });
    expect(r.cost.oil).toBeCloseTo(47.5, 10);
    expect(r.cost.ethanol).toBeCloseTo(3, 10);
    expect(r.cost.total).toBeCloseTo(70.5, 10);
    expect(r.cost.perBottle).toBeCloseTo(35.25, 10);
    expect(calculate(base).cost).toMatchObject({ total: 0, bottles: 0, perBottle: null });
    const poured = calculate({ ...base, actualOilG: 23.75, actualEthanolG: 81, ethanolPricePerL: 10 });
    expect(poured.cost.ethanol).toBeCloseTo(1, 10); // 81 g / 0.81 = 100 mL
  });

  it("solves the batch and gives the other basis", () => {
    const r = calculate(base);
    expect([r.shown.oilG, r.shown.ethanolG, r.shown.totalG]).toEqual([23.75, 60.75, 84.5]);
    expect(r.basis).toBe("volume");
    expect(round2(r.otherBasisPct)).toBe(28.11);
    expect(round2(calculate({ ...base, unit: "g" }).otherBasisPct)).toBeLessThan(25);
    expect([r.actual, r.oilCost]).toEqual([null, null]);
    expect(r.usedOilG).toBeCloseTo(23.75, 10);
  });

  it("reads form strings and clamps the strength like before", () => {
    const r = calculate({ ...base, amount: "50", concPct: "140", oilDensity: 0, ethanolDensity: 0 });
    expect(r.concentration).toBe(100);
    expect(r.densities).toEqual({ oil: 1, ethanol: 0.81 });
    expect(calculate({ ...base, amount: "", concPct: "" }).exact.totalMl).toBe(0);
  });

  it("checks the actual pour, and costs the oil really used", () => {
    const r = calculate({ ...base, actualOilG: "24", actualEthanolG: "60.75", pricePerGram: "2", tolerancePts: 0.1 }); // made 25.20%
    expect(r.actual?.fix.material).toBe("ethanol");
    expect(r.actual?.withinTolerance).toBe(false);
    expect(r.usedOilG).toBe(24);
    expect(r.oilCost).toBe(48);
    expect(calculate({ ...base, actualOilG: "24" }).actual).toBeNull();
    expect(calculate({ ...base, actualOilG: "23.75", actualEthanolG: "60.75" }).actual?.withinTolerance).toBeNull();
  });
});

// Hardening: malformed numbers must never become negative, infinite or NaN
// grams or costs. 100 mL at 25% by volume, oil 0.95 / ethanol 0.81, is the
// reference: 23.75 g oil + 60.75 g ethanol = 84.50 g.
const codes = (r: ReturnType<typeof calculate>) => r.warnings.map((w) => w.code);
const allFinite = (o: unknown): boolean =>
  typeof o === "number" ? Number.isFinite(o) : o && typeof o === "object" ? Object.values(o).every(allFinite) : true;
const asNum = (v: unknown) => v as number;

describe("calculate: density validation", () => {
  it("replaces a negative oil density with 1.00 and says so, leaving ethanol alone", () => {
    const r = calculate({ ...base, oilDensity: -0.95 });
    expect(r.densities).toEqual({ oil: 1, ethanol: 0.81 });
    expect(codes(r)).toEqual(["oil_density_invalid"]);
    expect(r.warnings[0]).toMatchObject({ used: 1 });
    expect([r.shown.oilG, r.shown.ethanolG, r.shown.totalG]).toEqual([25, 60.75, 85.75]);
    expect(allFinite(r)).toBe(true);
  });

  it("replaces a negative ethanol density with 0.81 and keeps a valid measured oil density", () => {
    const r = calculate({ ...base, oilDensity: 0.9, ethanolDensity: -0.8 });
    expect(r.densities).toEqual({ oil: 0.9, ethanol: 0.81 });
    expect(codes(r)).toEqual(["ethanol_density_invalid"]);
    expect([r.shown.oilG, r.shown.ethanolG]).toEqual([22.5, 60.75]);
  });

  it("treats Infinity and -Infinity as invalid, not as a density", () => {
    for (const bad of [Infinity, -Infinity]) {
      const r = calculate({ ...base, oilDensity: bad, ethanolDensity: bad });
      expect(r.densities).toEqual({ oil: 1, ethanol: 0.81 });
      expect(codes(r)).toEqual(["oil_density_invalid", "ethanol_density_invalid"]);
      expect(allFinite(r)).toBe(true);
    }
  });

  it("treats NaN, null, undefined, empty and zero densities as missing", () => {
    for (const blank of [NaN, null, undefined, "", 0]) {
      const r = calculate({ ...base, oilDensity: asNum(blank), ethanolDensity: asNum(blank) });
      expect(r.densities).toEqual({ oil: 1, ethanol: 0.81 });
      expect(codes(r)).toEqual(["oil_density_missing", "ethanol_density_missing"]);
      expect(allFinite(r)).toBe(true);
    }
  });

  it("keeps valid densities and stays quiet", () => {
    const r = calculate({ ...base, oilDensity: 0.93, ethanolDensity: 0.8 });
    expect(r.densities).toEqual({ oil: 0.93, ethanol: 0.8 });
    expect(r.warnings).toEqual([]);
  });

  it("falls back the same way on a weight basis (g)", () => {
    const r = calculate({ ...base, unit: "g", oilDensity: -1, ethanolDensity: Infinity });
    expect(r.basis).toBe("weight");
    expect(r.densities).toEqual({ oil: 1, ethanol: 0.81 });
    expect([r.shown.oilG, r.shown.ethanolG, r.shown.totalG]).toEqual([25, 75, 100]);
    expect([r.shown.oilMl, r.shown.ethanolMl]).toEqual([25, 92.59]);
    expect(codes(r)).toEqual(["oil_density_invalid", "ethanol_density_invalid"]);
  });

  it("leaves normal weight-basis results unchanged", () => {
    const r = calculate({ ...base, unit: "g" });
    expect([r.shown.oilG, r.shown.ethanolG, r.shown.totalG]).toEqual([25, 75, 100]);
    expect([r.shown.oilMl, r.shown.ethanolMl]).toEqual([26.32, 92.59]);
    expect(r.warnings).toEqual([]);
  });
});

describe("calculate: other inputs", () => {
  it("computes missing or malformed batch sizes and strengths as zero or clamped", () => {
    for (const amount of ["", undefined, null, NaN, Infinity, -Infinity, -5, "abc"]) {
      const r = calculate({ ...base, amount: asNum(amount) });
      expect(r.exact.totalMl).toBe(0);
      expect(codes(r)).toEqual(["amount_not_positive"]);
      expect(allFinite(r.exact)).toBe(true);
    }
    expect(calculate({ ...base, concPct: asNum(NaN) }).concentration).toBe(0);
    expect(calculate({ ...base, concPct: asNum(Infinity) }).concentration).toBe(100);
    expect(calculate({ ...base, concPct: asNum(-Infinity) }).concentration).toBe(0);
  });

  it("ignores invalid actual pours and falls back to the nominal batch", () => {
    for (const bad of [Infinity, -Infinity, NaN, -5, 0, "", "x"]) {
      const oilBad = calculate({ ...base, actualOilG: asNum(bad), actualEthanolG: 60.75, pricePerGram: 2 });
      expect(oilBad.actual).toBeNull();
      expect(oilBad.usedOilG).toBeCloseTo(23.75, 10);
      expect(oilBad.oilCost).toBeCloseTo(47.5, 10);

      const ethBad = calculate({ ...base, actualOilG: 23.75, actualEthanolG: asNum(bad), ethanolPricePerL: 40 });
      expect(ethBad.actual).toBeNull();
      expect(ethBad.cost.ethanol).toBeCloseTo(3, 10); // the nominal 75 mL, not Infinity
      expect(allFinite(ethBad.cost)).toBe(true);
    }
  });

  it("ignores invalid prices and bottle counts instead of costing them", () => {
    for (const bad of [Infinity, -Infinity, NaN, -3, "x"]) {
      const r = calculate({
        ...base,
        pricePerGram: asNum(bad),
        ethanolPricePerL: asNum(bad),
        bottleCost: asNum(bad),
        bottles: asNum(bad),
      });
      expect(r.oilCost).toBeNull();
      expect(r.cost).toMatchObject({ oil: 0, ethanol: 0, glass: 0, total: 0, bottles: 0, perBottle: null });
      expect(allFinite(r.cost)).toBe(true);
    }
    // a valid price with an invalid bottle count still costs the liquid
    const r = calculate({ ...base, pricePerGram: 2, bottleCost: 10, bottles: Infinity });
    expect(r.cost).toMatchObject({ oil: 47.5, glass: 0, bottles: 0, perBottle: null });
    expect(calculate({ ...base, bottles: 2.9, bottleCost: 10 }).cost.bottles).toBe(2);
  });

  it("never shows an infinite cost, even from valid but extreme prices", () => {
    const r = calculate({ ...base, pricePerGram: 1e308, ethanolPricePerL: 1e308, bottleCost: 1e308, bottles: 1e6 });
    expect(r.oilCost).toBeNull();
    expect(allFinite(r.cost)).toBe(true);
  });

  it("treats an invalid tolerance as not set", () => {
    for (const bad of [Infinity, -1, NaN]) {
      const r = calculate({ ...base, actualOilG: 24, actualEthanolG: 60.75, tolerancePts: bad });
      expect(r.actual?.withinTolerance).toBeNull();
    }
    expect(calculate({ ...base, actualOilG: 24, actualEthanolG: 60.75, tolerancePts: 0.5 }).actual?.withinTolerance).toBe(true);
  });

  it("keeps the volume and weight bases distinct for the same strength", () => {
    const vol = calculate(base);
    const wt = calculate({ ...base, unit: "g" });
    expect([vol.basis, wt.basis]).toEqual(["volume", "weight"]);
    expect(round2(vol.otherBasisPct)).toBe(28.11); // 25% by volume = 28.11% by weight
    expect(round2(wt.otherBasisPct)).toBe(22.13); // 25% by weight = (25/0.95) / (25/0.95 + 75/0.81) by volume
  });
});

describe("related helpers reject non-finite input", () => {
  it("solveRun skips infinite lines and ignores a bad overfill", () => {
    const d = { oil: 0.95, ethanol: 0.81 };
    const run = solveRun([{ sizeMl: 50, count: 2 }, { sizeMl: Infinity, count: 1 }, { sizeMl: 10, count: NaN }], 25, d, -50);
    expect(run.bottlesMl).toBe(100);
    expect(run.overfillPct).toBe(0);
    expect(run.lines).toEqual([{ sizeMl: 50, count: 2 }]);
    expect(allFinite(run.exact)).toBe(true);
    expect(solveRun([{ sizeMl: 50, count: 2 }], 25, d, Infinity).overfillPct).toBe(0);
    expect(solveRun([{ sizeMl: 50, count: 2 }], 25, d, 10).overfillPct).toBe(10);
  });

  it("solveFromOil ignores an infinite bottle size instead of counting zero bottles", () => {
    const d = { oil: 0.95, ethanol: 0.81 };
    const r = solveFromOil(23.75, 25, "volume", d, Infinity);
    expect([r.bottles, r.leftoverMl]).toEqual([null, null]);
    expect(solveFromOil(23.75, 25, "volume", d, 50).bottles).toBe(2);
  });

  it("measuredDensity needs finite positive weighings", () => {
    expect(measuredDensity(Infinity, 10)).toBeNull();
    expect(measuredDensity(9.5, Infinity)).toBeNull();
    expect(measuredDensity(NaN, 10)).toBeNull();
    expect(measuredDensity(-9.5, 10)).toBeNull();
    expect(measuredDensity(9.5, 10)?.density).toBeCloseTo(0.95, 10);
  });
});
