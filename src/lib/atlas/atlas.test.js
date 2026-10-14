import { describe, expect, it } from "vitest";
import { EMPTY_FILTERS, PAGE_SIZE, MAX_PAGE, isEmpty, pageCount, parseFilters, toParams, toRpc } from "./filters";
import { ENTITY_KINDS, entityHref, fragranceHref, parseAtlasPath, termName } from "./entities";
import { BAND_GEOMETRY, hasPyramid, layout, pyramidBands } from "./pyramid";
import { contributionPayload, splitList } from "./contribute";

describe("filters", () => {
  it("reads a clean query and ignores junk", () => {
    expect(parseFilters("?q=%20oud%20&family=woody&house=Creed&from=2000&to=2010&page=3")).toEqual({ ...EMPTY_FILTERS, q: "oud", family: "woody", house: "Creed", from: 2000, to: 2010, page: 3 });
    expect(parseFilters("?family=citrus&from=abc&to=99999&page=-2")).toEqual(EMPTY_FILTERS);
    expect(parseFilters("?page=501").page).toBe(1);
    expect(parseFilters(`?page=${MAX_PAGE}`).page).toBe(MAX_PAGE);
    expect(parseFilters(undefined)).toEqual(EMPTY_FILTERS);
  });
  it("puts the years in order and caps long text", () => {
    expect(parseFilters("?from=2010&to=2000")).toMatchObject({ from: 2000, to: 2010 });
    expect(parseFilters(`?q=${"x".repeat(300)}`).q).toHaveLength(120);
  });
  it("round-trips through the URL, leaving out what is blank", () => {
    const f = { ...EMPTY_FILTERS, q: "aventus", note: "Bergamot", from: 2010, page: 2 };
    expect(toParams(f).toString()).toBe("q=aventus&note=Bergamot&from=2010&page=2");
    expect(parseFilters(toParams(f))).toEqual(f);
    expect(toParams(EMPTY_FILTERS).toString()).toBe("");
  });
  it("builds the function arguments with the page offset", () => {
    expect(toRpc({ ...EMPTY_FILTERS, q: "oud", page: 3 })).toEqual({
      p_q: "oud", p_note: null, p_family: null, p_house: null, p_accord: null, p_perfumer: null, p_year_from: null, p_year_to: null,
      p_limit: PAGE_SIZE, p_offset: 2 * PAGE_SIZE,
    });
    expect(toRpc({ ...EMPTY_FILTERS, from: 0 }).p_year_from).toBe(0);
  });
  it("knows when nothing narrows the search, and counts pages", () => {
    expect(isEmpty({ ...EMPTY_FILTERS, page: 4 })).toBe(true);
    expect(isEmpty({ ...EMPTY_FILTERS, accord: "woody" })).toBe(false);
    expect([0, 1, 24, 25, 49, 50, 1e9].map((n) => pageCount(n))).toEqual([1, 1, 1, 2, 3, 3, MAX_PAGE]);
  });
});

describe("addresses", () => {
  const id = "8d25dfe5-827b-4733-bc38-a0dbe9c9b210";
  it("reads each Atlas path", () => {
    expect(parseAtlasPath("/atlas")).toEqual({ view: "search" });
    expect(parseAtlasPath("/atlas/")).toEqual({ view: "search" });
    expect(parseAtlasPath("/atlas/browse")).toEqual({ view: "browse" });
    expect(parseAtlasPath("/atlas/contribute")).toEqual({ view: "contribute" });
    expect(parseAtlasPath("/atlas/review")).toEqual({ view: "review" });
    expect(parseAtlasPath(`/atlas/fragrance/${id}`)).toEqual({ view: "fragrance", id });
    expect(parseAtlasPath("/atlas/house/Yves%20Rocher")).toEqual({ view: "entity", kind: "house", key: "yves rocher" });
  });
  it("sends anything malformed to the search", () => {
    for (const bad of ["/atlas/fragrance/nope", "/atlas/fragrance", "/atlas/house", "/atlas/planet/x", "/atlas/house/%E0%A4%A"]) expect(parseAtlasPath(bad)).toEqual({ view: "search" });
  });
  it("builds links that parse back", () => {
    for (const kind of ENTITY_KINDS) expect(parseAtlasPath(entityHref(kind, "Pink Pepper"))).toEqual({ view: "entity", kind, key: "pink pepper" });
    expect(parseAtlasPath(fragranceHref(id)).id).toBe(id);
    expect(entityHref("note", "A/B")).toBe("/atlas/note/a%2Fb");
  });
  it("uses the Arabic name only in Arabic, and only when there is one", () => {
    const terms = [{ kind: "note", key: "bergamot", ar: "برغموت" }];
    expect(termName(terms, "note", "Bergamot", "ar", "Bergamot")).toBe("برغموت");
    expect(termName(terms, "note", "Bergamot", "en", "Bergamot")).toBe("Bergamot");
    expect(termName(terms, "note", "Lemon", "ar", "Lemon")).toBe("Lemon");
    expect(termName(undefined, "house", "x", "ar")).toBe("x");
  });
});

