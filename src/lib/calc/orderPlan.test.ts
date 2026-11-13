import { describe, it, expect } from "vitest";
import {
  MIX_ALLOWANCE_PCT, MAX_REST_DAYS, planMixes, restWindow, addDays, orderDensities, oilNeeds, type PlanOrder,
} from "./index";
import { FAMILIES, REFERENCE, ETHANOL_DENSITY } from "../formulation";

const o = (id: string, extra: Partial<PlanOrder> = {}): PlanOrder => ({
  id, scentKey: "f:oud", scentName: "Oud", sizeMl: 50, strengthPct: 25, status: "queued", ...extra,
});
// The handbook's reference densities, so the Quick Reference rows apply.
const ref = { oilDensity: REFERENCE.oilDensity };

describe("grouping", () => {
  it("50 + 50 mL @ 25 % with no allowance is the 100 mL @ 25 % Quick Reference row", () => {
    const plan = planMixes([o("a", ref), o("b", ref)], {}, 0);
    expect(plan.groups).toHaveLength(1);
    const m = plan.groups[0].mixes[0];
    expect([m.oilG, m.ethanolG, m.totalG, m.mixMl]).toEqual([23.75, 60.75, 84.5, 100]);
  });
  it("one mix carries 5 %: 105 mL, the row × 1.05", () => {
    expect(MIX_ALLOWANCE_PCT).toBe(5);
    const m = planMixes([o("a", ref), o("b", ref)]).groups[0].mixes[0];
    expect([m.orderedMl, m.mixMl, m.oilG, m.ethanolG, m.totalG, m.allowancePct]).toEqual([100, 105, 24.94, 63.79, 88.73, 5]);
    expect(m.orderIds).toEqual(["a", "b"]);
  });
  it("two strengths of one scent never share a mix", () => {
    const plan = planMixes([o("a"), o("b", { strengthPct: 30 })]);
    expect(plan.groups.map((g) => g.strengthPct).sort()).toEqual([25, 30]);
  });
  it("different scents are different groups", () => {
    expect(planMixes([o("a"), o("b", { scentKey: "f:rose" })]).groups).toHaveLength(2);
  });
  it("separate bottles: one plan per order, each exactly its size, no allowance", () => {
    const plan = planMixes([o("a", { ...ref, sizeMl: 30 }), o("b", { ...ref, sizeMl: 100, groupMode: "separate" })]);
    const g = plan.groups[0];
    expect(g.mode).toBe("separate");
    expect(g.mixes.map((m) => [m.orderedMl, m.allowancePct, m.mixMl])).toEqual([[30, 0, 30], [100, 0, 100]]);
    expect(g.mixes[1].totalG).toBe(84.5);
    expect(g.oilG).toBe(round(g.mixes[0].oilG + g.mixes[1].oilG));
    expect(g.orderedMl).toBe(130);
  });
  it("only open orders are planned; typed-only or incomplete ones are listed apart", () => {
    const plan = planMixes([
      o("a"), o("r", { status: "resting" }), o("c", { status: "cancelled" }),
      o("t", { scentKey: null }), o("z", { sizeMl: 0 }), o("p", { strengthPct: 0 }), o("q", { strengthPct: 100 }),
      o("pl", { status: "planned" }),
    ]);
    expect(plan.groups[0].orders.map((x) => x.id)).toEqual(["a", "pl"]);
    expect(plan.unplanned.map((x) => x.id).sort()).toEqual(["p", "q", "t", "z"]);
  });
  it("orders sort by wanted-by, undated last, then by id", () => {
    const plan = planMixes([o("c"), o("b", { wantedBy: "2026-12-01" }), o("a"), o("d", { wantedBy: "2026-11-20" }), o("e", { wantedBy: "2026-11-20" })]);
    expect(plan.groups[0].orders.map((x) => x.id)).toEqual(["d", "e", "b", "a", "c"]);
  });
  it("the group takes the first family, measured density and stock row any order has", () => {
    const g = planMixes([o("a"), o("b", { family: "woody", oilDensity: 0.97, stockKey: "s1" })]).groups[0];
    expect([g.family, g.densities.oil, g.stockKey]).toEqual(["woody", 0.97, "s1"]);
  });
  it("stable order for equal keys", () => {
    const plan = planMixes([o("a", { wantedBy: "2026-11-20" }), o("a", { wantedBy: "2026-11-20", scentKey: "f:x" })]);
    expect(plan.groups).toHaveLength(2);
  });
});

