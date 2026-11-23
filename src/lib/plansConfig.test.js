import { describe, it, expect } from "vitest";
import { PRICES, OFFERS, priceCurrency, yearlyPerMonth, yearlySavingPct, activeOffer, priceText, COMPARE_ROWS, compareCell } from "./plansConfig";
import { FEATURES } from "./entitlements";
import en from "../i18n/messages/en.js";
import ar from "../i18n/messages/ar.js";

describe("Pro prices and offers", () => {
  it("shows EGP to Arabic readers and EGP sellers, USD to everyone else", () => {
    expect(priceCurrency({ locale: "ar" })).toBe("EGP");
    expect(priceCurrency({ locale: "en", currency: "EGP" })).toBe("EGP");
    expect(priceCurrency({ locale: "en", currency: "SAR" })).toBe("USD");
    expect(priceCurrency()).toBe("USD");
  });
  it("works out the yearly price per month and the saving", () => {
    expect(yearlyPerMonth("USD")).toBe(4.92);
    expect(yearlySavingPct("USD")).toBe(30);
    expect(yearlySavingPct("EGP")).toBe(33);
  });
  it("runs the founding offer, and Ramadan instead during its dates", () => {
    expect(activeOffer("USD", "2026-11-21")).toMatchObject({ id: "founding", yearly: 35, seats: 100, pct: 41 });
    expect(activeOffer("EGP", "2027-02-10")).toMatchObject({ id: "ramadan", yearly: 839 });
    expect(activeOffer("USD", "2027-03-16")).toMatchObject({ id: "founding" });
  });
  it("shows Ramadan only inside its dates once the founding places are gone", () => {
    const later = OFFERS.map((o) => (o.id === "founding" ? { ...o, open: false } : o));
    expect(activeOffer("USD", "2027-01-31", later)).toBeNull();
    expect(activeOffer("USD", "2027-02-01", later)).toMatchObject({ id: "ramadan", yearly: 41, pct: 31, to: "2027-03-15" });
    expect(activeOffer("EGP", "2027-03-15", later)).toMatchObject({ id: "ramadan", yearly: 839, pct: 30 });
    expect(activeOffer("USD", "2027-03-16", later)).toBeNull();
  });
  it("keeps every offer below the normal yearly price", () => {
    for (const o of OFFERS) for (const cur of Object.keys(PRICES)) expect(o.yearly[cur]).toBeLessThan(PRICES[cur].yearly);
  });
  it("writes prices with Western digits in both languages", () => {
    expect(priceText(7, "en", "USD")).toBe("$7");
    expect(priceText(149, "ar", "EGP")).toMatch(/149/);
  });
});

describe("Free and Pro compared (one table for the sheet and the Pricing page)", () => {
  it("covers every plan feature, and Pro has each one", () => {
    for (const f of FEATURES) {
      const row = COMPARE_ROWS.find((r) => r.features?.includes(f));
      expect(row, f).toBeTruthy();
      expect(row.pro, f).not.toBe("no");
    }
  });
  it("names every row and cell in English and Arabic", () => {
    for (const m of [en, ar]) {
      for (const r of COMPARE_ROWS) {
        expect(typeof m.upgrade.rows[r.key], r.key).toBe("string");
        for (const v of [r.free, r.pro]) if (!["batchCap", "ingredientCap"].includes(v)) expect(typeof m.upgrade.cells[v], v).toBe("string");
      }
    }
  });
  it("reads Free's limits into the cells", () => {
    const t = (key, vars = {}) => `${key}:${JSON.stringify(vars)}`;
    const free = { batches: 25, ingredients: 3, journal: 3 };
    expect(compareCell("batchCap", t, free)).toBe('upgrade.cells.batchCap:{"cap":25}');
    expect(compareCell("ingredientCap", t, free)).toBe("3");
    expect(compareCell("lastBatches", t, free)).toBe('upgrade.cells.lastBatches:{"n":3}');
  });
});
