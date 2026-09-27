import { describe, it, expect } from "vitest";
import { createTranslator, dirOf, matchLocale } from "./core";

const catalogs = {
  en: {
    nav: { search: "Search" },
    greet: "Hello, {name}",
    batches: { one: "{count} batch", other: "{count} batches" },
    onlyEn: "English only",
  },
  ar: {
    nav: { search: "بحث" },
    greet: "مرحبًا، {name}",
    batches: {
      zero: "لا دفعات",
      one: "دفعة واحدة",
      two: "دفعتان",
      few: "{count} دفعات",
      many: "{count} دفعة",
      other: "{count} دفعة",
    },
  },
};

describe("createTranslator", () => {
  it("looks up nested keys", () => {
    expect(createTranslator("en", catalogs)("nav.search")).toBe("Search");
    expect(createTranslator("ar", catalogs)("nav.search")).toBe("بحث");
  });

  it("interpolates variables and leaves unknown placeholders visible", () => {
    const t = createTranslator("en", catalogs);
    expect(t("greet", { name: "Mona" })).toBe("Hello, Mona");
    expect(t("greet")).toBe("Hello, {name}");
  });

  it("falls back to English, then to the key", () => {
    const t = createTranslator("ar", catalogs);
    expect(t("onlyEn")).toBe("English only");
    expect(t("missing.key")).toBe("missing.key");
  });

  it("picks English plural forms", () => {
    const t = createTranslator("en", catalogs);
    expect(t("batches", { count: 1 })).toBe("1 batch");
    expect(t("batches", { count: 3 })).toBe("3 batches");
    expect(t("batches", { count: 1200 })).toBe("1,200 batches");
  });

  it("picks all six Arabic plural forms", () => {
    const t = createTranslator("ar", catalogs);
    expect(t("batches", { count: 0 })).toBe("لا دفعات");
    expect(t("batches", { count: 1 })).toBe("دفعة واحدة");
    expect(t("batches", { count: 2 })).toBe("دفعتان");
    expect(t("batches", { count: 5 })).toBe("5 دفعات");
    expect(t("batches", { count: 11 })).toBe("11 دفعة");
    expect(t("batches", { count: 100 })).toBe("100 دفعة");
  });

  it("uses Western digits in Arabic", () => {
    expect(createTranslator("ar", catalogs)("batches", { count: 25 })).toBe("25 دفعة");
  });

  it("returns the key for a plural message without a count", () => {
    expect(createTranslator("en", catalogs)("batches")).toBe("batches");
  });
});

describe("locale helpers", () => {
  it("maps locales to text direction", () => {
    expect(dirOf("ar")).toBe("rtl");
    expect(dirOf("en")).toBe("ltr");
  });

  it("matches the first supported browser language", () => {
    expect(matchLocale(["ar-EG", "en-US"])).toBe("ar");
    expect(matchLocale(["fr-FR", "en-GB"])).toBe("en");
    expect(matchLocale(["de"])).toBe("en");
    expect(matchLocale(undefined)).toBe("en");
  });
});

describe("digit setting", () => {
  it("uses Arabic-Indic digits when asked", () => {
    const t = createTranslator("ar", catalogs, "en", { numberingSystem: "arab" });
    expect(t("batches", { count: 25 })).toBe("٢٥ دفعة");
  });
});
