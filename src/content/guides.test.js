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

describe("private content", () => {
  // The owner's own collection (Vol. I Part X, most of Vol. II) is never
  // published. Any of these names in public content is a leak.
  const BOTTLES = [
    /\bIcon\b/, /Sedley/, /YSL Y\b/, /MYSLF/i, /Wulong Cha/i, /Rain Tea/i, /Tea Storm/i, /Blue Talisman/i, /Alth[aä]ïr|Althair/i,
    /Layton/i, /Pegasus/i, /40 Knots/i, /Herod/i, /Naxos/i, /Code Parfum/i, /Tobacco RWA|Rich Warm Addictive/i,
    /1 Million|One Million/i, /God of Fire/i, /Black XS/i, /Desire (Red|for a Man)/i, /Le Beau/i,
  ];

  it("names none of the owner's bottles in any guide or UI string", async () => {
    const en = (await import("../i18n/messages/en")).default;
    const ar = (await import("../i18n/messages/ar")).default;
    const text = JSON.stringify([GUIDES, en, ar]);
    for (const re of BOTTLES) expect(text, String(re)).not.toMatch(re);
  });
});

describe("guide pages' head", () => {
  it("carries article structured data with the author", async () => {
    const { headFor, headHtml } = await import("../site/meta");
    const html = headHtml(headFor("/ar/guides/why-weigh"));
    const json = JSON.parse(html.match(/<script type="application\/ld\+json">(.*)<\/script>/)[1]);
    expect(json[0]).toMatchObject({ "@type": "Article", inLanguage: "ar", author: { name: "Hisham Shiboob" } });
    expect(json[1].itemListElement).toHaveLength(2);
    expect(headHtml(headFor("/pricing"))).not.toContain("ld+json");
  });
});
