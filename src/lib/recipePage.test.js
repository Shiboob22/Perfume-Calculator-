import { describe, it, expect } from "vitest";
import { recipePageHtml, goneHtml, calculatorHref, recipePath, esc } from "./recipePage";

const recipe = {
  slug: "oud-nights-k3x9qa",
  fragrance_name: "Oud Nights",
  tier: "woody",
  concentration_pct: "25",
  basis: "volume",
  total_ml: "100",
  total_g: "84.5",
  oil_g: "23.75",
  ethanol_g: "60.75",
  rest_days: 28,
  public_note: "Sharp for two weeks.\nThen the oud rounds out.\n\nBest from day 28.",
  note_lang: "en",
  indexable: true,
  updated_at: "2026-10-02T10:00:00Z",
};
const opts = { site: "https://example.test", stylesheet: "/r-assets/site.css?v=abc", reportEmail: "report@example.test" };

describe("recipePageHtml", () => {
  const html = recipePageHtml(recipe, { ...opts, lang: "en" });

  it("has the recipe and the weights", () => {
    expect(html).toContain("<h1");
    expect(html).toContain("Oud Nights");
    expect(html).toContain("25% oil by volume");
    expect(html).toContain("100 mL");
    expect(html).toContain("23.75 g");
    expect(html).toContain("60.75 g");
    expect(html).toContain("84.50 g");
    expect(html).toContain("28 days");
  });
  it("keeps the note's paragraphs and line breaks", () => {
    expect(html).toContain("<p>Sharp for two weeks.<br />Then the oud rounds out.</p><p>Best from day 28.</p>");
  });
  it("has canonical, hreflang, Open Graph and locale tags", () => {
    expect(html).toContain('<link rel="canonical" href="https://example.test/r/oud-nights-k3x9qa" />');
    expect(html).toContain('hreflang="ar" href="https://example.test/ar/r/oud-nights-k3x9qa"');
    expect(html).toContain('hreflang="x-default" href="https://example.test/r/oud-nights-k3x9qa"');
    expect(html).toContain('<meta property="og:locale" content="en_US" />');
    expect(html).toContain('<meta property="og:locale:alternate" content="ar_EG" />');
    expect(html).toContain('<meta property="og:image" content="https://example.test/og/recipe-woody-en.png" />');
    expect(html).toContain('<meta name="description" content="Sharp for two weeks. Then the oud rounds out. Best from day 28." />');
    expect(html).not.toContain("noindex");
  });
  it("links the calculator, the report address and no script", () => {
    expect(html).toContain('href="/app/calculator?family=woody&amp;conc=25&amp;size=100&amp;unit=ml"');
    expect(html).toContain("mailto:report@example.test?subject=Report%3A%20shared%20recipe%20oud-nights-k3x9qa");
    expect(html).not.toMatch(/<script/i);
    expect(recipePageHtml(recipe, { ...opts, reportEmail: "" })).not.toContain("mailto:");
  });
  it("is Arabic and right-to-left at /ar, with the Latin name isolated", () => {
    const arHtml = recipePageHtml(recipe, { ...opts, lang: "ar" });
    expect(arHtml).toContain('<html lang="ar" dir="rtl">');
    expect(arHtml).toContain('<link rel="canonical" href="https://example.test/ar/r/oud-nights-k3x9qa" />');
    expect(arHtml).toContain('content="ar_EG"');
    expect(arHtml).toContain("<bdi>Oud Nights</bdi>");
    expect(arHtml).toContain('href="/r/oud-nights-k3x9qa" lang="en"');
    expect(arHtml).toContain("28 يومًا");
  });
  it("is noindex without a qualifying note, and describes itself", () => {
    const bare = recipePageHtml({ ...recipe, public_note: null, indexable: false, rest_days: null }, opts);
    expect(bare).toContain('<meta name="robots" content="noindex" />');
    expect(bare).toContain("A Woody blend at 25% oil in a 100 mL bottle");
    expect(bare).not.toContain("Rested");
  });
  it("by weight: grams for the bottle and the calculator", () => {
    const byWeight = { ...recipe, basis: "weight", total_g: "50" };
    expect(recipePageHtml(byWeight, opts)).toContain("25% oil by weight");
    expect(calculatorHref(byWeight)).toBe("/app/calculator?family=woody&conc=25&size=50&unit=g");
  });
  it("escapes everything from the database", () => {
    const evil = { ...recipe, fragrance_name: '<img src=x onerror="x()">', public_note: "</p><script>alert(1)</script>", slug: 'x"><script>-abcdef' };
    const out = recipePageHtml(evil, opts);
    expect(out).not.toMatch(/<script/i);
    expect(out).not.toContain("<img");
    expect(out).toContain("&lt;img src=x onerror=&quot;x()&quot;&gt;");
  });
  it("prints only public fields, whatever else the row carries", () => {
    const leaky = { ...recipe, oil_cost: 123.45, price_per_gram: 9.87, notes: "PRIVATE-NOTE", oil_type: "SUPPLIER-X", blended_by: "OWNER-NAME", user_id: "USER-ID" };
    const out = recipePageHtml(leaky, opts);
    for (const secret of ["123.45", "9.87", "PRIVATE-NOTE", "SUPPLIER-X", "OWNER-NAME", "USER-ID"]) expect(out).not.toContain(secret);
  });
  it("falls back for an unknown family", () => {
    expect(recipePageHtml({ ...recipe, tier: "citrus" }, opts)).toContain("recipe-fresh-en.png");
  });
});

describe("goneHtml", () => {
  it("is a noindex page in the language asked", () => {
    expect(goneHtml({ lang: "en", stylesheet: "/s.css" })).toContain("not shared any more");
    const g = goneHtml({ lang: "ar", stylesheet: "/s.css" });
    expect(g).toContain('dir="rtl"');
    expect(g).toContain("noindex");
  });
  it("says to try again when loading failed", () => {
    expect(goneHtml({ lang: "en", stylesheet: "/s.css", failed: true })).toContain("could not be loaded");
  });
});

describe("helpers", () => {
  it("paths and escaping", () => {
    expect(recipePath("ar", "عود-abcdef")).toBe("/ar/r/%D8%B9%D9%88%D8%AF-abcdef");
    expect(esc(`<a href="x">'&`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;");
  });
});
