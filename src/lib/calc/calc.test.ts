import { describe, it, expect } from "vitest";
import {
  round2, fmt2, solveBottle, solveFromOil, adjustConcentration, solveRun, checkInputs,
  checkPour, alcoholForOil, measuredDensity, batchCost, costPer, byVolume, fromWeights,
  concentrationOf, displayed, volumeToWeightFraction, weightToVolumeFraction, toBase,
  isVolumeUnit, gToOz, mlToFlOz, UNITS, type Unit,
} from "./index";
import { REFERENCE, FAMILIES } from "../formulation";

const H = { oil: REFERENCE.oilDensity, ethanol: REFERENCE.ethanolDensity }; // 0.95 / 0.81

// ------------------------------------------------------------- rounding
describe("round2", () => {
  it("rounds the decimal value half up, not the float", () => {
    expect(round2(4.275)).toBe(4.28); // stored as 4.27499…; toFixed gives 4.27
    expect(round2(7.125)).toBe(7.13);
    expect(round2(11.875)).toBe(11.88);
    expect(round2(20.655)).toBe(20.66);
    expect(round2(1.005)).toBe(1.01);
    // The bug this exists for: 30 ml × 15% × 0.95 is 4.2749999… in binary.
    const oil = 30 * 0.15 * 0.95;
    expect(oil.toFixed(2)).toBe("4.27");
    expect(round2(oil)).toBe(4.28);
  });
  it("rounds halves away from zero for negatives and never shows -0", () => {
    expect(round2(-0.125)).toBe(-0.13);
    expect(Object.is(round2(-0.001), 0)).toBe(true);
  });
  it("formats two decimals and rejects non-numbers", () => {
    expect(fmt2(4.275)).toBe("4.28");
    expect(fmt2(3)).toBe("3.00");
    expect(fmt2(NaN)).toBe("—");
    expect(Number.isNaN(round2(Infinity))).toBe(true);
  });
});

// ---------------------------------------------------- golden: the handbook
describe("Vol. III Quick Reference (0.95 / 0.81 g/ml)", () => {
  const TABLE: [number, number, number, number, number][] = [
    [30, 15, 4.28, 20.66, 24.94], [30, 20, 5.70, 19.44, 25.14], [30, 25, 7.13, 18.23, 25.36], [30, 30, 8.55, 17.01, 25.56],
    [50, 15, 7.13, 34.43, 41.56], [50, 20, 9.50, 32.40, 41.90], [50, 25, 11.88, 30.38, 42.26], [50, 30, 14.25, 28.35, 42.60],
    [100, 15, 14.25, 68.85, 83.10], [100, 20, 19.00, 64.80, 83.80], [100, 25, 23.75, 60.75, 84.50], [100, 30, 28.50, 56.70, 85.20],
  ];
  for (const [ml, pct, oil, alcohol, total] of TABLE) {
    it(`${ml} ml at ${pct}% → ${oil} / ${alcohol} / ${total} g`, () => {
      const s = solveBottle(ml, "ml", pct, H);
      expect([s.shown.oilG, s.shown.ethanolG, s.shown.totalG]).toEqual([oil, alcohol, total]);
      expect(s.basis).toBe("volume");
      expect(s.densities).toEqual(H);
    });
  }

  it("reproduces the three worked examples (§11) and §02's 100 ml at 25%", () => {
    const shown = (ml: number, pct: number) => {
      const s = solveBottle(ml, "ml", pct, H).shown;
      return [s.oilG, s.ethanolG, s.totalG];
    };
    expect(shown(30, 20)).toEqual([5.70, 19.44, 25.14]);
    expect(shown(50, 25)).toEqual([11.88, 30.38, 42.26]);
    expect(shown(100, 30)).toEqual([28.50, 56.70, 85.20]);
    expect(shown(100, 25)).toEqual([23.75, 60.75, 84.50]);
  });
});

