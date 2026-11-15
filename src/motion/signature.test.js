import { describe, expect, it } from "vitest";
import { BEATS, SIGNATURE_MS, filePath, toKeyframes } from "./signature.js";
import { TOKENS } from "./config.js";

const box = (left, top, width = 40, height = 40) => ({ left, top, width, height, right: left + width, bottom: top + height });

describe("the product signature (motion M4): a logged batch is filed into the Journal", () => {
  it("takes under a second, built from the tokens (the slow step and two fast ones)", () => {
    expect(SIGNATURE_MS).toBe(TOKENS.duration.slow + 2 * TOKENS.duration.fast);
    expect(SIGNATURE_MS).toBeLessThan(1000);
  });
  it("caps, labels, travels and is taken, in that order, ending in the tab", () => {
    const path = filePath(box(100, 300), box(300, 700));
    const span = BEATS.travel - BEATS.label;
    expect(path.map((k) => k.offset)).toEqual([0, BEATS.cap / 2, BEATS.cap, BEATS.label,
      BEATS.label + span * 0.25, BEATS.label + span * 0.5, BEATS.label + span * 0.75, BEATS.travel, 1]);
    for (let i = 1; i < path.length; i++) expect(path[i].offset).toBeGreaterThan(path[i - 1].offset);
    // It stays in place until the label is written, then lands on the tab's centre (200, 400 away).
    expect(path.slice(0, 4).every((k) => Math.abs(k.x) < 1 && Math.abs(k.y) <= 2)).toBe(true);
    expect(path[7]).toMatchObject({ x: 200, y: 400, scale: 0.35, opacity: 1 });
    expect(path[8].opacity).toBe(0);
    // Smaller at every step of the travel.
    for (let i = 4; i < 8; i++) expect(path[i].scale).toBeLessThan(path[i - 1].scale);
  });
  it("lifts on an arc above the straight line, at least 24 px", () => {
    const mid = filePath(box(0, 500), box(0, 520))[5];
    expect(mid.y).toBe(10 - 24); // halfway down 20 px, 24 px above the line
    const far = filePath(box(0, 0), box(500, 0))[5];
    expect(far.y).toBe(-100); // a fifth of the distance
    expect(filePath(box(0, 0), box(500, 0), { lift: 10 })[5].y).toBe(-10);
    expect(filePath(box(0, 0), box(500, 0))[4].y).toBe(-75); // a curve, not two straight lines
  });
  it("goes left as readily as right (the Arabic bar puts the Journal on the other side)", () => {
    const ltr = filePath(box(300, 300), box(500, 700));
    const rtl = filePath(box(300, 300), box(100, 700));
    expect(rtl[7].x).toBe(-ltr[7].x);
    expect(rtl[7].y).toBe(ltr[7].y);
  });
  it("animates transform and opacity only", () => {
    for (const k of toKeyframes(filePath(box(0, 0), box(100, 100)))) {
      expect(Object.keys(k).sort()).toEqual(["offset", "opacity", "transform"]);
      expect(k.transform).toMatch(/^translate\(-?[\d.]+px, -?[\d.]+px\) scale\([\d.]+\)$/);
    }
  });
});
