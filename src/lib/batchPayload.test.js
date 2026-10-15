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
  it("costs the oil used when no cost is given", () => {
    expect(buildBatch({ ...base, pricePerGram: "2", actualOilG: "24" }).oil_cost).toBeCloseTo(48);
    expect(buildBatch({ ...base, pricePerGram: "2" }).oil_cost).toBeCloseTo(47.5);
    expect(buildBatch({ ...base }).oil_cost).toBeNull();
  });
  it("carries the lot and the bottle as entered", () => {
    expect(buildBatch({ ...base, lot: " L1 ", amount: "50", unit: "g" })).toMatchObject({ lot: "L1", amount: 50, unit: "g" });
  });
  it("links the recipe version only when given", () => {
    expect(buildBatch(base)).not.toHaveProperty("recipe_version_id");
    expect(buildBatch({ ...base, recipeVersionId: "" })).not.toHaveProperty("recipe_version_id");
    expect(buildBatch({ ...base, recipeVersionId: "v-1" }).recipe_version_id).toBe("v-1");
  });
  it("sends seller fields only when given, blanks as null", () => {
    expect(buildBatch(base)).not.toHaveProperty("sale_price");
    const seller = { ethanolPricePerL: "40", bottleCost: "10", bottles: "2.9", packagingCost: "", labourMinutes: "30", labourRate: "20", salePrice: "60", currency: "SAR" };
    expect(buildBatch({ ...base, seller })).toMatchObject({
      ethanol_price_per_l: 40, bottle_cost: 10, bottles: 2, packaging_cost: null, labour_minutes: 30, labour_rate_per_hour: 20, sale_price: 60, currency: "SAR",
    });
    expect(buildBatch({ ...base, seller: { bottles: "", currency: "sar" } })).toMatchObject({ bottles: null, currency: null });
  });
  it("does not record a fallback density as if it were entered", () => {
    const warned = { ...target, warnings: [{ code: "oil_density_missing", used: 1 }, { code: "ethanol_density_missing", used: 0.81 }] };
    expect(buildBatch({ ...base, target: warned })).toMatchObject({ oil_density: null, ethanol_density: null });
    expect(buildBatch({ ...base, target: { ...target, warnings: [] } })).toMatchObject({ oil_density: 0.95, ethanol_density: 0.81 });
  });
  it("is the same row from the calculator and from bench mode", () => {
    const calc = buildBatch({ ...base, actualOilG: "23.8", actualEthG: "60.7" });
    const bench = buildBatch({ ...base, actualOilG: 23.8, actualEthG: 60.7 });
    expect(bench).toEqual(calc);
  });
});
