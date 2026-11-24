import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { LOOP_END, XFADE, loopStart, SRC } from "./templeSound.js";

describe("kyphi band loop", () => {
  it("starts each copy XFADE before the last one ends", () => {
    expect(loopStart(0)).toBe(0);
    expect(loopStart(1) + XFADE).toBeCloseTo(LOOP_END);
    expect(loopStart(2) - loopStart(1)).toBeCloseTo(LOOP_END - XFADE);
    expect(loopStart(1)).toBeCloseTo(26 * 240 / 107); // every 26 bars at 107 bpm: the groove stays on the beat
  });
  it("ships the track it plays", () => expect(existsSync(`public${SRC}`)).toBe(true));
});