// ----------------------------------------- unchanged: today's calculator
describe("mode a matches the current calculator for every input", () => {
  // Copied from FragranceBlendCalculator.jsx before the engine existed.
  function oldCalc(amount: number, unit: Unit, concPct: number, oilDensity: number, ethDensity: number) {
    const conc = Math.min(Math.max(concPct || 0, 0), 100) / 100;
    let oilG, oilMl, ethG, ethMl, totalG, totalMl;
    if (unit === "ml" || unit === "floz") {
      totalMl = unit === "floz" ? amount * 29.5735 : amount;
      oilMl = totalMl * conc; ethMl = totalMl * (1 - conc);
      oilG = oilMl * oilDensity; ethG = ethMl * ethDensity;
      totalG = oilG + ethG;
    } else {
      totalG = unit === "oz" ? amount * 28.3495 : amount;
      oilG = totalG * conc; ethG = totalG * (1 - conc);
      oilMl = oilG / oilDensity; ethMl = ethG / ethDensity;
      totalMl = oilMl + ethMl;
    }
    return { oilG, oilMl, ethanolG: ethG, ethanolMl: ethMl, totalG, totalMl };
  }

  const densities = [...new Set([...Object.values(FAMILIES).map((f) => f.active.density), 0.95])];
  const sizes = [3, 5, 10, 20, 30, 50, 100, 125, 200, 7.5];
  it("across units × family densities × sizes × 1–40%", () => {
    let n = 0;
    for (const unit of UNITS) for (const oil of densities) for (const size of sizes) for (let pct = 1; pct <= 40; pct++) {
      const now = solveBottle(size, unit, pct, { oil, ethanol: 0.81 }).exact;
      const before = oldCalc(size, unit, pct, oil, 0.81);
      for (const k of Object.keys(before) as (keyof typeof before)[]) {
        expect(Math.abs(now[k] - before[k])).toBeLessThan(1e-9);
      }
      n++;
    }
    expect(n).toBe(UNITS.length * densities.length * sizes.length * 40);
  });
});

// ------------------------------------------------------------- units, basis
describe("units and basis", () => {
  it("converts units and knows which are volumes", () => {
    expect(toBase(1, "floz")).toBeCloseTo(29.5735, 10);
    expect(toBase(1, "oz")).toBeCloseTo(28.3495, 10);
    expect(toBase(7, "ml")).toBe(7);
    expect(UNITS.map(isVolumeUnit)).toEqual([true, true, false, false]);
    expect(gToOz(28.3495)).toBeCloseTo(1, 10);
    expect(mlToFlOz(29.5735)).toBeCloseTo(1, 10);
  });

  it("weighs by weight for g / oz", () => {
    const s = solveBottle(100, "g", 25, H);
    expect(s.basis).toBe("weight");
    expect([s.exact.oilG, s.exact.ethanolG]).toEqual([25, 75]);
    expect(s.exact.totalMl).toBeCloseTo(25 / 0.95 + 75 / 0.81, 10);
  });

  it("expresses a blend on the other basis and back", () => {
    expect(round2(volumeToWeightFraction(0.25, H) * 100)).toBe(28.11);
    expect(weightToVolumeFraction(volumeToWeightFraction(0.25, H), H)).toBeCloseTo(0.25, 12);
    const a = byVolume(100, 0.25, H);
    expect(concentrationOf(a, "weight")).toBeCloseTo(volumeToWeightFraction(0.25, H), 12);
    expect(Number.isNaN(concentrationOf(fromWeights(0, 0, H), "volume"))).toBe(true);
    expect(Number.isNaN(volumeToWeightFraction(0.5, { oil: 0, ethanol: 0 }))).toBe(true);
    expect(Number.isNaN(weightToVolumeFraction(0.5, { oil: Infinity, ethanol: Infinity }))).toBe(true);
  });

  it("shows totals as the sum of the rounded pours", () => {
    const d = displayed(byVolume(30, 0.15, H));
    expect(d.totalG).toBe(24.94); // 4.28 + 20.66, not round(24.93)
    expect(d.totalMl).toBe(30);
  });
});

