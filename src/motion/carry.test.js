import { describe, expect, it } from "vitest";
import { createScrollMemory, navDirection, onScreen, pathSegments, popDirection } from "./carry.js";

describe("navDirection (motion M2: direction has meaning)", () => {
  it("goes forward deeper into a room and back out of it", () => {
    expect(navDirection("/atlas", "/atlas/fragrance/1")).toBe("forward");
    expect(navDirection("/atlas/fragrance/1", "/atlas")).toBe("back");
    expect(navDirection("/bench", "/bench/journal")).toBe("forward");
    expect(navDirection("/bench/journal", "/bench")).toBe("back");
  });
  it("cross-fades between rooms, between pages at one depth, and on the same page", () => {
    expect(navDirection("/journal", "/bench/journal")).toBe("fade");
    expect(navDirection("/bench", "/journal")).toBe("fade");
    expect(navDirection("/atlas/fragrance/1", "/atlas/house/x")).toBe("fade");
    expect(navDirection("/journal?batch=a", "/journal?batch=b")).toBe("fade");
    expect(navDirection("/", "/bench")).toBe("fade");
    expect(navDirection(undefined, "/bench")).toBe("fade");
  });
  it("reads the Arabic paths the same way (the CSS mirrors the movement)", () => {
    expect(pathSegments("/ar/atlas/fragrance/1?x=1#h")).toEqual(["atlas", "fragrance", "1"]);
    expect(navDirection("/ar/atlas", "/ar/atlas/fragrance/1")).toBe("forward");
    expect(navDirection("/ar/bench/journal", "/ar/bench")).toBe("back");
  });
  it("reads browser back and forward from the history position, back when unknown", () => {
    expect(popDirection(4, 3)).toBe("back");
    expect(popDirection(3, 4)).toBe("forward");
    expect(popDirection(null, 4)).toBe("back");
    expect(popDirection(2, undefined)).toBe("back");
  });
});

describe("scroll memory", () => {
  it("keeps where each entry was left, rounded and never negative", () => {
    const m = createScrollMemory();
    m.set("a", 120.6);
    m.set("b", -5);
    expect(m.get("a")).toBe(121);
    expect(m.get("b")).toBe(0);
    expect(m.get("c")).toBeUndefined();
  });
  it("ignores entries without a key or a number", () => {
    const m = createScrollMemory();
    m.set("", 10);
    m.set("a", NaN);
    expect(m.size).toBe(0);
  });
  it("keeps only the newest entries, a re-read entry counting as new", () => {
    const m = createScrollMemory({ max: 2 });
    m.set("a", 1); m.set("b", 2); m.set("a", 3); m.set("c", 4);
    expect(m.get("b")).toBeUndefined();
    expect(m.get("a")).toBe(3);
    expect(m.get("c")).toBe(4);
  });
  it("survives a reload through its stored copy, and a broken copy starts empty", () => {
    let stored = null;
    const a = createScrollMemory({ persist: (v) => { stored = v; } });
    a.set("k", 640);
    a.flush();
    expect(createScrollMemory({ load: () => stored }).get("k")).toBe(640);
    expect(createScrollMemory({ load: () => "{not json" }).size).toBe(0);
    expect(createScrollMemory({ load: () => JSON.stringify({ k: 1 }) }).size).toBe(0);
    expect(createScrollMemory({ load: () => JSON.stringify([["k", "x"], [1, 2], ["ok", 5]]) }).get("ok")).toBe(5);
  });
  it("does not throw when storage refuses the write", () => {
    const m = createScrollMemory({ persist: () => { throw new Error("full"); } });
    m.set("a", 1);
    expect(() => m.flush()).not.toThrow();
  });
});

describe("onScreen", () => {
  it("is true for a box at least partly on the screen, false off it or empty", () => {
    const box = (top, left, width = 100, height = 20) => ({ top, left, width, height, bottom: top + height, right: left + width });
    expect(onScreen(box(10, 10), 400, 800)).toBe(true);
    expect(onScreen(box(-10, 10), 400, 800)).toBe(true);
    expect(onScreen(box(900, 10), 400, 800)).toBe(false);
    expect(onScreen(box(-40, 10), 400, 800)).toBe(false);
    expect(onScreen(box(10, 500), 400, 800)).toBe(false);
    expect(onScreen(box(10, 10, 0, 0), 400, 800)).toBe(false);
    expect(onScreen(null, 400, 800)).toBe(false);
  });
});
