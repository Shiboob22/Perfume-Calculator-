import { describe, it, expect } from "vitest";
import { hero3dAllowed } from "./gate.js";

const all = { compounding: true, hero3d: true, reduce: false, low: false, webgl: true };

describe("hero3dAllowed", () => {
  it("runs only when every condition holds", () => {
    expect(hero3dAllowed(all)).toBe(true);
  });
  it.each([
    ["the scene flag is off", { compounding: false }],
    ["the hero flag is off", { hero3d: false }],
    ["reduced motion is asked for", { reduce: true }],
    ["the device is low power or saving data", { low: true }],
    ["there is no WebGL", { webgl: false }],
  ])("keeps the static stage when %s", (_, change) => {
    expect(hero3dAllowed({ ...all, ...change })).toBe(false);
  });
});
