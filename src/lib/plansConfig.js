// Plan display data for the Bench and the upgrade sheet (Bench SaaS round).
// The limits themselves live in the `plans` table (0031) and are read through
// src/lib/entitlements.js; this file holds only what is shown.
//
// PRICES ARE PLACEHOLDERS from the prototype, not decided (owner to set):
// no payment provider is connected, nothing is charged.
export const PRICES = Object.freeze({ currency: "USD", monthly: 9, yearly: 90 });

/** Yearly price per month, rounded to the cent (90 / 12 = 7.50). */
export const yearlyPerMonth = (p = PRICES) => Math.round((p.yearly / 12) * 100) / 100;

/** "$7.50" / "$9" in the page's locale, Western digits. */
export function priceText(amount, locale = "en", currency = PRICES.currency) {
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-US", {
    style: "currency", currency, minimumFractionDigits: Number.isInteger(amount) ? 0 : 2, maximumFractionDigits: 2,
  }).format(amount);
}

// The cost card's chips (prototype values).
export const COST_BOTTLES = Object.freeze([10, 30, 50, 100]);
export const COST_MARGINS = Object.freeze([40, 50, 60, 70]);
export const COST_DEFAULTS = Object.freeze({ bottleMl: 50, margin: 60 });
// The prices the Bench tour's Pro preview shows where the user typed none
// (prototype's example state: oil per g, ethanol per L, packaging per bottle).
// Examples only, in the user's currency; never saved.
export const COST_SAMPLE = Object.freeze({ oilPrice: 8, ethPrice: 150, pack: 45 });

// The upgrade sheet's comparison, row by row (prototype plan.rows). Values
// are message keys under plan.compare, or numbers/limits read from the
// entitlements. Label PNG and share links are Free on every plan (owner,
// Phase 0), so both columns tick them.
export const COMPARE_ROWS = Object.freeze([
  { key: "bench", free: "yes", pro: "yes" },
  { key: "presets", free: "yes", pro: "yes" },
  { key: "ingredients", free: { limit: "ingredients" }, pro: "unlimited" },
  { key: "formulas", free: { limit: "formulas" }, pro: "unlimited" },
  { key: "rest", free: "lastBatches", pro: "fullHistory" },
  { key: "reminders", free: "no", pro: "yes" },
  { key: "cost", free: "no", pro: "yes" },
  { key: "label", free: "yes", pro: "yes" },
  { key: "share", free: "yes", pro: "yes" },
]);
