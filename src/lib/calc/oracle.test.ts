import { describe, it, expect } from "vitest";
import { calculate, solveBottle, solveFromOil, solveRun, adjustConcentration, adjustBottle, fmt2 } from "./index";

// Independent oracle: every expected value below is plain arithmetic written
// out here, never read back from the module under test.
const near = (a: number, b: number, eps = 1e-9) => expect(Math.abs(a - b)).toBeLessThan(eps);

// Small seeded PRNG so "random" cases are reproducible.
function rng(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

const base = { unit: "ml" as const, oilDensity: 0.95, ethanolDensity: 0.81 };

describe("screenshot regression: 200 mL @ 25%, oil 1.00, ethanol 0.81", () => {
  const r = calculate({ amount: 200, unit: "ml", concPct: 25, oilDensity: 1, ethanolDensity: 0.81 });
  it("components", () => {
    expect(r.shown).toMatchObject({ oilMl: 50, ethanolMl: 150, totalMl: 200, oilG: 50, ethanolG: 121.5, totalG: 171.5 });
  });
  it("weight share is 50/171.5 = 29.15%, distinct from the 25% by volume", () => {
    expect(fmt2((50 / 171.5) * 100)).toBe("29.15");
    expect(r.basis).toBe("volume");
    near(r.otherBasisPct, (50 / 171.5) * 100);
  });
});

describe("several bottles: 3 × 50 mL @ 25% (0.95 / 0.81)", () => {
  const r = solveRun([{ sizeMl: 50, count: 3 }], 25, { oil: 0.95, ethanol: 0.81 });
  it("matches hand arithmetic", () => {
    near(r.exact.oilMl, 37.5);
    near(r.exact.ethanolMl, 112.5);
    near(r.exact.oilG, 35.625);
    near(r.exact.ethanolG, 91.125);
    near(r.exact.totalG, 126.75);
    // 35.625 / 126.75 = 0.281065… → 28.11% (the audit brief's "≈28.10%" was a rounding slip)
    expect(fmt2((35.625 / 126.75) * 100)).toBe("28.11");
  });
  it("mixed sizes and overfill scale the nominal volume", () => {
    const m = solveRun([{ sizeMl: 50, count: 2 }, { sizeMl: 10, count: 3 }], 20, { oil: 0.95, ethanol: 0.81 }, 10);
    near(m.bottlesMl, 130);
    near(m.exact.totalMl, 143);
    near(m.exact.oilMl, 143 * 0.2);
  });
});

describe("unit conversion", () => {
  it("fl oz is a volume and oz a weight (app uses 4-decimal constants: ≤1e-6 relative to exact)", () => {
    near(solveBottle(1, "floz", 25, { oil: 0.95, ethanol: 0.81 }).exact.totalMl, 29.5735295625, 1e-4);
    near(solveBottle(1, "oz", 25, { oil: 0.95, ethanol: 0.81 }).exact.totalG, 28.349523125, 1e-4);
  });
  it("g/oz batches are by weight: oil is exactly C of the grams", () => {
    const s = solveBottle(100, "g", 25, { oil: 0.95, ethanol: 0.81 });
    expect(s.basis).toBe("weight");
    near(s.exact.oilG, 25);
    near(s.exact.ethanolG, 75);
  });
});

describe("oil on hand", () => {
  it("20 g oil @ 25%: volume 20/0.95 = 21.05 mL oil → 84.21 mL batch", () => {
    const r = solveFromOil(20, 25, "volume", { oil: 0.95, ethanol: 0.81 });
    near(r.exact.oilMl, 20 / 0.95);
    near(r.exact.totalMl, 4 * (20 / 0.95));
    near(r.exact.ethanolMl, 3 * (20 / 0.95));
  });
  it("counts whole bottles without float drift", () => {
    // 25 mL oil @ 25% = exactly 100 mL = 2 × 50 mL
    const r = solveFromOil(25 * 0.95, 25, "volume", { oil: 0.95, ethanol: 0.81 }, 50);
    expect(r.bottles).toBe(2);
  });
});

describe("changing concentration only ever adds", () => {
  const d = { oil: 0.95, ethanol: 0.81 };
  const cur = solveBottle(100, "ml", 25, d).exact;
  it("25 → 20 by volume adds alcohol: 25/0.20 − 100 = 25 mL", () => {
    const a = adjustConcentration(cur, 20, "volume", d);
    expect(a.add.material).toBe("ethanol");
    near(a.add.ml, 25);
  });
  it("25 → 30 adds oil: (0.30·100 − 25)/0.70 = 7.142857 mL", () => {
    const a = adjustConcentration(cur, 30, "volume", d);
    expect(a.add.material).toBe("oil");
    near(a.add.ml, 5 / 0.7);
  });
  it("capacity or oil on hand stops it and reports the closest reachable", () => {
    const a = adjustConcentration(cur, 30, "volume", d, { oilAvailableG: 1 });
    expect(a.reachable).toBe(false);
    expect(a.limit).toBe("oil");
  });
});

describe("invalid input never shows a successful result", () => {
  it.each([-50, 0, NaN, Infinity, "abc", ""])("amount %s → zero quantities and a warning", (amount) => {
    const r = calculate({ ...base, amount: amount as number, concPct: 25 });
    expect(r.exact.oilG).toBeGreaterThanOrEqual(0);
    expect(r.exact.totalMl).toBe(0);
    expect(r.warnings.map((w) => w.code)).toContain("amount_not_positive");
  });
  it("blank density is reported, not silently substituted", () => {
    const r = calculate({ ...base, oilDensity: 0, amount: 50, concPct: 25 });
    expect(r.warnings.map((w) => w.code)).toContain("oil_density_missing");
    const e = calculate({ ...base, ethanolDensity: NaN, amount: 50, concPct: 25 });
    expect(e.warnings.map((w) => w.code)).toContain("ethanol_density_missing");
  });
  it("concentration out of 0–100 is flagged", () => {
    expect(calculate({ ...base, amount: 50, concPct: 150 }).warnings.map((w) => w.code)).toContain("concentration_out_of_bounds");
  });
});

describe("properties (seeded random)", () => {
  const rand = rng(42);
  const cases = Array.from({ length: 300 }, () => ({
    v: 1 + rand() * 999,
    pct: 1 + rand() * 98,
    oil: 0.85 + rand() * 0.2,
    eth: 0.78 + rand() * 0.05,
  }));
  it("volumes reconcile, masses reconcile, weight share in (0,1), nothing negative", () => {
    for (const c of cases) {
      const d = { oil: c.oil, ethanol: c.eth };
      const s = solveBottle(c.v, "ml", c.pct, d).exact;
      near(s.oilMl + s.ethanolMl, c.v, 1e-9 * c.v);
      near(s.oilG + s.ethanolG, s.totalG, 1e-9 * s.totalG);
      near(s.oilMl / s.totalMl, c.pct / 100);
      const w = s.oilG / s.totalG;
      expect(w).toBeGreaterThan(0);
      expect(w).toBeLessThan(1);
      expect(Math.min(s.oilG, s.ethanolG, s.oilMl, s.ethanolMl)).toBeGreaterThanOrEqual(0);
    }
  });
  it("scaling the batch preserves concentration; weight share ≠ volume share unless densities are equal", () => {
    for (const c of cases) {
      const d = { oil: c.oil, ethanol: c.eth };
      const a = solveBottle(c.v, "ml", c.pct, d).exact;
      const b = solveBottle(c.v * 3, "ml", c.pct, d).exact;
      near(a.oilG / a.totalG, b.oilG / b.totalG);
      near(b.oilG, 3 * a.oilG, 1e-9 * b.oilG);
    }
  });
  it("oil-on-hand round trip: the batch it names contains exactly that oil", () => {
    for (const c of cases) {
      const d = { oil: c.oil, ethanol: c.eth };
      const oilG = c.v / 10;
      for (const basis of ["volume", "weight"] as const) {
        const r = solveFromOil(oilG, c.pct, basis, d);
        near(r.exact.oilG, oilG, 1e-9 * oilG);
      }
    }
  });
  it("adding oil to a fixed alcohol raises the oil fraction", () => {
    for (const c of cases) {
      const d = { oil: c.oil, ethanol: c.eth };
      const lo = solveBottle(c.v, "ml", c.pct, d).exact;
      const hi = solveBottle(c.v, "ml", Math.min(c.pct + 1, 99.5), d).exact;
      expect(hi.oilG / hi.totalG).toBeGreaterThan(lo.oilG / lo.totalG);
    }
  });
});

describe("rounding boundaries", () => {
  it("half cents round away from zero on the decimal the user means", () => {
    expect(fmt2(4.275)).toBe("4.28");
    expect(fmt2(0.005)).toBe("0.01");
    expect(fmt2(0.004999)).toBe("0.00");
    expect(fmt2(-0.001)).toBe("0.00");
  });
  it("displayed total is the sum of the two displayed pours", () => {
    const rand = rng(7);
    for (let i = 0; i < 200; i++) {
      const s = solveBottle(5 + rand() * 300, "ml", 5 + rand() * 40, { oil: 0.95, ethanol: 0.81 }).shown;
      near(s.totalG, Math.round((s.oilG + s.ethanolG) * 100) / 100, 1e-9);
    }
  });
});

describe("by-weight strengths in Adjust and Run (0.95 / 0.81)", () => {
  const d = { oil: 0.95, ethanol: 0.81 };
  // A 100 mL bottle that is 25% by WEIGHT: 25 g oil to 75 g alcohol takes
  // 25/0.95 + 75/0.81 mL, so the bottle holds this fraction of that batch.
  const k = 100 / (25 / 0.95 + 75 / 0.81);
  const oilG = 25 * k;
  const totalG = 100 * k;

  it("25% → 20% by weight adds oil/0.20 − total grams of alcohol", () => {
    const a = adjustBottle(100, 25, 20, "weight", d);
    expect(a.add.material).toBe("ethanol");
    near(a.add.grams, oilG / 0.2 - totalG);
    near(a.add.ml, (oilG / 0.2 - totalG) / 0.81);
    near(a.from, 25, 1e-9);
  });
  it("the result really is 20% by weight, and not 20% by volume", () => {
    const a = adjustBottle(100, 25, 20, "weight", d);
    near((a.result.oilG / a.result.totalG) * 100, 20, 1e-9);
    const byVol = adjustBottle(100, 25, 20, "volume", d);
    expect(Math.abs(byVol.add.grams - a.add.grams)).toBeGreaterThan(0.5); // treating weight as volume under-adds ~0.77 g here
  });
  it("by volume is unchanged by the new argument", () => {
    const a = adjustBottle(100, 25, 20, "volume", d);
    near(a.add.ml, 25);
  });

  it("a run at 25% by weight pours 25% oil by mass", () => {
    const r = solveRun([{ sizeMl: 50, count: 3 }], 25, d, 0, "weight");
    expect(r.basis).toBe("weight");
    near(r.exact.oilG / r.exact.totalG, 0.25, 1e-9);
    near(r.exact.totalMl, 150, 1e-9);
    // 150 mL mix: scale the 25 g : 75 g batch to 150 mL
    near(r.exact.oilG, 25 * (150 / (25 / 0.95 + 75 / 0.81)), 1e-9);
  });
  it("a run by volume is unchanged by the new argument", () => {
    const r = solveRun([{ sizeMl: 50, count: 3 }], 25, d);
    near(r.exact.oilMl / r.exact.totalMl, 0.25, 1e-9);
  });
});
