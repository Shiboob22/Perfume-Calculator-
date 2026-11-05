import { describe, it, expect } from "vitest";
import {
  blendMix, ingredientAmounts, balanceShares, densityOf, INGREDIENT_TYPES, INGREDIENT_KEYS,
  costFor, MAX_MARGIN_PCT, pourScaleAt, ingredientTarget, blendEthanolTarget, POUR_BAND,
  byVolume, byWeight, alcoholForOil, round2,
} from "./index";
import { ETHANOL_DENSITY } from "../formulation";
import { pourProgress } from "../pourProgress.js";

const SEED = [
  { id: 1, name: "Bergamot", type: "eo", pct: 40, price: 6 },
  { id: 2, name: "Hedione", type: "aroma", pct: 40, price: 3 },
  { id: 3, name: "Ambroxan", type: "aroma", pct: 20, price: 9 },
];
const d = (oil: number) => ({ oil, ethanol: ETHANOL_DENSITY });

describe("material types", () => {
  it("has the five types at their starting-point densities", () => {
    expect(INGREDIENT_KEYS).toEqual(["eo", "aroma", "absolute", "fixative", "dpg"]);
    expect(Object.fromEntries(INGREDIENT_KEYS.map((k) => [k, INGREDIENT_TYPES[k].density])))
      .toEqual({ eo: 0.9, aroma: 1.0, absolute: 1.02, fixative: 1.05, dpg: 1.02 });
  });
  it("reads an unknown or missing type as an essential oil", () => {
    expect(densityOf("resinoid")).toBe(0.9);
    expect(densityOf(undefined)).toBe(0.9);
    expect(densityOf("fixative")).toBe(1.05);
  });
});

describe("blendMix", () => {
  it("gives the seed blend's density, 1 / Σ(w/ρ)", () => {
    const m = blendMix(SEED);
    expect(m.density).toBeCloseTo(0.9574, 4);
    expect(m.density).toBeCloseTo(1 / (0.4 / 0.9 + 0.4 / 1 + 0.2 / 1), 12);
    expect(m.sum).toBe(100);
    expect(m.parts.map((p) => p.w)).toEqual([0.4, 0.4, 0.2]);
  });
  it("gives the weighted price per gram", () => {
    expect(blendMix(SEED).avgPrice).toBeCloseTo(0.4 * 6 + 0.4 * 3 + 0.2 * 9, 12); // 5.40
  });
  it("normalises shares that sum to 85 the same way as ones that sum to 100", () => {
    const scaled = SEED.map((i) => ({ ...i, pct: (i.pct * 85) / 100 })); // 34 + 34 + 17
    const m = blendMix(scaled);
    expect(m.sum).toBeCloseTo(85, 12);
    expect(m.density).toBeCloseTo(blendMix(SEED).density!, 12);
    expect(m.avgPrice).toBeCloseTo(blendMix(SEED).avgPrice, 12);
  });
  it("returns density null for an empty, missing or all-zero blend, without throwing", () => {
    for (const list of [[], null, undefined, [{ pct: 0 }, { pct: "0" }], [{ pct: -5 }], [{ pct: "abc" }]]) {
      expect(() => blendMix(list as never)).not.toThrow();
      expect(blendMix(list as never)).toEqual({ sum: 0, density: null, avgPrice: 0, parts: [] });
    }
  });
  it("leaves out materials at zero or below, and reads shares typed as text", () => {
    const m = blendMix([{ type: "eo", pct: "50" }, { type: "aroma", pct: 0 }, { type: "fixative", pct: -10 }, { type: "aroma", pct: 50 }]);
    expect(m.sum).toBe(100);
    expect(m.parts).toHaveLength(2);
    expect(m.density).toBeCloseTo(1 / (0.5 / 0.9 + 0.5 / 1), 12);
  });
  it("prices a missing, blank or negative price at zero", () => {
    expect(blendMix([{ pct: 50, price: null }, { pct: 50 }]).avgPrice).toBe(0);
    expect(blendMix([{ pct: 50, price: -4 }, { pct: 50, price: "" }]).avgPrice).toBe(0);
  });
  it("a single material has that material's density", () => {
    expect(blendMix([{ type: "absolute", pct: 7 }]).density).toBeCloseTo(1.02, 12);
  });
});

