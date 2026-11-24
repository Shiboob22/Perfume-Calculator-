// Money is labelled with a code, never converted.
export const CURRENCIES = ["USD", "EUR", "GBP", "SAR", "AED", "KWD", "QAR", "EGP", "TRY"];

/** How a currency code is shown: the code in English ("EGP"), the local sign in Arabic ("ج.م."). */
export function currencyLabel(code, locale) {
  if (!code || locale !== "ar") return code ?? "";
  try {
    const part = new Intl.NumberFormat("ar-EG", { style: "currency", currency: code }).formatToParts(0).find((p) => p.type === "currency");
    return part ? part.value.replace(/[‎‏]/g, "").trim() : code;
  } catch {
    return code;
  }
}
