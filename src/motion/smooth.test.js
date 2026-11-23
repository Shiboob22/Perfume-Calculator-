import { describe, expect, it } from "vitest";
import { smoothAllowed, startSmoothScroll, roomSmoothAllowed, pauseSmooth, _setController } from "./smooth.js";

describe("smooth scroll gate", () => {
  it("runs only with the layer on, motion allowed and a device with headroom", () => {
    expect(smoothAllowed({ on: true, isReduced: false, low: false })).toBe(true);
  });
  it("is off when the motion flag is off", () => {
    expect(smoothAllowed({ on: false, isReduced: false, low: false })).toBe(false);
  });
  it("is off under reduced motion", () => {
    expect(smoothAllowed({ on: true, isReduced: true, low: false })).toBe(false);
  });
  it("is off on a low-power device or with Save-Data", () => {
    expect(smoothAllowed({ on: true, isReduced: false, low: true })).toBe(false);
  });
  it("does nothing on the server", () => {
    expect(typeof window).toBe("undefined");
    expect(startSmoothScroll()()).toBeUndefined();
  });
});

describe("roomSmoothAllowed", () => {
  const ok = { wide: true, fine: true, on: true, isReduced: false, low: false };
  it("allows the reading rooms", () => {
    for (const p of ["/atlas/x", "/ar/salon", "/library/some-guide", "/wardrobe", "/nose", "/ar/nose"]) expect(roomSmoothAllowed(p, ok)).toBe(true);
  });
  it("refuses the working rooms and near misses", () => {
    for (const p of ["/bench", "/journal", "/app/account", "/wardrobex", "/nose/x"]) expect(roomSmoothAllowed(p, ok)).toBe(false);
  });
  it("needs a wide screen and a fine pointer", () => {
    expect(roomSmoothAllowed("/atlas", { ...ok, wide: false })).toBe(false);
    expect(roomSmoothAllowed("/atlas", { ...ok, fine: false })).toBe(false);
  });
});

describe("pauseSmooth", () => {
  it("counts nested pauses", () => {
    const calls = [];
    _setController({ pause: () => calls.push("pause"), resume: () => calls.push("resume") });
    const a = pauseSmooth();
    const b = pauseSmooth();
    a();
    a(); // a second call of the same release does nothing
    expect(calls).toEqual(["pause"]);
    b();
    expect(calls).toEqual(["pause", "resume"]);
    _setController(null);
  });
});
