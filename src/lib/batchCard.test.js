import { describe, expect, it } from "vitest";
import { cardRows, isolate, ltr, safeFileName } from "./batchCard";
import { createTranslator } from "../i18n/core";
import en from "../i18n/messages/en";
import ar from "../i18n/messages/ar";

const CATALOGS = { en, ar };
const batch = {
  fragrance_name: "1 Million", tier: "fresh", blend_date: "2026-09-27", concentration_pct: 20,
  oil_g: 19, oil_ml: 20, ethanol_g: 64.8, ethanol_ml: 80, total_g: 83.8, total_ml: 100,
  oil_type: "Oud Wood.", blended_by: "Sam",
};

describe("cardRows", () => {
  it("translates every label and keeps figures Western", () => {
    const t = createTranslator("ar", CATALOGS, undefined, { numberingSystem: "arab" });
    const rows = cardRows(batch, { t, locale: "ar" });
    expect(rows[0]).toEqual(["الزيت", "19.00 غ  /  20.00 مل"]);
    expect(rows[2]).toEqual(["الإجمالي", "83.80 غ"]);
    expect(rows.map(([label]) => label)).not.toContain("Oil");
  });

  it("isolates user text so it keeps its order in right-to-left lines", () => {
    const t = createTranslator("ar", CATALOGS);
    const rows = Object.fromEntries(cardRows(batch, { t, locale: "ar" }));
    expect(rows["نوع الزيت"]).toBe(isolate("Oud Wood."));
    expect(rows[ar.calc.blendedBy]).toBe(isolate("Sam"));
  });

  it("reads the same in English as before", () => {
    const t = createTranslator("en", CATALOGS);
    const rows = cardRows({ ...batch, actual_oil_g: 19.1, actual_ethanol_g: 64.8 }, { t, locale: "en" });
    expect(rows[0]).toEqual(["Oil", "19.00 g  /  20.00 mL"]);
    expect(rows.find(([l]) => l === "Actual pour")[1]).toBe("19.10 g  /  64.80 g");
    expect(rows.find(([l]) => l === "Actual ratio")[1]).toMatch(/% oil by /);
  });
});

describe("helpers", () => {
  it("wraps text in Unicode isolates", () => {
    expect(isolate("x")).toBe("⁨x⁩");
    expect(ltr("2026-09-27")).toBe("⁦2026-09-27⁩");
  });

  it("names the file in any script", () => {
    expect(safeFileName({ fragrance_name: "عود الليل", blend_date: "2026-09-27" })).toBe("عود-الليل-2026-09-27-card.png");
    expect(safeFileName({ fragrance_name: "Oud Wood" })).toBe("oud-wood-card.png");
    expect(safeFileName({ fragrance_name: "***" })).toBe("batch-card.png");
  });
});
