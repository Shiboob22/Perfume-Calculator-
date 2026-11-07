import { describe, expect, it } from "vitest";
import { LABEL_SIZES, customSize, labelFields, perSheet, typeSizes, compactLayout, bottleText } from "./labels";
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

  it("fits every field on the D30 roll: name, facts and weights in 12 mm", () => {
    expect(LABEL_SIZES.d30).toMatchObject({ w: 40, h: 12, roll: true });
    expect(perSheet(LABEL_SIZES.d30)).toEqual({ cols: 1, rows: 1, total: 1 });
    const l = compactLayout({ ...batch, lot: "L-12" }, { t }, LABEL_SIZES.d30);
    expect(l.rows[0].segments).toEqual(["25%", "100 mL", "2026-10-02", "Lot L-12"]);
    expect(l.rows[1].segments).toEqual(["Oil 23.75", "Alc 60.75", "Tot 84.50 g"]);
    expect(0.8 * 2 + l.nameSize * 1.1 + l.rows.reduce((h, r) => h + r.size * 1.2, 0)).toBeLessThanOrEqual(12.01);
    for (const r of l.rows) expect(r.size).toBeGreaterThanOrEqual(2.1); // legible when thermally printed
  });

  it("never overflows the D30 label, whatever the name, lot or font width", () => {
    const names = ["", "A", "Oud Wood", "Baccarat Rouge 540 Extrait de Parfum", "Supercalifragilisticexpialidocious-Reserve-Edition",
      "عود وود الملكي الفاخر للغاية من الإصدار الخاص", "Tom Ford Tobacco Vanille Private Blend Winter Collection No. 7", "香水 オードパルファム 限定版 スペシャル"];
    const lots = ["", "L-12", "ABC-2026-10-02-X", "L".repeat(60)];
    const { w, h } = LABEL_SIZES.d30;
    const avail = (w - 3) * 0.97;
    for (const wide of [0.54, 0.6, 0.7]) { // glyph widths in em, up to a wide face
      const em = (txt) => Array.from(txt).length * wide;
      for (const fragrance_name of names) for (const lot of lots) {
        const l = compactLayout({ ...batch, fragrance_name, lot }, { t }, LABEL_SIZES.d30, em);
        const height = 1.6 + l.nameLines.length * l.nameSize * 1.1 + l.rows.reduce((n, r) => n + r.size * 1.2, 0);
        expect(height, `${fragrance_name}/${lot}/${wide}`).toBeLessThanOrEqual(h + 0.01);
        for (const line of l.nameLines) expect(em(line) * l.nameSize).toBeLessThanOrEqual(avail + 0.01);
        for (const r of l.rows) expect(r.segments.reduce((n, sg) => n + em(sg) * r.size, 0) + (r.segments.length - 1)).toBeLessThanOrEqual(avail + 0.01);
        expect(l.nameLines.length).toBeLessThanOrEqual(2);
        expect(l.nameSize).toBeGreaterThanOrEqual(2);
        for (const r of l.rows) expect(r.size).toBeGreaterThanOrEqual(1.6);
      }
    }
  });

  it("wraps a long name to two lines before shrinking it past legibility", () => {
    const long = compactLayout({ ...batch, fragrance_name: "Baccarat Rouge 540 Extrait de Parfum" }, { t }, LABEL_SIZES.d30);
    expect(long.nameLines).toHaveLength(2);
    expect(long.nameLines.join(" ")).toBe("Baccarat Rouge 540 Extrait de Parfum");
    expect(compactLayout(batch, { t }, LABEL_SIZES.d30).nameLines).toEqual(["Oud Wood"]);
  });

  it("keeps every weight and fact; only a lot that cannot fit is clipped", () => {
    const l = compactLayout({ ...batch, lot: "L".repeat(60) }, { t }, LABEL_SIZES.d30);
    expect(l.rows[0].segments.slice(0, 3)).toEqual(["25%", "100 mL", "2026-10-02"]);
    expect(l.rows[0].segments[3].endsWith("…")).toBe(true);
    expect(l.rows[1].segments).toEqual(["Oil 23.75", "Alc 60.75", "Tot 84.50 g"]);
  });

  it("accepts custom sizes that print on A4 only", () => {
    expect(customSize("60", "35")).toEqual({ w: 60, h: 35 });
    expect(customSize(10, 35)).toBeNull();
    expect(customSize(200, 35)).toBeNull();
    expect(customSize("x", 35)).toBeNull();
  });
});
