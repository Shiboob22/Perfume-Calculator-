import React from "react";
import { COLORS } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";

// Shows the other language in its own script, the usual convention. The
// visible word is the accessible name, spoken in that language (lang); an
// aria-label in the current language would be read with the wrong voice.
export default function LanguageToggle({ className = "" }) {
  const { locale, setLocale, t } = useI18n();
  const other = locale === "ar" ? "en" : "ar";
  return (
    <button
      type="button"
      onClick={() => setLocale(other)}
      title={t("language.switchLabel")}
      lang={other}
      className={`text-xs font-mono hover:underline min-h-[24px] ${className}`}
      style={{ color: COLORS.inkSoft }}
    >
      {t("language.switchTo")}
    </button>
  );
}
