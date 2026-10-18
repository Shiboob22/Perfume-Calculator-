import { describe, expect, it } from "vitest";
import { smoothAllowed, startSmoothScroll } from "./smooth.js";

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
