import { describe, it, expect } from "vitest";
import { fold, searchGuides, readingMinutes } from "./search";
import { GUIDES } from "./guides";

describe("library search", () => {
  it("folds Arabic spelling variants and Latin accents", () => {
    expect(fold("أُسُس")).toBe(fold("اسس"));
    expect(fold("إيثانول")).toBe(fold("ايثانول"));
    expect(fold("مكتبة")).toBe(fold("مكتبه"));
    expect(fold("مبنى")).toBe(fold("مبني"));
    expect(fold("ـعطـر")).toBe("عطر");
    expect(fold("Crème")).toBe("creme");
  });

  it("finds guides by any word, in either language", () => {
    expect(searchGuides(GUIDES, "en", "tare").map((g) => g.slug)).toContain("at-the-bench");
    expect(searchGuides(GUIDES, "en", "sillage clothing").map((g) => g.slug)).toContain("longevity-projection-sillage");
    expect(searchGuides(GUIDES, "ar", "الايثانول").length).toBeGreaterThan(0); // typed without hamza
    expect(searchGuides(GUIDES, "en", "")).toHaveLength(GUIDES.length);
    expect(searchGuides(GUIDES, "en", "zzzz-nothing")).toEqual([]);
  });

  it("estimates reading time", () => {
    for (const g of GUIDES) expect(readingMinutes(g.en)).toBeGreaterThanOrEqual(1);
  });
});
