import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { LOOP_END, XFADE, loopStart, SRC } from "./templeSound.js";

describe("kyphi band loop", () => {
  it("starts each copy XFADE before the last one ends", () => {
    expect(loopStart(0)).toBe(0);
    expect(loopStart(1) + XFADE).toBeCloseTo(LOOP_END);
    expect(loopStart(2) - loopStart(1)).toBeCloseTo(LOOP_END - XFADE);
    expect(loopStart(1)).toBeCloseTo(16 * 240 / 66); // every 16 bars at 66 bpm (58.18 s, as make-kyphi-music reports): the rite stays on the beat
  });
  it("ships the track it plays", () => expect(existsSync(`public${SRC}`)).toBe(true));
});
