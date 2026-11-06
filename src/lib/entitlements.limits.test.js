import { describe, it, expect } from "vitest";
import {
  can, limit, left, canAddFormula, canAddIngredient, journalOpen, planInForce, trialState,
  fromPlanRow, FALLBACK, GATES, FEATURES,
} from "./entitlements";
import plans from "../site/plans.json";

const free = fromPlanRow(plans.find((p) => p.id === "free"));
const pro = fromPlanRow(plans.find((p) => p.id === "pro"));
const NOW = new Date("2026-11-05T12:00:00Z");

describe("Bench SaaS gates", () => {
  it("locks reminders, cost per bottle and the full journal on Free only", () => {
    for (const g of ["reminders", "costPerBottle", "fullJournal"]) {
      expect(can(free, g), g).toBe(false);
      expect(can(pro, g), g).toBe(true);
    }
  });
  it("keeps label PNG and share links Free on every plan (owner, Phase 0)", () => {
    for (const e of [free, pro, FALLBACK, undefined]) {
      expect(can(e, "labelPng")).toBe(true);
      expect(can(e, "shareLinks")).toBe(true);
    }
  });
  it("maps every gate to a known plan feature or to none", () => {
    for (const f of Object.values(GATES)) if (f !== null) expect(FEATURES).toContain(f);
  });
  it("still answers plain feature keys", () => {
    expect(can(pro, "inventory")).toBe(true);
    expect(can(free, "inventory")).toBe(false);
  });
});

describe("limit()", () => {
  it("gives Free 3 blend materials and the last 3 journal batches, and no formula limit (0034)", () => {
    expect(limit(free, "formulas")).toBe(Infinity);
    expect(limit(free, "ingredients")).toBe(3);
    expect(limit(free, "journalBatches")).toBe(3);
  });
  it("is unlimited on Pro", () => {
    for (const n of ["formulas", "ingredients", "journalBatches"]) expect(limit(pro, n)).toBe(Infinity);
  });
  it("reads missing entitlements or an old plan row as Free, never as unlimited", () => {
    expect(limit(undefined, "ingredients")).toBe(3);
    expect(limit(undefined, "formulas")).toBe(Infinity); // Free has no formula limit
    expect(limit(FALLBACK, "ingredients")).toBe(3);
    expect(limit({ features: [] }, "journalBatches")).toBe(3);
    // An old /api/me answer without formulaCap reads Free's (none), never as null.
    expect(limit({ features: [] }, "formulas")).toBe(Infinity);
    expect(canAddFormula({ features: [] }, 0)).toBe(true);
  });
  it("refuses an unknown limit name", () => {
    expect(() => limit(free, "bottles")).toThrow(/Unknown limit/);
  });
  it("counts down to the cap", () => {
    const capped = fromPlanRow({ id: "x", name: "Capped", features: [], formula_cap: 5 });
    expect(left(capped, "formulas", 3)).toBe(2);
    expect(left(capped, "formulas", 9)).toBe(0);
    expect(canAddFormula(capped, 4)).toBe(true);
    expect(canAddFormula(capped, 5)).toBe(false);
    expect(canAddFormula(free, 40)).toBe(true);
    expect(canAddFormula(pro, 500)).toBe(true);
    expect(canAddIngredient(free, 2)).toBe(true);
    expect(canAddIngredient(free, 3)).toBe(false);
  });
});

describe("journalOpen()", () => {
  const batches = [1, 2, 3, 4, 5].map((n) => ({ id: `b${n}`, batch_no: n }));
  it("opens the 3 newest batches by number on Free, in any input order", () => {
    expect([...journalOpen(free, [...batches].reverse())].sort()).toEqual(["b3", "b4", "b5"]);
    expect([...journalOpen(free, batches.slice(0, 2))].sort()).toEqual(["b1", "b2"]);
  });
  it("opens every batch on Pro", () => {
    expect(journalOpen(pro, batches).size).toBe(5);
  });
  it("breaks missing numbers by created_at, newest first", () => {
    const rows = [
      { id: "old", created_at: "2026-01-01" }, { id: "mid", created_at: "2026-05-01" },
      { id: "new", created_at: "2026-09-01" }, { id: "newest", created_at: "2026-10-01" },
    ];
    expect([...journalOpen(free, rows)].sort()).toEqual(["mid", "new", "newest"]);
  });
  it("is empty for no batches", () => {
    expect(journalOpen(free, undefined).size).toBe(0);
  });
});

describe("the trial", () => {
  const trial = (ends) => ({ plan_id: "pro", source: "trial", trial_started_at: "2026-11-01T12:00:00Z", trial_ends_at: ends });
  it("is Pro while it runs and Free once it ends", () => {
    expect(planInForce(trial("2026-11-15T12:00:00Z"), NOW)).toBe("pro");
    expect(planInForce(trial("2026-11-05T12:00:00Z"), NOW)).toBe("free");
    expect(planInForce(trial(null), NOW)).toBe("free");
  });
  it("leaves manual and provider plans alone, and no row means none", () => {
    expect(planInForce({ plan_id: "pro", source: "manual" }, NOW)).toBe("pro");
    expect(planInForce({ plan_id: "pro", source: "provider", trial_ends_at: "2020-01-01" }, NOW)).toBe("pro");
    expect(planInForce(null, NOW)).toBeNull();
  });
  it("reports days left, rounded up, and an ended trial as used", () => {
    expect(trialState(trial("2026-11-15T12:00:00Z"), NOW)).toEqual({ endsAt: "2026-11-15T12:00:00Z", active: true, used: true, daysLeft: 10 });
    expect(trialState(trial("2026-11-05T13:00:00Z"), NOW).daysLeft).toBe(1);
    expect(trialState(trial("2026-11-01T00:00:00Z"), NOW)).toEqual({ endsAt: "2026-11-01T00:00:00Z", active: false, used: true, daysLeft: 0 });
    expect(trialState({ plan_id: "free", source: "manual" }, NOW)).toBeNull();
  });
});
