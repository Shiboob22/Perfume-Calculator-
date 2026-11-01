import { SHOP } from "../../lib/shop/config";

/** "1,170.00 EGP" / "١٬١٧٠٫٠٠ ج.م." with Western digits in both languages. */
export function money(amount, locale) {
  const whole = Number.isInteger(amount);
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-EG", {
    style: "currency", currency: SHOP.currency, minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2,
  }).format(amount);
}
