import { describe, it, expect } from "vitest";
import { cleanDraft, linkCarriesValues, loadDraft, saveDraft, clearDraft } from "./calcDraft";

function memory() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

describe("calcDraft", () => {
  it("round-trips a draft", () => {
    const s = memory();
    saveDraft({ fragName: "Oud", batchSize: "50", batchUnit: "g", concPct: 25, chosenConc: true }, s);
    expect(loadDraft(s)).toEqual({ fragName: "Oud", batchSize: "50", batchUnit: "g", concPct: 25, chosenConc: true });
  });
  it("keeps a blend: its type and rows", () => {
    const s = memory();
    const blend = [{ id: "a", name: "Bergamot", type: "eo", pct: "60" }, { id: "b", name: "Iso E", type: "aroma", pct: "40" }];
    saveDraft({ formulaType: "blend", blend }, s);
    expect(loadDraft(s)).toEqual({ formulaType: "blend", blend });
    expect(cleanDraft({ blend: [1, 2] })).toBeNull();
    expect(cleanDraft({ blend: { a: 1 } })).toBeNull();
  });
  it("drops unknown and malformed fields", () => {
    expect(cleanDraft({ fragName: 3, evil: "x", densities: [1], mode: "run" })).toEqual({ mode: "run" });
    expect(cleanDraft({ evil: 1 })).toBeNull();
    expect(cleanDraft("nope")).toBeNull();
  });
  it("survives broken or blocked storage", () => {
    const s = memory();
    s.setItem("sh-calc-draft-v1", "{not json");
    expect(loadDraft(s)).toBeNull();
    const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() { throw new Error("blocked"); } };
    expect(loadDraft(blocked)).toBeNull();
    expect(() => saveDraft({ mode: "run" }, blocked)).not.toThrow();
    expect(() => clearDraft(blocked)).not.toThrow();
    expect(loadDraft(undefined)).toBeNull();
  });
  it("clears", () => {
    const s = memory();
    saveDraft({ mode: "run" }, s);
    clearDraft(s);
    expect(loadDraft(s)).toBeNull();
  });
  it("a link with any value wins over the draft", () => {
    expect(linkCarriesValues({ size: null, unit: null, conc: null, family: null, name: null })).toBe(false);
    expect(linkCarriesValues({ size: null, unit: null, conc: 25, family: null, name: null })).toBe(true);
    expect(linkCarriesValues(undefined)).toBe(false);
  });
});
