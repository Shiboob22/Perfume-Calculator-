import { describe, it, expect } from "vitest";
import { batchSettings, makeAgainHref, oilHistory } from "./oilHistory";

const F = "f1";
const base = { tier: "woody", concentration_pct: 25, total_ml: 100, total_g: 84.5, basis: "volume", fragrance_name: "Oud Nights", fragrance_id: F, oil_g: 23.75, ethanol_g: 60.75, oil_density: 0.95, ethanol_density: 0.81 };

describe("makeAgainHref and recipes", () => {
  const V = "33333333-3333-4333-8333-333333333333";
  it("carries the recipe version a batch was made from", () => {
    expect(makeAgainHref({ ...base, recipe_version_id: V })).toBe(`/bench?size=100&unit=ml&conc=25&family=woody&name=Oud+Nights&recipe=${V}`);
  });
});

describe("batchSettings and makeAgainHref", () => {
  it("uses the bottle as entered, else the total by basis", () => {
    expect(batchSettings({ ...base, amount: 50, unit: "g" })).toMatchObject({ size: 50, unit: "g", conc: 25, family: "woody" });
    expect(batchSettings({ ...base, basis: "weight" })).toMatchObject({ size: 84.5, unit: "g" });
    expect(batchSettings(base)).toMatchObject({ size: 100, unit: "ml" });
    expect(batchSettings({ ...base, tier: "nope" }).family).toBeNull();
  });
  it("links the calculator with the batch's settings", () => {
    expect(makeAgainHref(base)).toBe("/bench?size=100&unit=ml&conc=25&family=woody&name=Oud+Nights");
  });
});

describe("oilHistory", () => {
  const rows = [
    { ...base, id: "a", blend_date: "2026-08-01" },
    { ...base, id: "b", blend_date: "2026-09-01", actual_oil_g: 23.75, actual_ethanol_g: 60.75,
      batch_checkins: [{ day: 1, rating: 3 }, { day: 14, rating: 5 }, { day: 28, rating: 4 }] },
    { ...base, id: "c", fragrance_id: null, fragrance_name: "oud nights ", blend_date: "2026-07-01" },
    { ...base, id: "d", fragrance_id: "other", blend_date: "2026-10-01" },
    { ...base, id: "e", fragrance_id: null, fragrance_name: "Rose", blend_date: "2026-10-02" },
  ];
  it("finds the oil's batches by id or, without one, by name, newest first", () => {
    expect(oilHistory(rows, { fragranceId: F, name: "Oud Nights" }).map((h) => h.id)).toEqual(["b", "a", "c"]);
    expect(oilHistory(rows, { name: "Rose" }).map((h) => h.id)).toEqual(["e"]);
    expect(oilHistory(rows, {})).toEqual([]);
  });
  it("carries the poured strength and the best day, and stops at the limit", () => {
    const [b] = oilHistory(rows, { fragranceId: F });
    expect(b.poured).toBeCloseTo(25);
    expect(b.peak).toBe(14);
    expect(oilHistory(rows, { fragranceId: F }, 1)).toHaveLength(1);
  });
});
