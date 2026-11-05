import { describe, it, expect } from "vitest";
import { pourItems, pourSteps, pourState, pourSummary, pourRecord, alcoholForOil, ingredientAmounts } from "./index";

const D = { oil: 0.9, ethanol: 0.81 };
const blend = [
  { name: "Bergamot", type: "eo", pct: 50 },
  { name: "Hedione", type: "aroma", pct: 30 },
  { name: "Ambroxan", type: "fixative", pct: 20 },
];

describe("pour-along steps", () => {
  it("a simple formula has one oil step", () => {
    const items = pourItems(17.4, null);
    expect(items).toEqual([{ name: null, type: null, pct: null, base: 17.4 }]);
    expect(pourSteps(items).map((s) => s.key)).toEqual(["prepare", "tare", "pour", "ethanol", "mix", "qc", "done"]);
  });

  it("a blend has one step per material, in order", () => {
    const items = pourItems(20, blend);
    expect(items.map((i) => i.name)).toEqual(["Bergamot", "Hedione", "Ambroxan"]);
    expect(items.map((i) => i.base)).toEqual(ingredientAmounts(20, blend).map((a) => a.g));
    const steps = pourSteps(items);
    expect(steps.map((s) => s.key)).toEqual(["prepare", "tare", "pour", "pour", "pour", "ethanol", "mix", "qc", "done"]);
    expect(steps.filter((s) => s.key === "pour")).toEqual([
      { key: "pour", index: 0, name: "Bergamot" }, { key: "pour", index: 1, name: "Hedione" }, { key: "pour", index: 2, name: "Ambroxan" },
    ]);
  });

  it("leaves out materials with no share; an empty blend falls back to one oil", () => {
    expect(pourItems(10, [...blend, { name: "Nothing", pct: 0 }]).map((i) => i.name)).toEqual(["Bergamot", "Hedione", "Ambroxan"]);
    expect(pourItems(10, [{ name: "x", pct: 0 }])).toEqual([{ name: null, type: null, pct: null, base: 10 }]);
    expect(pourItems(-3, [])[0].base).toBe(0);
  });

  it("shares that don't add to 100 still split the concentrate", () => {
    const items = pourItems(26, [{ name: "a", pct: 100 }, { name: "b", pct: 30 }]);
    expect(items[0].base).toBeCloseTo(20, 12);
    expect(items[1].base).toBeCloseTo(6, 12);
  });
});

describe("pour-along targets", () => {
  const items = pourItems(20, blend); // 10, 6, 4 g
  const planned = 30;

  it("before any pour: the plan, and the planned ethanol", () => {
    const s = pourState(items, [], 20, "volume", D, planned);
    expect(s.targets).toEqual([10, 6, 4]);
    expect(s.scales).toEqual([1, 1, 1]);
    expect(s.ethanolTarget).toBe(planned);
    expect(s.ethanolAdjusted).toBe(false);
  });

  it("an over-pour on the first material scales the rest by the overshoot", () => {
    const s = pourState(items, ["11"], 20, "volume", D, planned);
    expect(s.scales[0]).toBe(1);
    expect(s.scales[1]).toBeCloseTo(1.1, 12);
    expect(s.targets[1]).toBeCloseTo(6.6, 12);
    expect(s.targets[2]).toBeCloseTo(4.4, 12);
  });

  it("the ethanol follows what was poured, in the blend's density", () => {
    const s = pourState(items, [11, 6.6, 4.4], 20, "volume", D, planned);
    expect(s.concentrateG).toBeCloseTo(22, 12);
    expect(s.ethanolTarget).toBeCloseTo(alcoholForOil(22, 20, "volume", D), 12);
    expect(s.ethanolAdjusted).toBe(true);
  });

  it("an exact pour is not an adjustment", () => {
    expect(pourState(items, [10, 6, 4], 20, "volume", D, planned).ethanolAdjusted).toBe(false);
    expect(pourState(items, [10, 6, 4.004], 20, "volume", D, planned).ethanolAdjusted).toBe(false);
  });
});

describe("pour-along summary and record", () => {
  it("made % by volume for what was poured", () => {
    // 20 g oil at 0.9 = 22.22 mL; 72 g ethanol at 0.81 = 88.89 mL → 20 %.
    const s = pourSummary(20, "72", "volume", D);
    expect(s.totalG).toBe(92);
    expect(s.madePct).toBeCloseTo(20, 9);
    expect(pourSummary(20, "", "volume", D).madePct).toBe(0);
  });

  it("by weight for a batch made by weight", () => {
    expect(pourSummary(20, 80, "weight", D).madePct).toBeCloseTo(20, 12);
  });

  it("stores per-material grams for a blend, none for a simple formula", () => {
    const items = pourItems(20, blend);
    const s = pourState(items, [11, 6.61, 4.4], 20, "volume", D, 30);
    expect(pourRecord(items, [11, 6.61, 4.4], s.targets)).toEqual([
      { name: "Bergamot", type: "eo", pct: 50, target_g: 10, actual_g: 11 },
      { name: "Hedione", type: "aroma", pct: 30, target_g: 6.6, actual_g: 6.61 },
      { name: "Ambroxan", type: "fixative", pct: 20, target_g: 4.41, actual_g: 4.4 }, // 6.61 / 6 beats 11 / 10,
    ]);
    expect(pourRecord(pourItems(17, null), [17], [17])).toBeNull();
    expect(pourRecord([], [], [])).toBeNull();
  });

  it("a material with no name or type keeps a blank name and no type", () => {
    const items = pourItems(10, [{ pct: 60 }, { name: "  B ", type: "", pct: "40" }, { name: "c", pct: "x" }]);
    expect(items).toEqual([{ name: "", type: null, pct: 60, base: 6 }, { name: "B", type: null, pct: 40, base: 4 }]);
    expect(pourRecord(items, [6, null], [6, 4])).toEqual([
      { name: null, type: null, pct: 60, target_g: 6, actual_g: 6 },
      { name: "B", type: null, pct: 40, target_g: 4, actual_g: null },
    ]);
  });
});
