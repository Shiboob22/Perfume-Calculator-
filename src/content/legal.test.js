import { describe, expect, it } from "vitest";
import { LEGAL, LEGAL_PAGES } from "./legal";
import { headFor, headHtml, publicPaths } from "../site/meta";

describe("legal pages", () => {
  it.each(LEGAL_PAGES)("%s has the same sections in English and Arabic", (page) => {
    const { en, ar } = LEGAL[page];
    expect(ar.sections.map((s) => s.id)).toEqual(en.sections.map((s) => s.id));
    en.sections.forEach((s, i) => expect(ar.sections[i].p).toHaveLength(s.p.length));
  });

  it.each(LEGAL_PAGES)("%s is published in both languages", (page) => {
    expect(publicPaths()).toEqual(expect.arrayContaining([`/${page}`, `/ar/${page}`]));
  });

  it.each(LEGAL_PAGES)("%s stays out of search while it is a draft", (page) => {
    const head = headFor(`/${page}`);
    expect(head.noindex).toBe(LEGAL[page].draft);
    expect(headHtml(head).includes('name="robots" content="noindex"')).toBe(LEGAL[page].draft);
  });

  it("other pages are indexable", () => {
    expect(headFor("/pricing").noindex).toBe(false);
    expect(headHtml(headFor("/pricing"))).not.toContain("noindex");
  });
});