// ---------------------------------------------------------------- mode b
describe("mode b: oil on hand", () => {
  it("finds the alcohol, total and bottles for the oil (by volume)", () => {
    const s = solveFromOil(23.75, 25, "volume", H, 50);
    expect(s.shown.ethanolG).toBe(60.75);
    expect(s.exact.totalMl).toBeCloseTo(100, 10);
    expect(s.bottles).toBe(2);
    expect(s.leftoverMl).toBeCloseTo(0, 10);
  });
  it("works by weight and without a bottle size", () => {
    const s = solveFromOil(25, 25, "weight", H);
    expect(s.exact.totalG).toBeCloseTo(100, 10);
    expect([s.bottles, s.leftoverMl]).toEqual([null, null]);
    expect(solveFromOil(10, 20, "volume", H, 30).leftoverMl).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------- mode c
describe("mode c: change a blend's concentration by adding only", () => {
  const blend = byVolume(100, 0.25, H);

  it("raises it by adding oil and lowers it by adding alcohol", () => {
    const up = adjustConcentration(blend, 30, "volume", H);
    expect(up.add.material).toBe("oil");
    expect(concentrationOf(up.result, "volume")).toBeCloseTo(0.30, 12);
    expect(up.add.ml).toBeCloseTo((0.3 * 100 - 25) / 0.7, 10);
    expect(up.reachable).toBe(true);

    const down = adjustConcentration(blend, 20, "volume", H);
    expect(down.add.material).toBe("ethanol");
    expect(down.add.ml).toBeCloseTo(25, 10); // 25 ml oil / 0.20 = 125 ml
    expect(concentrationOf(down.result, "volume")).toBeCloseTo(0.20, 12);
  });

  it("does nothing when already on target, and works by weight", () => {
    expect(adjustConcentration(blend, 25, "volume", H).add).toEqual({ material: null, grams: 0, ml: 0 });
    const w = adjustConcentration(fromWeights(25, 75, H), 20, "weight", H);
    expect(w.add.grams).toBeCloseTo(25, 10); // 25 g oil at 20% → 125 g total
    expect(concentrationOf(w.result, "weight")).toBeCloseTo(0.20, 12);
  });

  it("says so when a bottle's capacity makes the target unreachable", () => {
    const r = adjustConcentration(blend, 15, "volume", H, { capacityMl: 120 });
    expect(r.reachable).toBe(false);
    expect(r.limit).toBe("capacity");
    expect(r.add.ml).toBeCloseTo(20, 10); // fills the bottle
    expect(r.closest).toBeCloseTo((25 / 120) * 100, 10);
  });

  it("says so when there isn't enough oil", () => {
    const r = adjustConcentration(blend, 40, "volume", H, { oilAvailableG: 5 });
    expect([r.reachable, r.limit]).toEqual([false, "oil"]);
    expect(r.add.grams).toBeCloseTo(5, 10);
    const byW = adjustConcentration(fromWeights(25, 75, H), 40, "weight", H, { oilAvailableG: 1000 });
    expect(byW.reachable).toBe(true);
  });

  it("uses the tighter of two limits, and a roomy bottle changes nothing", () => {
    const r = adjustConcentration(blend, 40, "volume", H, { capacityMl: 105, oilAvailableG: 1000 });
    expect(r.limit).toBe("capacity");
    expect(adjustConcentration(blend, 30, "weight", H, { capacityMl: 1000 }).reachable).toBe(true);
  });

  it("can't reach 0% or 100% by adding", () => {
    for (const pct of [0, 100]) {
      const r = adjustConcentration(blend, pct, "volume", H);
      expect([r.reachable, r.add.material]).toEqual([false, null]);
    }
  });
});

// ---------------------------------------------------------------- mode d
describe("mode d: several bottles from one mix", () => {
  it("adds the bottles up, applies overfill and splits the pours", () => {
    const r = solveRun([{ sizeMl: 50, count: 3 }, { sizeMl: 10, count: 2 }, { sizeMl: 0, count: 4 }], 25, H, 5);
    expect(r.bottlesMl).toBe(170);
    expect(r.exact.totalMl).toBeCloseTo(178.5, 10);
    expect(r.lines).toHaveLength(2);
    expect(r.perBottle[0].g).toBeCloseTo(50 * (84.5 / 100), 10);
    expect(solveRun([], 25, H).perBottle).toEqual([]);
  });
});

// ---------------------------------------------------- actual pour (Rule 5)
describe("actual pour", () => {
  it("reports what was made and the add-only fix", () => {
    const c = checkPour(24.0, 60.75, 25, "volume", H);
    expect(c.actualPct).toBeGreaterThan(25);
    expect(c.fix.material).toBe("ethanol");
    const fixed = fromWeights(24.0, 60.75 + c.fix.grams, H);
    expect(concentrationOf(fixed, "volume")).toBeCloseTo(0.25, 12);
    expect(c.withinTolerance).toBeNull(); // no tolerance chosen yet
  });
  it("checks a tolerance when one is given", () => {
    expect(checkPour(23.75, 60.75, 25, "volume", H, 0.5).withinTolerance).toBe(true);
    expect(checkPour(26.5, 60.75, 25, "volume", H, 0.5).withinTolerance).toBe(false);
    expect(checkPour(23.0, 62, 25, "volume", H).fix.material).toBe("oil");
  });
  it("gives the alcohol for the oil actually poured (bench step 5)", () => {
    expect(round2(alcoholForOil(23.75, 25, "volume", H))).toBe(60.75);
    expect(alcoholForOil(25, 25, "weight", H)).toBeCloseTo(75, 10);
    expect(Number.isNaN(alcoholForOil(0, 25, "volume", H))).toBe(true);
    expect(Number.isNaN(alcoholForOil(10, 100, "volume", H))).toBe(true);
  });
});

// --------------------------------------------------- density, cost, checks
describe("density, cost and input checks", () => {
  it("measures density with the scale's uncertainty", () => {
    expect(measuredDensity(9.5, 10)).toEqual({ density: 0.95, plusMinus: 0.001 });
    expect(measuredDensity(0, 10)).toBeNull();
    expect(measuredDensity(5, 0)).toBeNull();
  });

  it("costs a batch and per bottle / mL", () => {
    const c = batchCost(23.75, 75, 2, { oilPerG: 2, ethanolPerL: 40, bottleEach: 10 });
    expect([c.oil, c.ethanol, c.glass, c.total]).toEqual([47.5, 3, 20, 70.5]);
    expect(batchCost(1, 1, 1, {}).total).toBe(0);
    expect(costPer(70.5, 2, 100)).toEqual({ perBottle: 35.25, perMl: 0.705 });
    expect(costPer(10, 0, 0)).toEqual({ perBottle: null, perMl: null });
  });

  const limits = { range: [20, 25] as const, oilDensity: [0.8, 1.2] as const, ethanolDensity: [0.78, 0.83] as const };
  it("is quiet for normal inputs", () => {
    expect(checkInputs(100, 22, H, limits)).toEqual([]);
    expect(checkInputs(100, 40, H, { ...limits, range: null })).toEqual([]);
  });
  it("flags zero amounts, impossible or out-of-range strengths, odd densities", () => {
    const codes = (a: number, p: number, d = H) => checkInputs(a, p, d, limits).map((w) => w.code);
    expect(codes(0, 22)).toEqual(["amount_not_positive"]);
    expect(codes(100, 0)).toEqual(["concentration_out_of_bounds"]);
    expect(codes(100, 100)).toEqual(["concentration_out_of_bounds"]);
    expect(codes(100, 30)).toEqual(["outside_family_range"]);
    expect(codes(100, 22, { oil: 1.5, ethanol: 0.7 })).toEqual(["oil_density_implausible", "ethanol_density_implausible"]);
  });
});
