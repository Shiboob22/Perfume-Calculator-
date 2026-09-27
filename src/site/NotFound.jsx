import React from "react";
import { Link } from "react-router-dom";
import { COLORS } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import { localePath } from "./meta";

export default function NotFound() {
  const { t, locale } = useI18n();
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-16">
      <h1 className="font-serif italic text-5xl mb-4" style={{ color: COLORS.forestDeep }}>{t("site.notFound.title")}</h1>
      <Link to={localePath(locale, "/")} className="underline underline-offset-4" style={{ color: COLORS.amber }}>{t("site.notFound.home")}</Link>
    </div>
  );
}
