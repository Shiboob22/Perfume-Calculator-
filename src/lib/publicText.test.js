import { describe, it, expect } from "vitest";
import { cleanText, textLang, recipeSlug } from "./publicText";

describe("cleanText", () => {
  it("removes tags but keeps the words", () => {
    expect(cleanText("<script>alert(1)</script>Smooth by <b>day 21</b>", 500)).toBe("alert(1)Smooth by day 21");
    expect(cleanText('<img src=x onerror="steal()">', 500)).toBeNull();
  });
  it("keeps text that only looks like markup", () => {
    expect(cleanText("I <3 this, 2 < 3", 500)).toBe("I <3 this, 2 < 3");
  });
  it("drops controls, bidi overrides and zero-width spaces; keeps RLM and ZWNJ", () => {
    expect(cleanText("a\u0000b\u202Ec\u2066d\u2069\u200Be\uFEFF", 500)).toBe("abcde");
    expect(cleanText("عطر\u200F 20\u200C", 500)).toBe("عطر\u200F 20\u200C");
  });
  it("tidies whitespace and blank lines", () => {
    expect(cleanText("  one\t\t two \r\n\r\n\r\n\r\nthree  ", 500)).toBe("one two\n\nthree");
  });
  it("cuts at max code points, not UTF-16 units", () => {
    expect(cleanText("🌹".repeat(5), 3)).toBe("🌹🌹🌹");
    expect(cleanText("abc def", 4)).toBe("abc");
  });
  it("is null when nothing is left", () => {
    expect(cleanText("", 10)).toBeNull();
    expect(cleanText(null, 10)).toBeNull();
    expect(cleanText("   \n ", 10)).toBeNull();
  });
  it("normalises to NFC", () => {
    expect(cleanText("e\u0301", 10)).toBe("é");
  });
});

describe("textLang", () => {
  it("follows the script most of the text is in", () => {
    expect(textLang("عطر خشبي ناعم بعد 21 يوم")).toBe("ar");
    expect(textLang("Smooth after 21 days, عود")).toBe("en");
    expect(textLang("")).toBe("en");
    expect(textLang(undefined)).toBe("en");
  });
});

describe("recipeSlug", () => {
  const bytes = () => Uint8Array.from([0, 1, 25, 26, 35, 36]);

  it("name in any script plus 6 random characters", () => {
    expect(recipeSlug("Oud Nights", bytes)).toBe("oud-nights-abz09a");
    expect(recipeSlug("عود الليل", bytes)).toBe("عود-الليل-abz09a");
    expect(recipeSlug("عِطْر", bytes)).toBe("عِطْر-abz09a");
  });
  it("matches the database check (no spaces or URL characters)", () => {
    const slug = recipeSlug(` "Rose" / <Musk> #2 ? 100% `, bytes);
    expect(slug).toBe("rose-musk-2-100-abz09a");
    expect(slug).toMatch(/-[a-z0-9]{6}$/);
    expect(slug).not.toMatch(/[\s/?#%<>"'\\]/);
  });
  it("caps the name part and never ends it with a dash", () => {
    const slug = recipeSlug("a".repeat(59) + " b", bytes);
    expect(slug).toBe("a".repeat(59) + "-abz09a");
  });
  it("falls back to 'recipe' for a name with no letters", () => {
    expect(recipeSlug("!!!", bytes)).toBe("recipe-abz09a");
    expect(recipeSlug(null, bytes)).toBe("recipe-abz09a");
  });
});
