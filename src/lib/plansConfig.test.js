import { describe, it, expect } from "vitest";
import { PRICES, OFFERS, priceCurrency, yearlyPerMonth, yearlySavingPct, activeOffer, priceText } from "./plansConfig";

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
  it("runs the founding offer, and the lower price when Ramadan overlaps", () => {
    expect(activeOffer("USD", "2026-11-21")).toMatchObject({ id: "founding", yearly: 35, seats: 100, pct: 41 });
    expect(activeOffer("EGP", "2027-02-10")).toMatchObject({ id: "founding", yearly: 699 });
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
