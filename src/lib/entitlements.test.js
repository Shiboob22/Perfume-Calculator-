import { describe, it, expect } from "vitest";
import plans from "../site/plans.json";
import { FEATURES, can, batchesLeft, canLogBatch, fromPlanRow, FALLBACK } from "./entitlements";

const free = fromPlanRow({ id: "free", name: "Free", features: ["cards.download"], batch_cap: 25 });
const pro = fromPlanRow({ id: "pro", name: "Pro", features: ["batches.unlimited", "ai.ask", "inventory"], batch_cap: null });

describe("can", () => {
  it("allows only listed features", () => {
    expect(can(free, "cards.download")).toBe(true);
    expect(can(free, "ai.ask")).toBe(false);
    expect(can(pro, "ai.ask")).toBe(true);
  });
  it("denies everything for missing entitlements", () => {
    expect(can(undefined, "ai.ask")).toBe(false);
    expect(can(FALLBACK, "ai.ask")).toBe(false);
    expect(can(FALLBACK, "export.labels")).toBe(false);
  });
  it("falls back to the Free plan the site and the database list", () => {
    const freeRow = plans.find((p) => p.id === "free");
    expect([...FALLBACK.features].sort()).toEqual([...freeRow.features].sort());
    expect(FALLBACK.batchCap).toBe(freeRow.batch_cap);
  });
  it("lists only known features on every plan", () => {
    for (const p of plans) for (const f of p.features) expect(FEATURES, f).toContain(f);
  });
});

describe("batch cap", () => {
  it("counts down to the cap and stops there", () => {
    expect(batchesLeft(free, 0)).toBe(25);
    expect(batchesLeft(free, 24)).toBe(1);
    expect(canLogBatch(free, 24)).toBe(true);
    expect(canLogBatch(free, 25)).toBe(false);
    expect(batchesLeft(free, 30)).toBe(0);
  });
  it("is unlimited with batches.unlimited or no cap", () => {
    expect(batchesLeft(pro, 10_000)).toBe(Infinity);
    expect(canLogBatch({ features: [], batchCap: null }, 999)).toBe(true);
  });
  it("falls back to Free when no plan row loads", () => {
    expect(fromPlanRow(null)).toBe(FALLBACK);
    expect(canLogBatch(fromPlanRow(null), 25)).toBe(false);
  });
});