describe("a blend in the batch calculation", () => {
  it("uses the blend density as the oil density, and the materials add up to the concentrate", () => {
    const rho = blendMix(SEED).density!;
    const a = byVolume(100, 0.2, d(rho));
    expect(a.oilG).toBeCloseTo(20 * rho, 12);
    expect(a.ethanolG).toBeCloseTo(80 * ETHANOL_DENSITY, 12);
    const parts = ingredientAmounts(a.oilG, SEED);
    expect(parts.map((p) => round2(p.g))).toEqual([7.66, 7.66, 3.83]);
    expect(parts.reduce((s, p) => s + p.g, 0)).toBeCloseTo(a.oilG, 12);
    // The volumes add up to the concentrate's volume: the split stays exact.
    expect(parts.reduce((s, p) => s + p.ml, 0)).toBeCloseTo(a.oilMl, 12);
  });
  it("per-material grams = concentrate grams × normalised share, 0 for a left-out material", () => {
    const parts = ingredientAmounts(10, [{ pct: 30 }, { pct: 0 }, { pct: 10, type: "aroma" }]);
    expect(parts.map((p) => p.share)).toEqual([0.75, 0, 0.25]);
    expect(parts.map((p) => p.g)).toEqual([7.5, 0, 2.5]);
    expect(parts[2].ml).toBeCloseTo(2.5, 12);
  });
  it("gives zeros, not errors, for no concentrate or no materials", () => {
    expect(ingredientAmounts(-3, [{ pct: 10 }])[0].g).toBe(0);
    expect(ingredientAmounts(10, null)).toEqual([]);
    expect(ingredientAmounts(10, [{ pct: 0 }])[0]).toMatchObject({ share: 0, g: 0 });
  });
  it("works by weight too", () => {
    const a = byWeight(50, 0.25, d(blendMix(SEED).density!));
    expect(ingredientAmounts(a.oilG, SEED).map((p) => p.g)).toEqual([5, 5, 2.5]);
  });
});

describe("balanceShares", () => {
  it("scales to exactly 100, in tenths, remainder to the largest share", () => {
    const out = balanceShares([{ id: "a", pct: 1 }, { id: "b", pct: 1 }, { id: "c", pct: 1 }]);
    expect(out.map((i) => i.pct)).toEqual([33.4, 33.3, 33.3]);
    expect(out.reduce((s, i) => s + i.pct, 0)).toBeCloseTo(100, 9);
    expect(out[0].id).toBe("a");
    // Largest share last: the remainder goes there.
    expect(balanceShares([{ pct: 1 }, { pct: 1 }, { pct: 2 }]).map((i) => i.pct)).toEqual([25, 25, 50]);
  });
  it("leaves a list that already adds to 100 alone, and zeroes negatives", () => {
    expect(balanceShares(SEED).map((i) => i.pct)).toEqual([40, 40, 20]);
    expect(balanceShares([{ pct: 50 }, { pct: -5 }, { pct: 25 }]).map((i) => i.pct)).toEqual([66.7, 0, 33.3]);
  });
  it("returns a list with nothing positive unchanged (a copy)", () => {
    const list = [{ pct: 0 }];
    const out = balanceShares(list);
    expect(out).toEqual(list);
    expect(out).not.toBe(list);
  });
});

describe("costFor", () => {
  it("prices 100 mL at 10 % with oil density 0.87 into 50 mL bottles", () => {
    const a = byVolume(100, 0.1, d(0.87));
    expect(round2(a.oilG)).toBe(8.7);
    const c = costFor({ oilG: a.oilG, ethMl: a.ethanolMl, totMl: a.totalMl, bottleMl: 50, oilPrice: 8, ethPrice: 150, pack: 45, margin: 60 });
    expect(round2(c.batch)).toBe(83.1);
    expect(round2(c.perBottle)).toBe(86.55);
    expect(c.retail).toBe(220);
    expect(c.bottles).toBe(2);
  });
  it("does not push an exact multiple of 5 up a step (float noise)", () => {
    // 88 / 0.4 = 220.00000000000003 in floating point.
    const c = costFor({ oilG: 0, ethMl: 0, totMl: 100, bottleMl: 50, oilPrice: 0, ethPrice: 0, pack: 88, margin: 60 });
    expect(c.perBottle).toBe(88);
    expect(c.retail).toBe(220);
  });
  it("clamps the margin to 0–95 %", () => {
    const base = { oilG: 0, ethMl: 0, totMl: 10, bottleMl: 10, oilPrice: 0, ethPrice: 0, pack: 10 };
    expect(costFor({ ...base, margin: -20 }).retail).toBe(10);
    expect(costFor({ ...base, margin: 0 }).retail).toBe(10);
    expect(costFor({ ...base, margin: 99 }).retail).toBe(costFor({ ...base, margin: MAX_MARGIN_PCT }).retail);
    expect(costFor({ ...base, margin: 95 }).retail).toBe(200);
  });
  it("counts whole bottles only, without float noise", () => {
    const base = { oilG: 1, ethMl: 1, oilPrice: 1, ethPrice: 1, pack: 0, margin: 0 };
    expect(costFor({ ...base, totMl: 30, bottleMl: 10 }).bottles).toBe(3); // 30/10 exactly, not 2.9999
    expect(costFor({ ...base, totMl: 0.3 * 100, bottleMl: 0.1 * 100 }).bottles).toBe(3);
    expect(costFor({ ...base, totMl: 45, bottleMl: 50 }).bottles).toBe(0);
  });
  it("gives zeros for a missing bottle or batch volume, and treats bad inputs as zero", () => {
    const c = costFor({ oilG: 10, ethMl: 90, totMl: 100, bottleMl: 0, oilPrice: 8, ethPrice: 150, pack: 45, margin: 60 });
    expect(c).toEqual({ batch: 93.5, perBottle: 0, retail: 0, bottles: 0 });
    expect(costFor({ oilG: 10, ethMl: 90, totMl: 0, bottleMl: 50, oilPrice: 8, ethPrice: 150, pack: 45, margin: 60 }).perBottle).toBe(0);
    expect(costFor({ oilG: NaN, ethMl: -1, totMl: 100, bottleMl: 50, oilPrice: 8, ethPrice: 150, pack: -45, margin: NaN }))
      .toEqual({ batch: 0, perBottle: 0, retail: 0, bottles: 2 });
  });
  it("prices a blend at its weighted price per gram", () => {
    const m = blendMix(SEED);
    const a = byVolume(100, 0.2, d(m.density!));
    const c = costFor({ oilG: a.oilG, ethMl: a.ethanolMl, totMl: a.totalMl, bottleMl: 50, oilPrice: m.avgPrice, ethPrice: 150, pack: 45, margin: 60 });
    expect(c.batch).toBeCloseTo(a.oilG * 5.4 + 0.08 * 150, 9);
  });
});

