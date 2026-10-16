import React from "react";
import { useI18n } from "../i18n/I18nProvider";
import { LangButton } from "./SiteChrome";

// The header's language button: the other language's own script in a 44 px
// frame (Design System, Nav). The accessible name is spoken in that language
// (lang), not the current one, so a screen reader uses the right voice.
export default function LanguageToggle({ className = "" }) {
  const { locale, setLocale, t } = useI18n();
  const other = locale === "ar" ? "en" : "ar";
  return (
    <LangButton onClick={() => setLocale(other)} title={t("language.switchLabel")} aria-label={t("language.switchLabel")} lang={other} className={className}>
      {t("site.rooms.langShort")}
    </LangButton>
  );
}