function round(x: number) { return Math.round(x * 100) / 100; }

describe("densities", () => {
  it("measured wins, then family, then the handbook's 0.95; ethanol 0.81", () => {
    expect(orderDensities("woody", 0.9)).toEqual({ oil: 0.9, ethanol: ETHANOL_DENSITY });
    expect(orderDensities("woody").oil).toBe(FAMILIES.woody.active.density);
    expect(orderDensities("woody", 0).oil).toBe(FAMILIES.woody.active.density);
    expect(orderDensities("nope").oil).toBe(REFERENCE.oilDensity);
    expect(orderDensities(null).oil).toBe(0.95);
  });
});

describe("rest window", () => {
  it("family's shortest rest to its longest", () => {
    const [min, max] = FAMILIES.fresh.sources.htmlTool.restDays!;
    const w = restWindow("fresh", "2026-11-13");
    expect([w.minDays, w.maxDays]).toEqual([min, max]);
    expect(w.readyFrom).toBe(addDays("2026-11-13", min));
    expect(w.fullyRested).toBe(addDays("2026-11-13", max));
  });
  it("every family stays within 90 days", () => {
    for (const k of Object.keys(FAMILIES)) {
      const w = restWindow(k, "2026-01-01");
      expect(w.maxDays).toBeLessThanOrEqual(MAX_REST_DAYS);
      expect(w.minDays).toBeLessThanOrEqual(w.maxDays);
    }
  });
  it("unknown family: 90 days for both", () => {
    expect(restWindow(undefined, "2026-11-13")).toEqual({ minDays: 90, maxDays: 90, readyFrom: "2027-02-11", fullyRested: "2027-02-11" });
  });
  it("caps a family range longer than 90 days", () => {
    const tool = FAMILIES.oriental.sources.htmlTool;
    const saved = tool.restDays;
    tool.restDays = [60, 120];
    try {
      expect(restWindow("oriental", "2026-01-01")).toMatchObject({ minDays: 60, maxDays: 90 });
    } finally {
      tool.restDays = saved;
    }
  });
  it("adds days across months and years, ignoring time", () => {
    expect(addDays("2026-12-25T18:00:00Z", 10)).toBe("2027-01-04");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });
});

describe("oil against stock", () => {
  it("one oil at two strengths adds up against one stock row", () => {
    const plan = planMixes([o("a", { stockKey: "s1" }), o("b", { strengthPct: 30, stockKey: "s1" })], { s1: 10 });
    expect(plan.oil).toHaveLength(1);
    const n = plan.oil[0];
    expect(n.needG).toBe(round(plan.groups[0].oilG + plan.groups[1].oilG));
    expect(n.haveG).toBe(10);
    expect(n.shortG).toBe(round(n.needG - 10));
  });
  it("enough stock: short is zero", () => {
    expect(planMixes([o("a", { stockKey: "s1" })], { s1: 500 }).oil[0].shortG).toBe(0);
  });
  it("no stock row, or no oil link, is unknown, never zero", () => {
    const oil = planMixes([o("a", { stockKey: "s1" }), o("b", { scentKey: "v:blend" })], { s1: null }).oil;
    expect(oil.map((n) => [n.key, n.haveG, n.shortG])).toEqual([["s:s1", null, null], ["k:v:blend", null, null]]);
  });
  it("works on no groups", () => {
    expect(oilNeeds([], {})).toEqual([]);
    expect(planMixes([]).oil).toEqual([]);
  });
});