describe("blend pour scaling", () => {
  it("scales the second material when the first went over: bases [10, 5], first = 10.4 → 5.20", () => {
    expect(pourScaleAt([10, 5], [10.4], 1)).toBeCloseTo(1.04, 12);
    expect(round2(ingredientTarget([10, 5], [10.4], 1))).toBe(5.2);
  });
  it("never scales the first material, nor down after an under-pour", () => {
    expect(ingredientTarget([10, 5], [], 0)).toBe(10);
    expect(ingredientTarget([10, 5], [9.6], 1)).toBe(5);
  });
  it("uses the largest overshoot of all earlier materials", () => {
    const bases = [10, 5, 2];
    expect(pourScaleAt(bases, [10.2, 5.5], 2)).toBeCloseTo(1.1, 12); // 5.5/5 beats 10.2/10
    expect(pourScaleAt(bases, [11, 5.1], 2)).toBeCloseTo(1.1, 12); // 11/10 beats 5.1/5
    expect(round2(ingredientTarget(bases, [11, 5.1], 2))).toBe(2.2);
  });
  it("skips materials not poured yet, with no base, or not a number", () => {
    expect(pourScaleAt([10, 0, 5], [null, 3, undefined], 2)).toBe(1);
    expect(pourScaleAt([10, 5], [NaN], 1)).toBe(1);
    expect(pourScaleAt([10], [12], 5)).toBeCloseTo(1.2, 12); // i past the end
    expect(ingredientTarget([10], [12], 3)).toBe(0);
  });
  it("sets the ethanol for the sum actually poured, at the blend density", () => {
    const rho = blendMix(SEED).density!;
    const poured = [7.9, 7.66, 3.83];
    const want = alcoholForOil(7.9 + 7.66 + 3.83, 20, "volume", d(rho));
    expect(blendEthanolTarget(poured, 20, "volume", d(rho))).toBeCloseTo(want, 12);
    // The planned pours give the planned ethanol back.
    const a = byVolume(100, 0.2, d(rho));
    const planned = ingredientAmounts(a.oilG, SEED).map((p) => p.g);
    expect(blendEthanolTarget(planned, 20, "volume", d(rho))).toBeCloseTo(a.ethanolG, 9);
    expect(blendEthanolTarget(planned, 20, "weight", d(rho))).toBeCloseTo(alcoholForOil(a.oilG, 20, "weight", d(rho)), 9);
  });
  it("ignores missing, negative or non-number pours, and is NaN before anything is poured", () => {
    expect(blendEthanolTarget([5, null, -2, NaN, undefined], 20, "weight", d(1))).toBeCloseTo(20, 12);
    expect(blendEthanolTarget([], 20, "volume", d(1))).toBeNaN();
  });
});

describe("the 1 % pour band", () => {
  it("is 0.01 and reads on target within ±1 %", () => {
    expect(POUR_BAND).toBe(0.01);
    expect(pourProgress(5.04, 5, POUR_BAND).state).toBe("ok");
    expect(pourProgress(4.94, 5, POUR_BAND).state).toBe("under");
    expect(pourProgress(5.06, 5, POUR_BAND).state).toBe("over");
  });
});