describe("pyramid", () => {
  const f = { top_notes: ["Lemon", " Bergamot ", "Lemon"], middle_notes: [], base_notes: ["Cedar", "", null] };
  it("keeps the non-empty layers, top first, trimmed and without repeats", () => {
    expect(pyramidBands(f)).toEqual([{ layer: "top", notes: ["Lemon", "Bergamot"] }, { layer: "base", notes: ["Cedar"] }]);
    expect(pyramidBands({})).toEqual([]);
    expect(hasPyramid({})).toBe(false);
    expect(hasPyramid(f)).toBe(true);
  });
  it("makes the top thin and bright, the base wide and deep", () => {
    expect(BAND_GEOMETRY.top.width).toBeLessThan(BAND_GEOMETRY.heart.width);
    expect(BAND_GEOMETRY.heart.width).toBeLessThan(BAND_GEOMETRY.base.width);
    expect(BAND_GEOMETRY.top.opacity).toBeGreaterThan(BAND_GEOMETRY.base.opacity);
    expect(BAND_GEOMETRY.top.height).toBeLessThan(BAND_GEOMETRY.base.height);
  });
  it("stacks the bands to fill the figure exactly", () => {
    const rows = layout(pyramidBands({ top_notes: ["a"], middle_notes: ["b"], base_notes: ["c"] }));
    expect(rows.map((r) => r.layer)).toEqual(["top", "heart", "base"]);
    expect(rows[0].y).toBe(0);
    expect(rows[2].y + rows[2].height).toBeCloseTo(100);
    expect(rows[1].y).toBeCloseTo(rows[0].height);
    expect(layout([])).toEqual([]);
  });
});

describe("contribution", () => {
  const now = new Date(2026, 9, 14);
  const ok = { name: "  Oud   Nights ", brand: "House", tier: "woody", year: "2020", gender: "unisex", country: "Egypt", top: "Saffron, Lemon\nsaffron", heart: "", base: "Oud; Amber", accords: "Woody, Amber", perfumers: "A, B" };
  it("splits lists on commas, semicolons, new lines and Arabic commas, without repeats", () => {
    expect(splitList("a, b\nc;d،e, A", 10)).toEqual(["a", "b", "c", "d", "e"]);
    expect(splitList("a,b,c,d", 2)).toEqual(["a", "b"]);
    expect(splitList(" , ,", 5)).toEqual([]);
    expect(splitList("x".repeat(80), 5)[0]).toHaveLength(60);
  });
  it("builds the payload the function takes", () => {
    const { payload } = contributionPayload(ok, now);
    expect(payload).toMatchObject({ name: "Oud Nights", brand: "House", tier: "woody", year: 2020, gender: "unisex", country: "Egypt" });
    expect(payload.top_notes).toEqual(["Saffron", "Lemon"]);
    expect(payload.base_notes).toEqual(["Oud", "Amber"]);
    expect(payload.middle_notes).toEqual([]);
  });
  it("names every bad field", () => {
    expect(contributionPayload({ ...ok, name: " ", tier: "citrus", year: "1500", gender: "robot", country: "x".repeat(61) }, now).errors).toEqual(["name", "tier", "year", "gender", "country"]);
    expect(contributionPayload({ ...ok, year: "2028" }, now).errors).toEqual(["year"]);
    expect(contributionPayload({ ...ok, year: "2027" }, now).payload.year).toBe(2027);
  });
  it("takes a name and a family alone", () => {
    expect(contributionPayload({ name: "Plain", tier: "floral" }, now).payload).toMatchObject({ name: "Plain", brand: null, year: null, gender: null, country: null, accords: [] });
  });
});
