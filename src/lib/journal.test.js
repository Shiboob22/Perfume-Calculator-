import { describe, it, expect } from "vitest";
import { dueNow, todayFor, restingBatch, suggestedRestDays, shareOf } from "./journal";

const made = new Date(2026, 8, 1, 10, 0);
const batch = (extra = {}) => ({ id: "b1", tier: "woody", created_at: made.toISOString(), blend_date: "2026-09-01", ...extra });
const day = (n) => new Date(made.getTime() + n * 86400000 + 3600000);

describe("journal (app glue)", () => {
  it("reads the family's rest range and the batch's start", () => {
    expect(restingBatch(batch())).toEqual({ id: "b1", startedAt: made, rest: [21, 28] });
    expect(restingBatch(batch({ tier: "unknown" })).rest).toBeNull();
  });
  it("lists due check-ins with their batch, minus the answered ones", () => {
    expect(dueNow([batch()], day(22))).toEqual([{ batchId: "b1", scheduledDay: 21, day: 22, batch: batch() }]);
    const answered = batch({ batch_checkins: [{ id: "c", day: 21, scheduled_day: 21, rating: 4 }] });
    expect(dueNow([answered], day(22))).toEqual([]);
  });
  it("today's rest day, 0 without a start", () => {
    expect(todayFor(batch(), day(5))).toBe(5);
    expect(todayFor({ id: "x" }, day(5))).toBe(0);
  });
});

describe("sharing helpers", () => {
  it("suggests the peak day, else the latest check-in, else the family's rest end", () => {
    const rated = batch({ batch_checkins: [{ id: "a", day: 1, rating: 2 }, { id: "b", day: 24, rating: 5 }, { id: "c", day: 30, rating: 4 }] });
    expect(suggestedRestDays(rated)).toBe(24);
    expect(suggestedRestDays(batch({ batch_checkins: [{ id: "a", day: 9, note: "x" }, { id: "s", day: 21, skipped: true }] }))).toBe(9);
    expect(suggestedRestDays(batch())).toBe(28);
    expect(suggestedRestDays(batch({ tier: "unknown" }))).toBeNull();
  });
  it("reads the share state as an object or a one-item list", () => {
    expect(shareOf(batch())).toBeNull();
    expect(shareOf(batch({ shared_recipes: { slug: "x" } }))).toEqual({ slug: "x" });
    expect(shareOf(batch({ shared_recipes: [{ slug: "y" }] }))).toEqual({ slug: "y" });
    expect(shareOf(batch({ shared_recipes: [] }))).toBeNull();
  });
});
