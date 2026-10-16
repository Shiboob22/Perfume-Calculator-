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
  // published. Any private term in public content is a leak.
  it("names none of the owner's bottles, profiles or scores in any guide, UI string or legal page", async () => {
    const { privateTermsIn } = await import("../../scripts/private-terms.mjs");
    const en = (await import("../i18n/messages/en")).default;
    const ar = (await import("../i18n/messages/ar")).default;
    const { LEGAL } = await import("./legal");
    const text = JSON.stringify([GUIDES, en, ar, LEGAL]);
    expect(privateTermsIn(text, { scores: true })).toEqual([]);
  });

  it("the check itself catches each kind of leak", async () => {
    const { privateTermsIn } = await import("../../scripts/private-terms.mjs");
    for (const leak of ["PDM Layton", "Tobacco RWA", "a Y EDP", "Xerjoff Naxos", "THE CAIRO WEAPON", "the Core Five", "Overall 9.3 / 10", "Date 8 / 10"]) {
      expect(privateTermsIn(leak, { scores: true }), leak).not.toEqual([]);
    }
    for (const fine of ["Cairo heat", "100 ml at 25%", "1/10 of the batch", "an icon"]) {
      expect(privateTermsIn(fine, { scores: true }), fine).toEqual([]);
    }
  });
});

describe("guide pages' head", () => {
  it("carries article structured data with the author", async () => {
    const { headFor, headHtml } = await import("../site/meta");
    const html = headHtml(headFor("/ar/library/why-weigh"));
    const json = JSON.parse(html.match(/<script type="application\/ld\+json">(.*)<\/script>/)[1]);
    expect(json[0]).toMatchObject({ "@type": "Article", inLanguage: "ar", author: { name: "Hisham Shiboob" } });
    expect(json[1].itemListElement).toHaveLength(2);
    expect(headHtml(headFor("/pricing"))).not.toContain("ld+json");
  });
});

describe("Arabic guide drafts", () => {
  it("stay out of search until the author has reviewed them", async () => {
    const { headFor, headHtml } = await import("../site/meta");
    const draft = GUIDES.find((g) => g.ar.needsReview);
    const ar = headFor(`/ar/library/${draft.slug}`);
    const en = headFor(`/library/${draft.slug}`);
    expect(ar.noindex).toBe(true);
    expect(headHtml(ar)).toContain('<meta name="robots" content="noindex" />');
    expect(en.noindex).toBe(false);
    expect(en.alternates.ar).toBeUndefined();
    expect(headHtml(en)).not.toContain('hreflang="ar"');
  });
  it("are listed once reviewed", async () => {
    const { headFor } = await import("../site/meta");
    const g = GUIDES[0];
    const saved = g.ar.needsReview;
    g.ar.needsReview = false;
    try {
      expect(headFor(`/ar/library/${g.slug}`).noindex).toBe(false);
      expect(headFor(`/library/${g.slug}`).alternates.ar).toContain(`/ar/library/${g.slug}`);
    } finally {
      g.ar.needsReview = saved;
    }
  });
});
