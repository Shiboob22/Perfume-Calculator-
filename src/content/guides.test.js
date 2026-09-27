import { describe, it, expect } from "vitest";
import { GUIDES } from "./guides";
import { REFERENCE, STRENGTHS } from "../lib/formulation";

const anchors = (body) => body.flatMap((b) => [b.id, ...(b.steps || []).map((s) => s.id)]).filter(Boolean);
const shape = (body) => body.map((b) => Object.keys(b).filter((k) => k !== "id").join("+"));

describe("guides", () => {
  it("have unique slugs", () => {
    expect(new Set(GUIDES.map((g) => g.slug)).size).toBe(GUIDES.length);
  });

  for (const g of GUIDES) {
    it(`${g.slug}: English and Arabic share sections and anchors`, () => {
      expect(anchors(g.ar.body)).toEqual(anchors(g.en.body));
      expect(shape(g.ar.body)).toEqual(shape(g.en.body));
      expect(g.ar.needsReview).toBe(true);
    });
  }

  it("reproduce the handbook's Quick Reference from the formula", () => {
    // Half-up to 0.01 on the decimal value (4.275 -> 4.28, never 4.27), and
    // the total is the sum of the two rounded pours, as the handbook prints it.
    const r2 = (x) => Math.round(Number(x.toPrecision(12)) * 100 + 1e-9) / 100;
    const rows = GUIDES.find((g) => g.slug === "the-calculation").en.body
      .find((b) => b.table?.head?.[0] === "Bottle").table.rows;
    expect(rows).toHaveLength(12);
    for (const [bottle, strength, oil, alcohol, total] of rows) {
      const V = parseFloat(bottle);
      const C = STRENGTHS.find((s) => strength === `${s.pct}% ${s.name}`).pct / 100;
      const o = r2(V * C * REFERENCE.oilDensity);
      const a = r2(V * (1 - C) * REFERENCE.ethanolDensity);
      expect([oil, alcohol, total]).toEqual([o, a, r2(o + a)].map((x) => `${x.toFixed(2)} g`));
    }
  });
});
