import { describe, expect, it } from "vitest";
import { LABEL_SIZES, customSize, labelFields, perSheet, typeSizes } from "./labels";
import { createTranslator } from "../i18n/core";
import en from "../i18n/messages/en";
import ar from "../i18n/messages/ar";

const t = createTranslator("en", { en, ar });
const batch = { fragrance_name: "Oud Wood", concentration_pct: 25, total_ml: 100, blend_date: "2026-10-02",
  oil_g: 23.75, ethanol_g: 60.75, actual_oil_g: null, actual_ethanol_g: null };

describe("labelFields", () => {
  it("uses the handbook's label fields and the target weights", () => {
    const { name, fields } = labelFields(batch, { t });
    expect(name).toBe("Oud Wood");
    expect(Object.fromEntries(fields)).toEqual({
      Concentration: "25%", "Bottle size": "100 mL", Date: "2026-10-02",
      "Oil weight": "23.75 g", "Alcohol weight": "60.75 g", "Total weight": "84.50 g",
    });
  });

  it("prefers the weights actually poured, and adds the lot when given", () => {
    const { fields } = labelFields({ ...batch, actual_oil_g: 23.8, actual_ethanol_g: 60.7 }, { t, lot: " L-12 " });
    const f = Object.fromEntries(fields);
    expect(f["Oil weight"]).toBe("23.80 g");
    expect(f["Total weight"]).toBe("84.50 g");
    expect(f["Oil lot / batch"]).toBe("L-12");
  });

  it("names an untitled batch", () => {
    expect(labelFields({ ...batch, fragrance_name: "" }, { t }).name).toBe(en.bench.untitled);
  });
});

describe("typeSizes", () => {
  it("fits the name and every line inside the label height", () => {
    for (const size of Object.values(LABEL_SIZES)) {
      const { name, line } = typeSizes(size, 7);
      expect(4 + name * 1.1 + 1 + 7 * line * 1.35).toBeLessThanOrEqual(size.h + 0.01);
    }
    expect(typeSizes({ w: 90, h: 130 }, 6)).toEqual({ name: 6, line: 3.2 });
  });
});

describe("sizes", () => {
  it("tiles each preset on A4", () => {
    expect(perSheet(LABEL_SIZES.small)).toEqual({ cols: 3, rows: 8, total: 24 });
    expect(perSheet(LABEL_SIZES.medium)).toEqual({ cols: 2, rows: 6, total: 12 });
    expect(perSheet(LABEL_SIZES.large)).toEqual({ cols: 2, rows: 5, total: 10 });
  });

  it("accepts custom sizes that print on A4 only", () => {
    expect(customSize("60", "35")).toEqual({ w: 60, h: 35 });
    expect(customSize(10, 35)).toBeNull();
    expect(customSize(200, 35)).toBeNull();
    expect(customSize("x", 35)).toBeNull();
  });
});
