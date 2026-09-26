import React from "react";
import { COLORS } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";

// Shows the other language in its own script, the usual convention.
export default function LanguageToggle({ className = "" }) {
  const { locale, setLocale, t } = useI18n();
  const other = locale === "ar" ? "en" : "ar";
  return (
    <button
      type="button"
      onClick={() => setLocale(other)}
      aria-label={t("language.switchLabel")}
      lang={other}
      className={`text-xs font-mono hover:underline ${className}`}
      style={{ color: COLORS.inkSoft }}
    >
      {t("language.switchTo")}
    </button>
  );
}
