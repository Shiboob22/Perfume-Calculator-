import { describe, expect, it } from "vitest";
import { latestVersion, matchesVersion, recipeLabel, recipeLimit, recipeName, versionIndex, versionRow, versionSettings, MAX_RECIPES, MAX_VERSIONS } from "./recipes";

const v = (version, extra = {}) => ({ id: `v${version}`, version, amount: 100, unit: "ml", concentration_pct: 25, oil_density: null, ethanol_density: null, note: null, ...extra });
const recipe = { id: "r1", name: "Oud Nights", family: "woody", recipe_versions: [v(1), v(3, { amount: 50 }), v(2)] };

describe("latestVersion", () => {
  it("picks the highest number whatever the order", () => expect(latestVersion(recipe).version).toBe(3));
  it("is null for no versions", () => { expect(latestVersion({ recipe_versions: [] })).toBeNull(); expect(latestVersion(null)).toBeNull(); });
});

describe("versionSettings", () => {
  it("restores size, unit, strength, family and densities", () => {
    const s = versionSettings(recipe, v(1, { oil_density: "0.93", ethanol_density: 0.81, note: "less oud" }));
    expect(s).toEqual({ family: "woody", size: 100, unit: "ml", conc: 25, oilDensity: 0.93, ethanolDensity: 0.81, note: "less oud" });
  });
  it("leaves a blank density to the defaults", () => {
    const s = versionSettings({ family: null }, v(1));
    expect(s.family).toBeNull();
    expect(s.oilDensity).toBeNull();
    expect(s.note).toBe("");
  });
});

describe("versionRow", () => {
  it("numbers the fields the table takes and trims the note", () => {
    expect(versionRow({ amount: "50", unit: "ml", concPct: "20", oilDensity: 0.95, ethanolDensity: 0.81, note: "  warmer  " }))
      .toEqual({ amount: 50, unit: "ml", concentration_pct: 20, oil_density: 0.95, ethanol_density: 0.81, note: "warmer" });
  });
  it("sends null for a blank note or density and caps the note at 500", () => {
    const r = versionRow({ amount: 10, unit: "g", concPct: 15, oilDensity: 0, ethanolDensity: "", note: "x".repeat(600) });
    expect(r.oil_density).toBeNull();
    expect(r.ethanol_density).toBeNull();
    expect(r.note).toHaveLength(500);
    expect(versionRow({ amount: 10, unit: "g", concPct: 15, note: "   " }).note).toBeNull();
  });
});

describe("matchesVersion", () => {
  const now = { amount: 100, unit: "ml", concPct: 25, oilDensity: 0.95, ethanolDensity: 0.81 };
  it("is true when nothing changed", () => expect(matchesVersion(v(1), now)).toBe(true));
  it("is false after any change to size, unit or strength", () => {
    expect(matchesVersion(v(1), { ...now, amount: 101 })).toBe(false);
    expect(matchesVersion(v(1), { ...now, unit: "g" })).toBe(false);
    expect(matchesVersion(v(1), { ...now, concPct: 25.5 })).toBe(false);
  });
  it("compares a stored density, and ignores one the version left blank", () => {
    expect(matchesVersion(v(1, { oil_density: 0.93 }), now)).toBe(false);
    expect(matchesVersion(v(1, { oil_density: 0.93 }), { ...now, oilDensity: 0.93 })).toBe(true);
    expect(matchesVersion(v(1), { ...now, oilDensity: 0.99 })).toBe(true);
  });
  it("accepts numeric strings from the database", () => {
    expect(matchesVersion(v(1, { amount: "100", concentration_pct: "25.0" }), now)).toBe(true);
  });
  it("is false for no version", () => expect(matchesVersion(null, now)).toBe(false));
});

describe("versionIndex and recipeLabel", () => {
  it("maps every version id to its recipe and number", () => {
    const idx = versionIndex([recipe]);
    expect(idx.size).toBe(3);
    expect(recipeLabel(idx.get("v3"))).toBe("Oud Nights v3");
    expect(recipeLabel(idx.get("missing"))).toBe("");
  });
  it("copes with nothing", () => expect(versionIndex(undefined).size).toBe(0));
});

describe("recipeName", () => {
  it("cleans and bounds", () => {
    expect(recipeName("  Oud   Nights ")).toBe("Oud Nights");
    expect(recipeName("   ")).toBeNull();
    expect(recipeName("x".repeat(81))).toBeNull();
    expect(recipeName("x".repeat(80))).toHaveLength(80);
  });
});

describe("recipeLimit", () => {
  it("stops a 51st recipe and a 101st version", () => {
    expect(recipeLimit(new Array(MAX_RECIPES - 1).fill({}), null)).toBeNull();
    expect(recipeLimit(new Array(MAX_RECIPES).fill({}), null)).toBe("recipes");
    expect(recipeLimit([], { recipe_versions: new Array(MAX_VERSIONS).fill({}) })).toBe("versions");
    expect(recipeLimit(new Array(MAX_RECIPES).fill({}), { recipe_versions: [v(1)] })).toBeNull();
  });
});
