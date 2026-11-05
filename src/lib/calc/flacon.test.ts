import { describe, it, expect } from "vitest";
import {
  BENCH_MOTION, RESIZE_EASE, easeOutBack, rollFrame, restFrame, bottleScale, BOTTLE_SCALE,
  TIER_SHADES, ETHANOL_TINT, mixHex, oilShade, liquidShape, blendLayers, ghostDigits, CAVITY,
} from "./flacon";

describe("motion timings", () => {
  it("match the prototype", () => {
    expect(BENCH_MOTION).toMatchObject({ roll: 350, settle: 120, flow: 450, wobble: 650, resize: 480 });
    expect(RESIZE_EASE).toBe("cubic-bezier(.34,1.35,.64,1)");
  });
});

describe("easeOutBack", () => {
  it("starts at 0, ends at 1 and overshoots in between", () => {
    expect(easeOutBack(0)).toBeCloseTo(0, 10);
    expect(easeOutBack(1)).toBe(1);
    const peak = Math.max(...Array.from({ length: 99 }, (_, i) => easeOutBack((i + 1) / 100)));
    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThan(1.1);
    expect(easeOutBack(-1)).toBeCloseTo(0, 10);
    expect(easeOutBack(2)).toBe(1);
  });
  it("takes its strength", () => {
    expect(easeOutBack(0.5, 0)).toBeCloseTo(0.875, 10);
  });
});

describe("rollFrame", () => {
  const from = [10, 40, 0.2];
  const to = [20, 30, 0.3];
  it("starts where the display was", () => {
    const f = rollFrame(from, to, 0);
    expect(f.values[0]).toBeCloseTo(10, 10);
    expect(f.flow).toBe(1);
    expect(f.settled).toBe(false);
    expect(f.done).toBe(false);
  });
  it("overshoots the target on the way", () => {
    const peak = Math.max(...Array.from({ length: 35 }, (_, i) => rollFrame(from, to, i * 10).values[0]));
    expect(peak).toBeGreaterThan(20);
  });
  it("jitters the last decimal for about 120 ms, oil and ethanol against each other", () => {
    const a = rollFrame(from, to, 355);
    expect(a.values[0]).toBeCloseTo(20.01, 10);
    expect(a.values[1]).toBeCloseTo(29.99, 10);
    expect(a.values[2]).toBe(0.3);
    expect(rollFrame(from, to, 395).values[0]).toBeCloseTo(19.99, 10);
    expect(rollFrame(from, to, 435).values[0]).toBe(20);
    const b = rollFrame(from, to, 480);
    expect(b.values).toEqual(to);
    expect(b.settled).toBe(true);
  });
  it("thins the stream after 450 ms and rests at 650 ms", () => {
    expect(rollFrame(from, to, 449).flow).toBe(1);
    expect(rollFrame(from, to, 525).flow).toBeCloseTo(0.5, 10);
    expect(rollFrame(from, to, 620).flow).toBe(0);
    expect(rollFrame(from, to, 650)).toEqual(restFrame(to));
    expect(rollFrame(from, to, 5000).done).toBe(true);
  });
  it("wobbles and decays", () => {
    expect(Math.abs(rollFrame(from, to, 100).wobble)).toBeGreaterThan(0);
    expect(Math.abs(rollFrame(from, to, 640).wobble)).toBeLessThan(0.01);
  });
  it("never reads below zero, and copes with missing starts and jitter", () => {
    expect(rollFrame([5], [0], 360, [-1]).values[0]).toBe(0);
    expect(rollFrame([], [3], 100).values[0]).toBe(3);
    expect(rollFrame([1, 1], [2, 2], 360, []).values).toEqual([2, 2]);
    expect(rollFrame(from, to, -5).values[0]).toBeCloseTo(10, 10);
  });
});

describe("bottleScale", () => {
  it("is the cube root of volume over 100 mL, clamped", () => {
    expect(bottleScale(100)).toBe(1);
    expect(bottleScale(50)).toBeCloseTo(Math.cbrt(0.5), 10);
    expect(bottleScale(3)).toBe(BOTTLE_SCALE.min);
    expect(bottleScale(1000)).toBe(BOTTLE_SCALE.max);
    expect(bottleScale("x")).toBe(BOTTLE_SCALE.min);
    expect(bottleScale(-5)).toBe(BOTTLE_SCALE.min);
  });
});

