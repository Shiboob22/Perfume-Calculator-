import React from "react";
import { COLORS } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";

// Western (123) or Arabic-Indic (١٢٣) digits in text. Arabic only; the
// calculator's figures stay Western either way, to match the scale.
export default function DigitToggle({ className = "" }) {
  const { locale, digits, setDigits, t } = useI18n();
  if (locale !== "ar") return null;
  const next = digits === "arab" ? "latn" : "arab";
  return (
    <button
      type="button"
      onClick={() => setDigits(next)}
      title={t("settings.digitsLabel")}
      className={`text-xs font-mono hover:underline ${className}`}
      style={{ color: COLORS.inkSoft }}
    >
      {t(next === "arab" ? "settings.useArabicIndic" : "settings.useWestern")}
    </button>
  );
}
