import { describe, it, expect } from "vitest";
import {
  benchFigures, benchHref, benchTarget, BENCH_EMPTY, BENCH_FLACON_BOX, BENCH_INTRO_PACE, BENCH_JITTER,
  BENCH_SEEN_AT, BENCH_SIZES, BENCH_STRENGTHS,
} from "./benchFigures";
import { bottleScale, easeOutBack } from "../lib/calc";

describe("live bench", () => {
  it("gives the handbook's Quick Reference for every size and named strength", () => {
    for (const size of BENCH_SIZES) {
      for (const { pct } of BENCH_STRENGTHS) {
        const f = benchFigures(size, pct);
        expect(f.oil).toBeCloseTo(size * (pct / 100) * 0.95, 6);
        expect(f.alcohol).toBeCloseTo(size * (1 - pct / 100) * 0.81, 6);
        expect(f.total).toBeCloseTo(f.oil + f.alcohol, 6);
      }
    }
    const f = benchFigures(100, 25);
    expect([f.oil, f.alcohol, f.total].map((g) => g.toFixed(2))).toEqual(["23.75", "60.75", "84.50"]);
  });
  it("opens the calculator at the same bottle", () => {
    expect(benchHref(50, 30)).toBe("/bench?size=50&unit=ml&conc=30&ref=home");
  });
});

describe("the bench card's motion (section I)", () => {
  it("rolls oil, alcohol and total, and fills the bottle by volume", () => {
    const f = benchFigures(100, 25);
    expect(f.volShare).toBeCloseTo(0.25, 9);
    expect(benchTarget(f)).toEqual([f.oil, f.alcohol, f.total, f.volShare]);
    expect(BENCH_EMPTY).toEqual([0, 0, 0, 0]);
    expect(BENCH_JITTER).toHaveLength(4);
    expect(BENCH_JITTER[3]).toBe(0); // the bottle's fill never hunts
  });
  it("keeps the largest bottle inside the card's fixed flacon box", () => {
    const k = bottleScale(Math.max(...BENCH_SIZES));
    expect(104 * k).toBeLessThanOrEqual(BENCH_FLACON_BOX[0]);
    expect(134 * k).toBeLessThanOrEqual(BENCH_FLACON_BOX[1]);
  });
  it("never needs a third whole-gram digit, even at the top of the overshoot", () => {
    // The card gives the tens digit a fixed cell (no layout shift), which
    // holds while every figure stays under 100 g as it rolls.
    let peak = 0;
    for (let x = 0; x <= 1; x += 0.001) peak = Math.max(peak, easeOutBack(x));
    for (const size of BENCH_SIZES) for (const { pct } of BENCH_STRENGTHS) {
      const f = benchFigures(size, pct);
      expect(Math.max(f.oil, f.alcohol, f.total) * peak).toBeLessThan(99.99);
    }
  });
  it("pours the first time at half speed, and counts as seen once a third is in view", () => {
    expect(BENCH_INTRO_PACE).toBe(2);
    expect(BENCH_SEEN_AT).toBeGreaterThan(0);
    expect(BENCH_SEEN_AT).toBeLessThan(0.5);
  });
});
