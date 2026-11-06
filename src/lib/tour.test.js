import { describe, it, expect } from "vitest";
import { TOUR_STEPS, COUNT_UP_MS, countUp, tourKeyAction, tourSeen, placeCard, tourStrength } from "./tour";

describe("tour steps", () => {
  it("are the prototype's six, in order", () => {
    expect(TOUR_STEPS).toEqual(["sheet", "blend", "scale", "pour", "cost", "upgrade"]);
    expect(COUNT_UP_MS).toBe(800);
  });
  it("first stop changes the strength", () => {
    expect(tourStrength(25)).toBe(20);
    expect(tourStrength("25")).toBe(20);
    expect(tourStrength(20)).toBe(25);
    expect(tourStrength(30)).toBe(25);
  });
});

describe("countUp", () => {
  it("eases from 0 to 1 and clamps", () => {
    expect(countUp(0)).toBe(0);
    expect(countUp(1)).toBe(1);
    expect(countUp(0.5)).toBeCloseTo(0.875);
    expect(countUp(-1)).toBe(0);
    expect(countUp(2)).toBe(1);
    expect(countUp("x")).toBe(0);
  });
});

describe("tourKeyAction", () => {
  it("Escape skips, arrows step", () => {
    expect(tourKeyAction("Escape")).toBe("skip");
    expect(tourKeyAction("ArrowRight")).toBe("next");
    expect(tourKeyAction("ArrowLeft")).toBe("back");
    expect(tourKeyAction("Enter")).toBe(null);
  });
  it("mirrors the arrows in RTL", () => {
    expect(tourKeyAction("ArrowLeft", true)).toBe("next");
    expect(tourKeyAction("ArrowRight", true)).toBe("back");
  });
  it("leaves arrows to a field, but Escape still skips", () => {
    expect(tourKeyAction("ArrowRight", false, true)).toBe(null);
    expect(tourKeyAction("Escape", false, true)).toBe("skip");
  });
});

describe("tourSeen", () => {
  it("is the server's flag or the browser's", () => {
    expect(tourSeen(null, null)).toBe(false);
    expect(tourSeen({ bench_tour_at: null }, null)).toBe(false);
    expect(tourSeen({ bench_tour_at: "2026-11-06T00:00:00Z" }, null)).toBe(true);
    expect(tourSeen(null, "1")).toBe(true);
  });
});

describe("placeCard", () => {
  const box = { vw: 1440, vh: 900, cw: 360, ch: 260 };
  it("goes beside the target, right first", () => {
    expect(placeCard({ top: 100, left: 100, width: 400, height: 300 }, box)).toEqual({ top: 100, left: 524, side: "right" });
  });
  it("goes left when there is no room on the right, and left first in RTL", () => {
    expect(placeCard({ top: 100, left: 900, width: 400, height: 300 }, box)).toEqual({ top: 100, left: 516, side: "left" });
    expect(placeCard({ top: 100, left: 500, width: 300, height: 300 }, { ...box, rtl: true })).toEqual({ top: 100, left: 116, side: "left" });
  });
  it("keeps the card inside the viewport vertically", () => {
    expect(placeCard({ top: 800, left: 100, width: 400, height: 50 }, box).top).toBe(900 - 260 - 16);
    expect(placeCard({ top: -300, left: 100, width: 400, height: 900 }, box).top).toBe(16);
  });
  it("falls back to below, then above, then the corner", () => {
    const wide = { left: 40, width: 1360 };
    expect(placeCard({ ...wide, top: 100, height: 200 }, box)).toEqual({ top: 316, left: 40, side: "below" });
    expect(placeCard({ ...wide, top: 500, height: 300 }, box)).toEqual({ top: 224, left: 40, side: "above" });
    expect(placeCard({ ...wide, top: 100, height: 700 }, box)).toEqual({ top: 624, left: 1056, side: "corner" });
    expect(placeCard({ ...wide, top: 100, height: 700 }, { ...box, rtl: true })).toEqual({ top: 624, left: 24, side: "corner" });
    expect(placeCard(null, box)).toEqual({ top: 624, left: 1056, side: "corner" });
  });
});
