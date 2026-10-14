import { describe, it, expect } from "vitest";
import { ribbonY, ribbonAlpha, RIBBONS } from "./smoke.js";

describe("smoke field geometry", () => {
  it("keeps every ribbon inside the field, at any time", () => {
    for (let i = 0; i < RIBBONS; i++) {
      for (const t of [0, 1.7, 60, 3600]) {
        for (let x = 0; x <= 1; x += 0.1) {
          const y = ribbonY(i, x, t);
          expect(y).toBeGreaterThan(0);
          expect(y).toBeLessThan(1);
        }
      }
    }
  });

  it("is deterministic", () => {
    expect(ribbonY(2, 0.4, 12.5)).toBe(ribbonY(2, 0.4, 12.5));
  });

  it("bends toward the pointer, most near it and not far away", () => {
    const rest = ribbonY(2, 0.5, 5);
    const bent = ribbonY(2, 0.5, 5, { px: 0.5, py: 0.9 });
    expect(Math.abs(bent - 0.9)).toBeLessThan(Math.abs(rest - 0.9));
    const far = ribbonY(2, 0.05, 5, { px: 0.95, py: 0.9 });
    expect(far).toBeCloseTo(ribbonY(2, 0.05, 5), 3);
  });

  it("lifts with scroll", () => {
    expect(ribbonY(1, 0.3, 2, { scroll: 1 })).toBeLessThan(ribbonY(1, 0.3, 2, { scroll: 0 }));
  });

  it("keeps opacity faint", () => {
    for (let i = 0; i < RIBBONS; i++) {
      expect(ribbonAlpha(i)).toBeGreaterThan(0);
      expect(ribbonAlpha(i)).toBeLessThanOrEqual(0.32);
    }
  });
});
