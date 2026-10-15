import { describe, it, expect } from "vitest";
import { buildBatch, storedDensities } from "./batchPayload";
import { solveBottle, calculate } from "./calc";

const densities = { oil: 0.95, ethanol: 0.81 };
const target = solveBottle(100, "ml", 25, densities);
const base = { id: "x", fragranceId: "f", name: "Oud", tier: "woody", blendDate: "2026-10-04", concPct: "25", target, densities };

describe("buildBatch", () => {
  it("carries the handbook's numbers for 100 mL at 25%", () => {
    const b = buildBatch(base);
    expect(b).toMatchObject({ id: "x", fragrance_id: "f", concentration_pct: 25, basis: "volume", oil_density: 0.95, ethanol_density: 0.81 });
    expect(b.oil_g).toBeCloseTo(23.75);
    expect(b.ethanol_g).toBeCloseTo(60.75);
    expect(b.total_g).toBeCloseTo(84.5);
  });
  it("turns blanks and zeros into null, and trims text", () => {
    const b = buildBatch({ ...base, fragranceId: "", actualOilG: "0", actualEthG: "", pricePerGram: "", oilCost: NaN, notes: "  ", oilType: " Supplier ", blendedBy: undefined });
    expect(b).toMatchObject({ fragrance_id: null, actual_oil_g: null, actual_ethanol_g: null, price_per_gram: null, oil_cost: null, notes: null, oil_type: "Supplier", blended_by: null });
  });
  it("costs the oil used when no cost is given", () => {
    expect(buildBatch({ ...base, pricePerGram: "2", actualOilG: "24" }).oil_cost).toBeCloseTo(48);
    expect(buildBatch({ ...base, pricePerGram: "2" }).oil_cost).toBeCloseTo(47.5);
    expect(buildBatch({ ...base }).oil_cost).toBeNull();
  });
  it("carries the lot and the bottle as entered", () => {
    expect(buildBatch({ ...base, lot: " L1 ", amount: "50", unit: "g" })).toMatchObject({ lot: "L1", amount: 50, unit: "g" });
  });
  it("is the same row from the calculator and from bench mode", () => {
    const calc = buildBatch({ ...base, actualOilG: "23.8", actualEthG: "60.7" });
    const bench = buildBatch({ ...base, actualOilG: 23.8, actualEthG: 60.7 });
    expect(bench).toEqual(calc);
  });
});

describe("densities a batch records", () => {
  const base = { amount: 100, unit: "ml", concPct: 25 };
  const mk = (extra) => {
    const result = calculate({ ...base, ...extra });
    return { result, row: buildBatch({ id: "x", name: "n", tier: "woody", blendDate: "2026-10-01", concPct: 25, target: result, densities: storedDensities(result) }) };
  };
  it("stores the user's own densities", () => {
    const { row } = mk({ oilDensity: 0.95, ethanolDensity: 0.81 });
    expect(row).toMatchObject({ oil_density: 0.95, ethanol_density: 0.81 });
  });
  it("stores null for a blank field, not the fallback it was calculated with", () => {
    const { row } = mk({ oilDensity: "", ethanolDensity: 0.81 });
    expect(row.oil_density).toBeNull();
    expect(row.ethanol_density).toBe(0.81);
    expect(mk({ oilDensity: 0.95, ethanolDensity: "" }).row.ethanol_density).toBeNull();
  });
});

describe("cost", () => {
  const input = { amount: 100, unit: "ml", concPct: 25, oilDensity: 0.95, ethanolDensity: 0.81, pricePerGram: 2, ethanolPricePerL: 10, bottleCost: 1, bottles: 1 };
  it("per mL follows the pours actually recorded", () => {
    const planned = calculate(input);
    expect(planned.cost.perMl).toBeCloseTo(planned.cost.total / 100, 12);
    const poured = calculate({ ...input, actualOilG: 30, actualEthanolG: 60 });
    expect(poured.cost.perMl).toBeCloseTo(poured.cost.total / (30 / 0.95 + 60 / 0.81), 12);
  });
  it("says so when a bottle price has no bottles", () => {
    expect(calculate({ ...input, bottles: "" }).warnings.map((w) => w.code)).toContain("bottles_missing");
    expect(calculate(input).warnings.map((w) => w.code)).not.toContain("bottles_missing");
    expect(calculate({ ...input, bottleCost: "", bottles: "" }).warnings.map((w) => w.code)).not.toContain("bottles_missing");
  });
});
