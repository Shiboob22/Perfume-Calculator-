import { describe, it, expect } from "vitest";
import { scentOptions, toPlanOrder, scentTextKey, stockMap } from "./orders";

const recipes = [
  { id: "r1", name: "Oud Nights", family: "woody", recipe_versions: [{ id: "v1", version: 1, concentration_pct: 20, oil_density: 0.97 }, { id: "v2", version: 2, concentration_pct: 25, oil_density: null }] },
  { id: "r0", name: "Amber", family: null, recipe_versions: [] },
];
const inventory = [{ fragrance_id: "f1", stock_g: 40, fragrances: { name: "Bergamot", tier: "fresh" } }, { fragrance_id: "f2", stock_g: "x", fragrances: null }];

describe("scent options", () => {
  it("formulas at their newest version, then oils in stock", () => {
    const o = scentOptions(recipes, inventory);
    expect(o.map((x) => x.key)).toEqual(["v:v2", "f:f1"]);
    expect(o[0]).toMatchObject({ kind: "formula", label: "Oud Nights", family: "woody", strengthPct: 25 });
    expect(o[1]).toMatchObject({ kind: "oil", fragrance_id: "f1", family: "fresh" });
    expect(scentOptions()).toEqual([]);
  });
});

describe("toPlanOrder", () => {
  const base = { id: "o1", scent_text: " Oud  Nights ", size_ml: "50", strength_pct: "25", status: "queued", group_mode: "mix" };
  it("a formula order carries its version's measured density", () => {
    expect(toPlanOrder({ ...base, recipe_version_id: "v1" }, { recipes })).toMatchObject({ scentKey: "v:v1", oilDensity: 0.97, sizeMl: 50, strengthPct: 25 });
    expect(toPlanOrder({ ...base, recipe_version_id: "v2" }, { recipes }).oilDensity).toBeNull();
    expect(toPlanOrder({ ...base, recipe_version_id: "gone" }).oilDensity).toBeNull();
  });
  it("an oil order is keyed and stocked by its fragrance", () => {
    expect(toPlanOrder({ ...base, fragrance_id: "f1", family: "fresh" })).toMatchObject({ scentKey: "f:f1", stockKey: "f1", family: "fresh" });
  });
  it("typed names group by their text", () => {
    expect(toPlanOrder(base).scentKey).toBe("t:oud nights");
    expect(toPlanOrder({ ...base, scent_text: "" }).scentKey).toBeNull();
    expect(toPlanOrder({ ...base, size_ml: null, strength_pct: undefined })).toMatchObject({ sizeMl: 0, strengthPct: 0, wantedBy: null, family: null, stockKey: null });
    expect(scentTextKey(null)).toBe("");
  });
});

describe("stockMap", () => {
  it("grams by fragrance, unknown as null", () => {
    expect(stockMap(inventory)).toEqual({ f1: 40, f2: null });
    expect(stockMap()).toEqual({});
  });
});

import { weighLink, toBottlingOrder } from "./orders";

describe("weighLink", () => {
  it("opens the Bench at the mix's volume with its orders", () => {
    const url = new URL(weighLink({ scentName: "Oud Nights", family: "woody", strengthPct: 25, scentKey: "v:v9" }, { mixMl: 105, orderIds: ["a", "b"] }), "http://x");
    expect(url.pathname).toBe("/bench");
    expect(Object.fromEntries(url.searchParams)).toEqual({ name: "Oud Nights", family: "woody", size: "105", unit: "ml", conc: "25", recipe: "v9", orders: "a,b" });
  });
  it("leaves out what the group doesn't have", () => {
    const q = new URL(weighLink({ scentName: "Rose", family: null, strengthPct: 20, scentKey: "t:rose" }, { mixMl: 30, orderIds: ["c"] }), "http://x").searchParams;
    expect([q.has("family"), q.has("recipe"), q.get("orders")]).toEqual([false, false, "c"]);
  });
});

describe("toBottlingOrder", () => {
  it("takes the batch's number and blend date from the join", () => {
    expect(toBottlingOrder({ id: "o", status: "resting", batch_id: "b", family: "fresh", scent_text: "Neroli", strength_pct: "20", batches: { batch_no: 7, blend_date: "2026-11-01" } }))
      .toEqual({ id: "o", status: "resting", family: "fresh", batchId: "b", blendDate: "2026-11-01", batchNo: 7, scentName: "Neroli", strengthPct: 20 });
    expect(toBottlingOrder({ id: "o", status: "resting", scent_text: "N", strength_pct: null })).toMatchObject({ batchId: null, blendDate: null, batchNo: null, family: null, strengthPct: 0 });
  });
});
