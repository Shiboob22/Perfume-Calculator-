// Plan display data for the Bench and the upgrade sheet (Bench SaaS round).
// The limits themselves live in the `plans` table (0031) and are read through
// src/lib/entitlements.js; this file holds only what is shown.
//
// Pro's prices (owner, 2026-11-21). No payment provider is connected, so
// nothing is charged: the page shows them and Pro still opens the trial.
// USD for the world, EGP for Arabic readers and sellers who price in EGP.
export const PRICES = Object.freeze({
  USD: Object.freeze({ monthly: 7, yearly: 59 }),
  EGP: Object.freeze({ monthly: 149, yearly: 1199 }),
});

// Yearly offers (owner, 2026-11-21). Founding members: the first 100, 40 % off
// for as long as they stay; set `open: false` once the 100 are taken (nothing
// counts them until payments exist). Ramadan and Eid: 30 % off between the
// dates. When both run, the lower price shows.
export const OFFERS = Object.freeze([
  Object.freeze({ id: "founding", open: true, seats: 100, yearly: Object.freeze({ USD: 35, EGP: 699 }) }),
  Object.freeze({ id: "ramadan", from: "2027-02-01", to: "2027-03-15", yearly: Object.freeze({ USD: 41, EGP: 839 }) }),
]);

/** The currency a reader sees: EGP for Arabic or a seller pricing in EGP, else USD. */
export const priceCurrency = ({ locale, currency } = {}) => (currency === "EGP" || locale === "ar" ? "EGP" : "USD");

/** Yearly price per month, rounded to the cent (59 / 12 = 4.92). */
export const yearlyPerMonth = (cur = "USD") => Math.round((PRICES[cur].yearly / 12) * 100) / 100;

/** What paying yearly saves against twelve months, in whole per cent. */
export const yearlySavingPct = (cur = "USD") => Math.round((1 - PRICES[cur].yearly / (PRICES[cur].monthly * 12)) * 100);

/** The yearly offer running on `today` (YYYY-MM-DD), the lowest if several, or null. */
export function activeOffer(cur = "USD", today = new Date().toISOString().slice(0, 10), offers = OFFERS) {
  const live = offers.filter((o) => o.open !== false && (!o.from || today >= o.from) && (!o.to || today <= o.to));
  if (!live.length) return null;
  const best = live.reduce((a, b) => (b.yearly[cur] < a.yearly[cur] ? b : a));
  return { id: best.id, yearly: best.yearly[cur], seats: best.seats ?? null, to: best.to ?? null, pct: Math.round((1 - best.yearly[cur] / PRICES[cur].yearly) * 100) };
}

/** "$7.50" / "$9" in the page's locale, Western digits. */
export function priceText(amount, locale = "en", currency = "USD") {
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-US", {
    style: "currency", currency, minimumFractionDigits: Number.isInteger(amount) ? 0 : 2, maximumFractionDigits: 2,
  }).format(amount);
}

/** The running yearly offer as one line: founding members, or Ramadan and Eid with its end date. `t` is the page's translate. */
export function offerText(offer, t, locale, cur) {
  const price = priceText(offer.yearly, locale, cur);
  if (offer.id === "ramadan") {
    const date = new Date(`${offer.to}T12:00:00Z`).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB", { day: "numeric", month: "long", numberingSystem: "latn", timeZone: "UTC" });
    return t("plan.offer.ramadan", { price, date });
  }
  return t("plan.offer.founding", { price, seats: offer.seats });
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
// Phase 0), so both columns tick them. Saved formulas too: Free could save
// as many as Pro before this round, so it keeps that (0034).
export const COMPARE_ROWS = Object.freeze([
  { key: "bench", free: "yes", pro: "yes" },
  { key: "presets", free: "yes", pro: "yes" },
  { key: "ingredients", free: { limit: "ingredients" }, pro: "unlimited" },
  { key: "formulas", free: "yes", pro: "yes" },
  { key: "rest", free: "lastBatches", pro: "fullHistory" },
  { key: "reminders", free: "no", pro: "yes" },
  { key: "cost", free: "no", pro: "yes" },
  { key: "label", free: "yes", pro: "yes" },
  { key: "share", free: "yes", pro: "yes" },
]);
