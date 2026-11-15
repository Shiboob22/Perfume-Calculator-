import { describe, it, expect } from "vitest";
import { buildCurve, peakOf, MIN_CURVE_NOTES, CURVE_DAYS } from "./curve";
import { peakDay } from "./journal";

const box = { width: 300, height: 120, pad: { top: 10, right: 10, bottom: 20, left: 10 } };
const n = (id: string, day: number, rating: number | null, extra: Record<string, unknown> = {}) => ({ id, day, rating, note: "x", ...extra });

describe("maturation curve", () => {
  it("places points by day and rating inside the padding", () => {
    const c = buildCurve([n("a", 0, 5), n("b", 45, 1), n("c", 90, 3)], box);
    expect(c.points.map((p) => [p.x, p.y])).toEqual([[10, 10], [150, 100], [290, 55]]);
    expect(c.path).toBe("M 10 10 L 150 100 L 290 55");
    expect(c.enough).toBe(true);
    expect(c.span).toBe(CURVE_DAYS);
  });
  it("draws from three rated notes, a plain line before that", () => {
    expect(MIN_CURVE_NOTES).toBe(3);
    const two = buildCurve([n("a", 0, 2), n("b", 7, 3)], box);
    expect(two.enough).toBe(false);
    expect(two.path).not.toBe("");
    const one = buildCurve([n("a", 0, 2)], box);
    expect([one.enough, one.path]).toEqual([false, ""]);
    expect(buildCurve(null, box).points).toEqual([]);
  });
  it("leaves out skips and unrated notes, keeps the latest note of a day", () => {
    const c = buildCurve([
      n("s", 7, 4, { skipped: true }), n("u", 14, null),
      n("old", 30, 2, { created_at: "2026-01-01" }), n("new", 30, 4, { created_at: "2026-01-02" }),
    ], box);
    expect(c.points.map((p) => [p.id, p.rating])).toEqual([["new", 4]]);
  });
  it("stretches the axis for a note past the full rest and keeps tags and the milestone", () => {
    const c = buildCurve([n("a", 180, 4, { tags: ["rounder"] })], box);
    expect(c.span).toBe(180);
    expect(c.points[0]).toMatchObject({ x: 290, k: "m3", tags: ["rounder"] });
    expect(c.ticks.map((t) => t.k)).toEqual(["d1", "w1", "w2", "m1", "m3"]);
  });
  it("the peak is the earliest day to reach the best rating, as the pattern rule has it", () => {
    const notes = [n("a", 1, 2), n("b", 14, 4), n("c", 30, 5), n("d", 60, 5)];
    const c = buildCurve(notes, box);
    expect(c.peak).toEqual({ day: 30, rating: 5, k: "m1", id: "c" });
    expect(c.peak?.day).toBe(peakDay(notes.map((x) => ({ ...x, batch_id: "b" })) as any));
    expect(peakOf(c.points.slice(0, 1))).toBeNull();
  });
  it("clamps ratings and days to the box", () => {
    const c = buildCurve([n("a", 3, 5)], { width: 100, height: 50 });
    expect(c.points[0].y).toBe(12);
  });
});
