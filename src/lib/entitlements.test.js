import { describe, it, expect } from "vitest";
import { can, batchesLeft, canLogBatch, fromPlanRow, FALLBACK } from "./entitlements";

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
    expect(can(FALLBACK, "cards.download")).toBe(false);
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
