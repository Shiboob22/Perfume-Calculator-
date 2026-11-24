import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { LOOP_END, XFADE, loopStart, SRC } from "./templeSound.js";

describe("kyphi band loop", () => {
  it("starts each copy XFADE before the last one ends", () => {
    expect(loopStart(0)).toBe(0);
    expect(loopStart(1) + XFADE).toBe(LOOP_END);
    expect(loopStart(2) - loopStart(1)).toBe(LOOP_END - XFADE);
  });
  it("ships the track it plays", () => expect(existsSync(`public${SRC}`)).toBe(true));
});
