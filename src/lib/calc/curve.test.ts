import { describe, it, expect } from "vitest";
import { buildCurve, peakOf, MIN_CURVE_NOTES, CURVE_DAYS, oilKey, oilOverlay, bestOf } from "./curve";
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

describe("your batches of one oil", () => {
  const b = (id: string, no: number, oil: string, pct: number, checkins: any[]) => ({ id, no, oil, pct, checkins });
  const A = [n("a1", 0, 2), n("a2", 14, 4), n("a3", 30, 5)];
  const B = [n("b1", 0, 3), n("b2", 14, 5), n("b3", 30, 4)];

  it("keys an oil by catalog id, else by trimmed lowercase name", () => {
    expect(oilKey({ fragrance_id: "f1", fragrance_name: "X" })).toBe("id:f1");
    expect(oilKey({ fragrance_name: "  Oud Nights " })).toBe(oilKey({ fragrance_name: "oud nights" }));
    expect(oilKey({ fragrance_id: "f1" })).not.toBe(oilKey({ fragrance_name: "f1" }));
  });
  it("overlays the batches of the same oil that have ratings, on one axis", () => {
    const all = [b("1", 31, "o", 25, A), b("2", 40, "o", 20, B), b("3", 41, "other", 25, A), b("4", 42, "o", 30, [])];
    const o = oilOverlay(all, "2", box)!;
    expect(o.map((x) => x.batch.no)).toEqual([31, 40]);
    expect(o[0].curve.span).toBe(o[1].curve.span);
  });
  it("shares a longer axis when one batch ran past the full rest", () => {
    const long = [n("l1", 0, 2), n("l2", 120, 4)];
    const o = oilOverlay([b("1", 1, "o", 25, A), b("2", 2, "o", 20, long)], "1", box)!;
    expect(o.map((x) => x.curve.span)).toEqual([120, 120]);
    expect(o[0].curve.points[2].x).toBeLessThan(150);
  });
  it("is null with one batch of the oil, or when the shown batch has no ratings", () => {
    expect(oilOverlay([b("1", 1, "o", 25, A), b("2", 2, "p", 25, A)], "1", box)).toBeNull();
    expect(oilOverlay([b("1", 1, "o", 25, A), b("2", 2, "o", 25, [])], "1", box)).toBeNull();
    expect(oilOverlay([b("1", 1, "o", 25, A), b("2", 2, "o", 25, B)], "1", box)).not.toBeNull();
    expect(oilOverlay([b("1", 1, "o", 25, [n("x", 0, null)]), b("2", 2, "o", 25, B)], "1", box)).toBeNull();
    expect(oilOverlay([], "x", box)).toBeNull();
  });
  it("the best batch has the highest peak, the earliest day, then the newer number", () => {
    const o = oilOverlay([b("1", 1, "o", 25, A), b("2", 2, "o", 20, B)], "1", box)!;
    expect(bestOf(o)?.batch.id).toBe("2"); // both peak at 5; B on day 14, A on day 30: B is earlier
  });
});
