import { describe, expect, it } from "vitest";
import { LABEL_SIZES, customSize, labelFields, perSheet, typeSizes, compactSizes, bottleText } from "./labels";
import { createTranslator } from "../i18n/core";
import en from "../i18n/messages/en";
import ar from "../i18n/messages/ar";

const t = createTranslator("en", { en, ar });
const batch = { fragrance_name: "Oud Wood", concentration_pct: 25, total_ml: 100, blend_date: "2026-10-02",
  oil_g: 23.75, ethanol_g: 60.75, actual_oil_g: null, actual_ethanol_g: null };

describe("bottleText and the stored lot", () => {
  it("prints the bottle as entered, else the total by basis", () => {
    expect(bottleText({ amount: "3.4", unit: "floz", total_ml: 100.55 })).toBe("3.4 fl oz");
    expect(bottleText({ amount: null, basis: "weight", total_g: "50", total_ml: 58 })).toBe("50 g");
    expect(bottleText({ basis: "volume", total_ml: "100" })).toBe("100 mL");
  });
  it("uses the stored lot unless one is typed", () => {
    const b = { fragrance_name: "x", concentration_pct: 25, total_ml: 100, oil_g: 23.75, ethanol_g: 60.75, lot: "L-9" };
    const tt = (k) => k;
    expect(labelFields(b, { t: tt }).fields).toContainEqual(["bench.label.lot", "L-9"]);
    expect(labelFields(b, { t: tt, lot: "" }).fields.map(([k]) => k)).not.toContain("bench.label.lot");
  });
});

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
    for (const size of Object.values(LABEL_SIZES).filter((s) => !s.roll)) {
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

  it("prints the D30 roll as one 40 × 12 mm label per page, name plus one line", () => {
    expect(LABEL_SIZES.d30).toMatchObject({ w: 40, h: 12, roll: true });
    expect(perSheet(LABEL_SIZES.d30)).toEqual({ cols: 1, rows: 1, total: 1 });
    const { name, line } = compactSizes(LABEL_SIZES.d30);
    expect(2 + name * 1.1 + 0.5 + line * 1.35).toBeLessThanOrEqual(12.01);
    const c = Object.fromEntries(labelFields(batch, { t, lot: "L-1" }).compact);
    expect(Object.keys(c)).toEqual(["Concentration", "Bottle size", "Date", "Oil lot / batch"]);
  });

  it("accepts custom sizes that print on A4 only", () => {
    expect(customSize("60", "35")).toEqual({ w: 60, h: 35 });
    expect(customSize(10, 35)).toBeNull();
    expect(customSize(200, 35)).toBeNull();
    expect(customSize("x", 35)).toBeNull();
  });
});
