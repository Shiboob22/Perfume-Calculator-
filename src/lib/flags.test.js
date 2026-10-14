import { describe, expect, it } from "vitest";
import { applyFlagLink, flagOn, FLAGS } from "./flags";

const memory = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k), m };
};

describe("flagOn", () => {
  it("is off by default", () => expect(flagOn("wardrobe", { env: {}, storage: memory() })).toBe(false));
  it("is on from the build or from this device", () => {
    expect(flagOn("wardrobe", { env: { VITE_FLAG_WARDROBE: "1" }, storage: memory() })).toBe(true);
    const s = memory(); s.setItem("kyphira.flag.wardrobe", "1");
    expect(flagOn("wardrobe", { env: {}, storage: s })).toBe(true);
  });
  it("only a literal 1 turns it on", () => {
    expect(flagOn("wardrobe", { env: { VITE_FLAG_WARDROBE: "true" }, storage: memory() })).toBe(false);
    const s = memory(); s.setItem("kyphira.flag.wardrobe", "yes");
    expect(flagOn("wardrobe", { env: {}, storage: s })).toBe(false);
  });
  it("knows only the listed rooms", () => {
    expect(FLAGS).toContain("wardrobe");
    expect(flagOn("nose", { env: { VITE_FLAG_NOSE: "1" }, storage: memory() })).toBe(false);
  });
  it("survives unusable storage", () => {
    const broken = { getItem() { throw new Error("blocked"); } };
    expect(flagOn("wardrobe", { env: {}, storage: broken })).toBe(false);
    expect(flagOn("wardrobe", { env: {}, storage: null })).toBe(false);
  });
});

describe("applyFlagLink", () => {
  it("sets and clears a flag from the query, ignoring other names", () => {
    const s = memory();
    expect(applyFlagLink("?flag=wardrobe&flag=bogus&x=1", s)).toEqual(["wardrobe"]);
    expect(flagOn("wardrobe", { env: {}, storage: s })).toBe(true);
    expect(applyFlagLink("?unflag=wardrobe", s)).toEqual(["wardrobe"]);
    expect(flagOn("wardrobe", { env: {}, storage: s })).toBe(false);
    expect(s.m.size).toBe(0);
  });
  it("does nothing without a query, or when storage throws", () => {
    expect(applyFlagLink("", memory())).toEqual([]);
    expect(applyFlagLink("?flag=wardrobe", { setItem() { throw new Error("blocked"); } })).toEqual([]);
  });
});
