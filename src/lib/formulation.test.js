import { describe, it, expect } from "vitest";
import { FAMILIES, REFERENCE, STRENGTHS, differences, familyGuide } from "./formulation";
import { TIERS } from "./tiers";

describe("formulation module", () => {
  it("keeps today's active family values unchanged", () => {
    // Pinned until the owner decides the differences: changing any of these
    // changes what the calculator shows, which needs an explicit decision.
    expect(Object.fromEntries(Object.values(FAMILIES).map((f) => [f.key, [f.active.density, f.active.defaultConc, f.active.restDays]])))
      .toEqual({
        fresh: [0.87, 20, [7, 14]],
        floral: [0.95, 25, [14, 21]],
        woody: [0.93, 22, [21, 28]],
        oriental: [1.02, 30, [28, 42]],
        gourmand: [1.0, 25, [21, 28]],
      });
  });

  it("records the handbook's reference densities and named strengths", () => {
    expect(REFERENCE.oilDensity).toBe(0.95);
    expect(REFERENCE.ethanolDensity).toBe(0.81);
    expect(STRENGTHS.map((s) => `${s.pct} ${s.name}`)).toEqual(["15 EDT", "20 EDP", "25 EDP Intense", "30 Extrait"]);
  });

  it("serves tiers.js the same shape as before", () => {
    expect(TIERS.oriental).toMatchObject({ label: "Amber (Oriental)", density: 1.02, defaultConc: 30, restDays: [28, 42] });
    expect(Object.keys(TIERS)).toEqual(["fresh", "floral", "woody", "oriental", "gourmand"]);
  });

  it("lists every disagreement between the sources", () => {
    const d = differences().map((x) => `${x.family}.${x.field}`);
    // Handbook 0.95 vs the family densities; ranges only in the JSON.
    expect(d).toEqual(expect.arrayContaining(["fresh.density", "woody.density", "oriental.density", "gourmand.density", "fresh.range"]));
    expect(d).not.toContain("floral.density"); // both say 0.95
  });

  it("builds the AI family guide from the active values", () => {
    expect(familyGuide()).toContain("oriental — Amber (Oriental) (Soft Amber, Amber, Woody Amber). Oil density 1.02 g/mL, default 30%, rest 4–6 weeks.");
  });
});
