import { describe, it, expect } from "vitest";
import { prefillFromQuery, startingBottle, afterOnboardingPath, cleanName, refFrom, shareQuery } from "./calcPrefill";

const q = (s) => prefillFromQuery(new URLSearchParams(s));

describe("shareQuery", () => {
  it("round-trips through prefillFromQuery", () => {
    const state = { name: "Neroli Eau", family: "fresh", size: 100, unit: "ml", conc: 20 };
    expect(q(shareQuery(state))).toEqual({ ...state, recipe: null, orders: [] });
  });
  it("keeps decimals and other units", () => {
    expect(q(shareQuery({ name: "", family: "woody", size: 1.5, unit: "oz", conc: 22.5 }))).toEqual({ size: 1.5, unit: "oz", conc: 22.5, family: "woody", name: null, recipe: null, orders: [] });
  });
  it("leaves out anything blank or invalid", () => {
    expect(shareQuery({})).toBe("");
    expect(shareQuery({ name: "  ", family: "citrus", size: -5, unit: "gallon", conc: 150 })).toBe("");
    expect(shareQuery({ size: "abc", conc: 0, family: "__proto__", unit: "__proto__" })).toBe("");
  });
});

describe("prefillFromQuery recipe", () => {
  const V = "33333333-3333-4333-8333-333333333333";
  it("accepts a recipe version id and nothing else", () => {
    expect(q(`recipe=${V}`).recipe).toBe(V);
    expect(q("recipe=oops").recipe).toBeNull();
    expect(q("recipe=%3Cscript%3E").recipe).toBeNull();
    expect(q("").recipe).toBeNull();
  });
});

describe("prefillFromQuery", () => {
  it("reads a guide's link", () => {
    expect(q("size=100&unit=ml&conc=25")).toEqual({ size: 100, unit: "ml", conc: 25, family: null, name: null, recipe: null, orders: [] });
  });
  it("reads a shared recipe's family", () => {
    expect(q("size=50&unit=g&conc=30&family=oriental")).toEqual({ size: 50, unit: "g", conc: 30, family: "oriental", name: null, recipe: null, orders: [] });
    expect(q("family=__proto__").family).toBeNull();
  });
  it("ignores missing, unknown and out-of-range values", () => {
    expect(q("")).toEqual({ size: null, unit: null, conc: null, family: null, name: null, recipe: null, orders: [] });
    expect(q("size=-5&unit=gallon&conc=150&family=citrus")).toEqual({ size: null, unit: null, conc: null, family: null, name: null, recipe: null, orders: [] });
    expect(q("size=abc&unit=__proto__&conc=0")).toEqual({ size: null, unit: null, conc: null, family: null, name: null, recipe: null, orders: [] });
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
    expect(afterOnboardingPath("", answers)).toBe("/bench?size=50&unit=ml");
    expect(afterOnboardingPath("", {})).toBe("/bench");
  });
  it("keeps every value the link carried", () => {
    expect(afterOnboardingPath("?size=30&unit=g&conc=25&family=woody&name=Oud", answers))
      .toBe("/bench?size=30&unit=g&conc=25&family=woody&name=Oud");
  });
  it("fills only the bottle the link left out", () => {
    expect(afterOnboardingPath("?conc=20&family=fresh", answers)).toBe("/bench?size=50&unit=ml&conc=20&family=fresh");
  });
  it("never mixes a link's size with the answers' unit", () => {
    expect(afterOnboardingPath("?size=30", answers)).toBe("/bench?size=30");
  });
  it("drops what the calculator would ignore", () => {
    expect(afterOnboardingPath("?family=__proto__&conc=900&evil=1", answers)).toBe("/bench?size=50&unit=ml");
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

describe("order ids on a Bench link", () => {
  const A = "11111111-1111-4111-8111-111111111111";
  const B = "22222222-2222-4222-8222-222222222222";
  it("keeps well-formed ids once, drops the rest", () => {
    expect(prefillFromQuery(new URLSearchParams(`orders=${A},x,${B},${A}`)).orders).toEqual([A, B]);
    expect(prefillFromQuery(new URLSearchParams("")).orders).toEqual([]);
  });
});
