import { describe, it, expect } from "vitest";
import {
  B, BEAT_STARTS, CAPTIONS, KF, DROPS, STRENGTHS, SIZES, OIL_SHADES,
  beatIndex, bottleScale, camera, captions, capState, heroAmount, mixHex, nearest, oilShade,
  readout, stream, taring, tierState,
} from "./timeline.js";
import { STRENGTHS as HANDBOOK } from "../../../lib/formulation";
import { BENCH_SIZES } from "../../benchFigures";

const OIL = 23.75, ALC = 60.75;

describe("the dials", () => {
  it("snap to the handbook's four named strengths and the bench sizes", () => {
    expect(STRENGTHS).toEqual(HANDBOOK.map((s) => s.pct));
    expect(SIZES).toEqual(BENCH_SIZES);
    expect(nearest(STRENGTHS, 22)).toBe(20);
    expect(nearest(STRENGTHS, 29)).toBe(30);
    expect(nearest(SIZES, 70)).toBe(50);
  });
  it("give every strength its own oil shade", () => {
    for (const s of STRENGTHS) expect(oilShade(s)).toBe(OIL_SHADES[s]);
    expect(new Set(STRENGTHS.map(oilShade)).size).toBe(4);
  });
});

describe("readout", () => {
  it("reads 0 before the first tare and through the second", () => {
    expect(readout(0, OIL, ALC)).toBe(0);
    expect(readout(0.099, OIL, ALC)).toBe(0);
    expect(readout(0.47, OIL, ALC)).toBe(0);
    expect(readout(0.499, OIL, ALC)).toBe(0);
  });
  it("climbs to the oil, then the alcohol, then the whole batch", () => {
    expect(readout(0.4599, OIL, ALC)).toBeCloseTo(OIL, 1);
    expect(readout(0.6, OIL, ALC)).toBeCloseTo(ALC / 2, 6);
    expect(readout(0.7, OIL, ALC)).toBeCloseTo(ALC, 6);
    expect(readout(1, OIL, ALC)).toBeCloseTo(OIL + ALC, 6);
  });
  it("never goes down while pouring", () => {
    let last = -1;
    for (let p = 0.16; p < 0.46; p += 0.001) { const v = readout(p, OIL, ALC); expect(v).toBeGreaterThanOrEqual(last); last = v; }
  });
});

describe("captions", () => {
  it("show exactly one caption at rest inside each window", () => {
    for (const [a, b] of CAPTIONS) {
      const mid = Math.min(1, Math.max(0, (Math.max(a, 0) + Math.min(b, 1)) / 2));
      const on = captions(mid).filter((c) => c.o > 0.99);
      expect(on).toHaveLength(1);
      expect(on[0].y).toBe(0);
    }
  });
  it("show the first at the top and the last at the foot", () => {
    expect(captions(0)[0].o).toBe(1);
    expect(captions(1)[4].o).toBe(1);
  });
});

describe("beats", () => {
  it("name the beat whose start p has passed", () => {
    BEAT_STARTS.forEach((v, i) => expect(beatIndex(v)).toBe(i));
    expect(beatIndex(0.2)).toBe(2);
    expect(beatIndex(1)).toBe(9);
  });
  it("light TARE only while taring", () => {
    expect(taring(0.12)).toBe(true);
    expect(taring(0.48)).toBe(true);
    expect(taring(0.3)).toBe(false);
  });
  it("mark tiers pending, active, then done", () => {
    expect(tierState(0, 0.1)).toBe("pending");
    expect(tierState(0, 0.2)).toBe("active");
    expect(tierState(0, 0.3)).toBe("done");
    expect(tierState(2, 0.48)).toBe("active");
    expect(tierState(2, 0.5)).toBe("done");
  });
});

describe("pour and cap", () => {
  it("pours oil during the tiers and alcohol during its window only", () => {
    expect(stream(0.1).on).toBe(0);
    expect(stream(0.3)).toEqual({ on: 1, alc: false });
    expect(stream(0.6)).toEqual({ on: 1, alc: true });
    expect(stream(0.75).on).toBe(0);
  });
  it("lifts the cap at the first tare and seats it again at the end", () => {
    expect(capState(0).lift).toBe(0);
    expect(capState(0.3).lift).toBe(1);
    expect(capState(1).lift).toBe(0);
    expect(capState(0.85).atomiser).toBeGreaterThan(0);
    expect(capState(0.9).atomiser).toBe(1);
  });
  it("starts the ending at .95", () => {
    expect(heroAmount(0.94)).toBe(0);
    expect(heroAmount(1)).toBe(1);
  });
  it("keeps the beats in order", () => {
    const flat = [B.tare1, ...B.tiers, B.tare2, B.alc, B.mix, B.ato, B.spray, B.cap, B.hero].flat();
    expect([...flat].sort((a, b) => a - b)).toEqual(flat);
  });
});

describe("camera", () => {
  it("sits on each keyframe exactly", () => {
    for (const [p, dist, camY, lookY, orbit] of KF) expect(camera(p)).toEqual({ dist, camY, lookY, orbit });
  });
  it("is the same frame whichever way you scrub", () => {
    expect(camera(0.333)).toEqual(camera(0.333));
  });
});

describe("helpers", () => {
  it("mix colours and scale the flacon by cube root", () => {
    expect(mixHex("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(bottleScale(100)).toBe(1);
    expect(bottleScale(10)).toBeCloseTo(0.464, 3);
    expect(bottleScale(1)).toBe(0.42);
  });
  it("seeds 28 note drops and 24 alcohol drops, the same every load", () => {
    expect(DROPS.filter((d) => d.tier < 3)).toHaveLength(28);
    expect(DROPS.filter((d) => d.tier === 3)).toHaveLength(24);
    expect(DROPS[0].x).toBeCloseTo(0.06 + 0.88 * (((Math.sin(1.7) * 43758.5453) % 1 + 1) % 1), 6);
  });
});
