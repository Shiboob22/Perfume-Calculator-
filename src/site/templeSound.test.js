import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { LOOP_END, XFADE, loopStart, SRC } from "./templeSound.js";
import { followPulse } from "./pulse.js";

describe("kyphi band loop", () => {
  it("starts each copy XFADE before the last one ends", () => {
    expect(loopStart(0)).toBe(0);
    expect(loopStart(1) + XFADE).toBeCloseTo(LOOP_END);
    expect(loopStart(2) - loopStart(1)).toBeCloseTo(LOOP_END - XFADE);
  });
  it("follows changes in loudness, not the level", () => {
    let st = { v: 0, base: 0 };
    for (let i = 0; i < 600; i++) st = followPulse(st, 0.2); // a steady drone
    expect(st.v).toBeLessThan(0.01);
    st = followPulse(st, 0.3); // a swell, 50 % up
    expect(st.v).toBeGreaterThan(0.25);
    const up = st.v;
    st = followPulse(st, 0.2); // back down: falls slower than it rose
    expect(up - st.v).toBeLessThan(up * 0.1);
    expect(followPulse(st, 50).v).toBeLessThanOrEqual(1);
    expect(followPulse({ v: 0, base: 0 }, 0).v).toBe(0); // silence
  });
  it("ships the track it plays", () => expect(existsSync(`public${SRC}`)).toBe(true));
});
