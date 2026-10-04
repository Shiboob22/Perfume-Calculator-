import { describe, it, expect } from "vitest";
import { prefillFromQuery, startingBottle, afterOnboardingPath, cleanName, refFrom } from "./calcPrefill";

const q = (s) => prefillFromQuery(new URLSearchParams(s));

describe("prefillFromQuery", () => {
  it("reads a guide's link", () => {
    expect(q("size=100&unit=ml&conc=25")).toEqual({ size: 100, unit: "ml", conc: 25, family: null, name: null });
  });
  it("reads a shared recipe's family", () => {
    expect(q("size=50&unit=g&conc=30&family=oriental")).toEqual({ size: 50, unit: "g", conc: 30, family: "oriental", name: null });
    expect(q("family=__proto__").family).toBeNull();
  });
  it("ignores missing, unknown and out-of-range values", () => {
    expect(q("")).toEqual({ size: null, unit: null, conc: null, family: null, name: null });
    expect(q("size=-5&unit=gallon&conc=150&family=citrus")).toEqual({ size: null, unit: null, conc: null, family: null, name: null });
    expect(q("size=abc&unit=__proto__&conc=0")).toEqual({ size: null, unit: null, conc: null, family: null, name: null });
  });
});

describe("names in links", () => {
  it("keeps a plain name", () => {
    expect(q("name=Oud%20Nights").name).toBe("Oud Nights");
  });
  it("strips control and bidi characters, squeezes spaces, caps at 120", () => {
    expect(cleanName("  Oud\u0000\n  Nights\u202e ")).toBe("Oud Nights");
    expect(cleanName("x".repeat(200))).toHaveLength(120);
    expect(cleanName("   ")).toBeNull();
    expect(cleanName(null)).toBeNull();
  });
});

describe("refFrom", () => {
  it("reads a short slug and nothing else", () => {
    expect(refFrom("?size=50&ref=recipe")).toBe("recipe");
    expect(refFrom("?ref=Home")).toBeNull();
    expect(refFrom("?ref=" + "a".repeat(61))).toBeNull();
    expect(refFrom("")).toBeNull();
  });
});

describe("afterOnboardingPath", () => {
  const answers = { default_bottle: 50, default_unit: "ml" };
  it("uses the answers when there is no link", () => {
    expect(afterOnboardingPath("", answers)).toBe("/app/calculator?size=50&unit=ml");
    expect(afterOnboardingPath("", {})).toBe("/app/calculator");
  });
  it("keeps every value the link carried", () => {
    expect(afterOnboardingPath("?size=30&unit=g&conc=25&family=woody&name=Oud", answers))
      .toBe("/app/calculator?size=30&unit=g&conc=25&family=woody&name=Oud");
  });
  it("fills only the bottle the link left out", () => {
    expect(afterOnboardingPath("?conc=20&family=fresh", answers)).toBe("/app/calculator?size=50&unit=ml&conc=20&family=fresh");
  });
  it("never mixes a link's size with the answers' unit", () => {
    expect(afterOnboardingPath("?size=30", answers)).toBe("/app/calculator?size=30");
  });
  it("drops what the calculator would ignore", () => {
    expect(afterOnboardingPath("?family=__proto__&conc=900&evil=1", answers)).toBe("/app/calculator?size=50&unit=ml");
  });
});

describe("startingBottle", () => {
  const none = { size: null, unit: null, conc: null };
  it("prefers the link's values", () => {
    expect(startingBottle({ ...none, size: 30, unit: "g" }, { default_bottle: 50, default_unit: "ml" })).toEqual({ size: 30, unit: "g" });
    expect(startingBottle({ ...none, unit: "oz" }, { default_bottle: 50, default_unit: "ml" })).toEqual({ size: 100, unit: "oz" });
  });
  it("uses the saved bottle with its unit", () => {
    expect(startingBottle(none, { default_bottle: "50", default_unit: "g" })).toEqual({ size: 50, unit: "g" });
  });
  it("keeps a saved unit without a size, and falls back to 100 mL", () => {
    expect(startingBottle(none, { default_unit: "floz" })).toEqual({ size: 100, unit: "floz" });
    expect(startingBottle(none, null)).toEqual({ size: 100, unit: "ml" });
    expect(startingBottle(none, { default_bottle: 0, default_unit: "cups" })).toEqual({ size: 100, unit: "ml" });
  });
});
