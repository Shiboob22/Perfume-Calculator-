import { describe, expect, it } from "vitest";
import { GLOSSARY_ENTRIES, glossaryTerm, markTerms } from "./glossary";
import { GUIDES } from "./guides";

// Every word of the guide in that language, to prove nothing is written here.
const allText = (locale) => JSON.stringify(GUIDES.map((g) => g[locale].body));

describe("glossary", () => {
  for (const locale of ["en", "ar"]) {
    it(`every term resolves in ${locale}, and its text is the guide's own`, () => {
      const corpus = allText(locale);
      for (const e of GLOSSARY_ENTRIES) {
        const term = glossaryTerm(e, locale);
        expect(term, e.id).not.toBeNull();
        expect(corpus).toContain(JSON.stringify(term.text).slice(1, -1));
        expect(term.text.length).toBeGreaterThan(20);
      }
    });
  }

  it("quotes the handbook for a term", () => {
    expect(glossaryTerm(GLOSSARY_ENTRIES.find((e) => e.id === "projection"), "en")).toMatchObject({
      term: "Projection", slug: "longevity-projection-sillage", section: "projection",
      text: expect.stringMatching(/^Governed by formula, dose, volatility/),
    });
  });

  it("marks the first use of a term once a page, never in its own section", () => {
    const seen = new Set();
    const ctx = { seen, slug: "fragrance-types", section: "x" };
    expect(markTerms("Higher concentration, more projection.", "en", ctx)).toEqual([
      "Higher ", { term: "concentration", match: "concentration" }, ", more ", { term: "projection", match: "projection" }, ".",
    ]);
    expect(markTerms("More projection.", "en", ctx)).toEqual(["More projection."]);
    const own = { seen: new Set(), slug: "longevity-projection-sillage", section: "projection" };
    expect(markTerms("Projection depends on dose.", "en", own)).toEqual(["Projection depends on dose."]);
  });

  it("matches whole words, Arabic included", () => {
    expect(markTerms("Overprojection", "en", { seen: new Set(), slug: "a", section: "b" })).toEqual(["Overprojection"]);
    expect(markTerms("يزيد الفوحان قليلًا", "ar", { seen: new Set(), slug: "a", section: "b" })).toEqual([
      "يزيد ", { term: "projection", match: "الفوحان" }, " قليلًا",
    ]);
  });
});
