import { describe, it, expect } from "vitest";
import { buildBatch } from "./batchPayload";
import { solveBottle } from "./calc";

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
  it("is the same row from the calculator and from bench mode", () => {
    const calc = buildBatch({ ...base, actualOilG: "23.8", actualEthG: "60.7" });
    const bench = buildBatch({ ...base, actualOilG: 23.8, actualEthG: 60.7 });
    expect(bench).toEqual(calc);
  });
});
