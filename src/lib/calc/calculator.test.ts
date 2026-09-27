import { describe, it, expect } from "vitest";
import { calculate } from "./calculator";
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
