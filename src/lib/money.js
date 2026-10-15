// Money for the seller layer. With a currency code, the locale's own currency
// format (symbol and position); without one, the plain two-decimal figure the
// rest of the calculator shows. `digits` is the app's numbering-system setting.
import { fmt2 } from "./calc";

export function formatMoney(value, currency, { locale = "en", digits = "latn" } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  if (!/^[A-Z]{3}$/.test(currency || "")) return fmt2(n);
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency, numberingSystem: digits }).format(n);
  } catch {
    return fmt2(n); // an unknown code is shown as a plain figure, never an error
  }
}
