import { describe, it, expect } from "vitest";
import { formatMoney } from "./money";

describe("formatMoney", () => {
  it("uses the locale's currency format when a code is known", () => {
    expect(formatMoney(1234.5, "USD", { locale: "en" })).toBe("$1,234.50");
    expect(formatMoney(1234.5, "EUR", { locale: "en" })).toContain("1,234.50");
  });
  it("shows a plain two-decimal figure without a currency", () => {
    expect(formatMoney(12.345)).toBe("12.35");
    expect(formatMoney(3, "")).toBe("3.00");
    expect(formatMoney(3, "eur")).toBe("3.00");
  });
  it("falls back for an unknown code and for non-numbers", () => {
    expect(formatMoney(5, "ZZZ", { locale: "en" })).toMatch(/5\.00/);
    expect(formatMoney(NaN, "USD")).toBe("—");
  });
  it("keeps Western digits unless Arabic-Indic ones are chosen", () => {
    expect(formatMoney(12, "USD", { locale: "ar", digits: "latn" })).toMatch(/12/);
    expect(formatMoney(12, "USD", { locale: "ar", digits: "arab" })).toMatch(/١٢/);
  });
});
