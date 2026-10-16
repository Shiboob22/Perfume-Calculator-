import { describe, expect, it } from "vitest";
import { END, easeInOut, easeOut, heroFrame, heroLayout } from "./timeline.js";
import { PLATES, PLATES_TOTAL } from "../../content/hero.js";

describe("the Compounding timeline", () => {
  it("sixteen plates weigh 100.00 g", () => {
    expect(PLATES).toHaveLength(16);
    expect(PLATES_TOTAL).toBeCloseTo(100, 10);
  });
  it("opens on an empty bench: no plate, 00 / 16, 0.00 g", () => {
    const f = heroFrame(0);
    expect(f.arrived).toBe(0);
    expect(f.grams).toBe(0);
    expect(f.plates.every((p) => p.opacity === 0)).toBe(true);
    expect(f.rooms.every((r) => r.opacity === 0)).toBe(true);
  });
  it("a plate arrives every 240 ms from 0.4 s", () => {
    expect(heroFrame(0.4 + 0.3).arrived).toBe(1);
    expect(heroFrame(0.4 + 0.24 * 3 + 0.3).arrived).toBe(4);
    expect(heroFrame(0.4 + 0.24 * 3 + 0.3).grams).toBe(14 + 10 + 8 + 3);
  });
  it("the formula is complete at 4.4 s: 16 / 16, 100.00 g", () => {
    const f = heroFrame(4.4);
    expect(f.arrived).toBe(16);
    expect(f.grams).toBe(100);
    expect(f.plates.every((p) => p.opacity > 0.85)).toBe(true);
    expect(heroFrame(4.59).plates.every((p) => p.opacity > 0.99)).toBe(true);
  });
  it("blends to amber, then a 30 px ember, then settles", () => {
    expect(heroFrame(6.2).disc).toBeGreaterThan(200);
    expect(heroFrame(7.4).disc).toBeCloseTo(30, 5);
    expect(heroFrame(END).rooms.every((r) => r.opacity > 0.99)).toBe(true);
    expect(heroFrame(END).headOpacity).toBe(1);
  });
  it("the ground goes from afternoon to dusk", () => {
    expect(heroFrame(0).bg).toBe("rgb(58,43,30)");
    expect(heroFrame(END).bg).toBe("rgb(21,18,15)");
  });
  it("reduced motion draws no smoke and no breath", () => {
    const f = heroFrame(8.5, { reduced: true });
    expect(f.smoke.every((s) => s.opacity === 0)).toBe(true);
    expect(f.disc).toBeCloseTo(30, 5);
  });
  it("uses the board's grids: 8 columns wide, 4 on a phone", () => {
    expect(heroLayout(1440)).toMatchObject({ cols: 8, h: 860, mobile: false });
    expect(heroLayout(375)).toMatchObject({ cols: 4, h: 760, mobile: true });
  });
  it("easing is monotonic from 0 to 1", () => {
    for (const f of [easeOut, easeInOut]) {
      expect(f(0)).toBe(0);
      expect(f(1)).toBe(1);
      expect(f(0.3)).toBeLessThan(f(0.6));
    }
  });
});