describe("colours", () => {
  it("has five shades per theme", () => {
    expect(TIER_SHADES.light).toHaveLength(5);
    expect(TIER_SHADES.dark).toHaveLength(5);
    expect(ETHANOL_TINT.dark.top).toMatch(/^#/);
  });
  it("mixes hex colours", () => {
    expect(mixHex("#000000", "#FFFFFF", 0.5)).toBe("#808080");
    expect(mixHex("#102030", "#102030", 0.3)).toBe("#102030");
  });
  it("deepens the oil with the strength tier", () => {
    const edt = oilShade(15);
    const ex = oilShade(30);
    expect(edt.base).toBe(TIER_SHADES.light[0]);
    expect(ex.base).toBe(TIER_SHADES.light[3]);
    expect(oilShade(45).base).toBe(TIER_SHADES.light[3]);
    expect(oilShade(20, "dark").base).toBe(TIER_SHADES.dark[1]);
    expect(oilShade(20, "nope" as never).base).toBe(TIER_SHADES.light[1]);
    expect(edt.top).toBe(mixHex(edt.base, "#FFFFFF", 0.22));
    expect(edt.deep).toBe(mixHex(edt.base, "#000000", 0.25));
  });
});

describe("liquidShape", () => {
  it("fills the cavity by the oil share", () => {
    const half = liquidShape(0.5);
    expect(Number(half.surfaceY)).toBeCloseTo(CAVITY.top + CAVITY.height / 2, 2);
    expect(half.oilPath).toContain(`V${CAVITY.bottom}`);
    expect(half.surfacePath).not.toBe("");
    expect(half.streamPath).toBe("M60 24 L60 24 Z");
    expect(half.rippleOpacity).toBe("0.00");
  });
  it("draws nothing for an empty bottle", () => {
    const e = liquidShape(0);
    expect(e.surfacePath).toBe("");
    expect(e.oilPath).toBe("M20 143 H100 V143 H20 Z");
    expect(liquidShape(Number.NaN).surfacePath).toBe("");
    expect(Number(liquidShape(2).surfaceY)).toBe(CAVITY.top);
  });
  it("pours: a tapered stream, a ripple and a tilted surface", () => {
    const p = liquidShape(0.3, 0.5, 1);
    expect(p.streamPath).toMatch(/^M58\.60 24 L61\.40 24/);
    expect(p.rippleOpacity).toBe("0.55");
    expect(p.surfacePath).not.toBe(liquidShape(0.3).surfacePath);
    expect(liquidShape(0.3, -0.5, 1).surfacePath).not.toBe(p.surfacePath);
  });
});

describe("blendLayers", () => {
  it("stacks each material's volume share from the base", () => {
    const L = blendLayers([{ type: "eo", pct: 50 }, { type: "fixative", pct: 50 }], 0.5);
    expect(L.map((l) => l.type)).toEqual(["eo", "fixative"]);
    expect(Number(L[0].y) + Number(L[0].h)).toBeCloseTo(CAVITY.bottom, 2);
    // Lighter oil takes more room than the same weight of fixative.
    expect(Number(L[0].h)).toBeGreaterThan(Number(L[1].h));
  });
  it("skips empty rows, unknown types read as essential oil, nothing for no blend", () => {
    expect(blendLayers([{ type: "mystery", pct: 10 }, { type: "eo", pct: 0 }], 0.4).map((l) => l.type)).toEqual(["eo"]);
    expect(blendLayers([{ type: "eo", pct: 10 }], 0.01)).toEqual([]);
    expect(blendLayers(null, 0.5)).toEqual([]);
    expect(blendLayers([{ type: "eo", pct: "" }], 0.5)).toEqual([]);
    expect(blendLayers([{ type: "eo", pct: 1 }], Number.NaN)).toEqual([]);
  });
});

it("ghost digits are all eights", () => {
  expect(ghostDigits("12.05")).toBe("88.88");
});
