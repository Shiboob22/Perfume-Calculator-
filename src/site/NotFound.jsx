import React from "react";
import { Link } from "../motion";
import { COLORS } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import { localePath } from "./meta";
import { Photo, useImagery } from "./Imagery";

export default function NotFound() {
  const { t, locale } = useI18n();
  const imagery = useImagery();
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-16">
      <h1 className="font-serif italic text-5xl mb-4" style={{ color: COLORS.forestDeep }}>{t("site.notFound.title")}</h1>
      <Link to={localePath(locale, "/")} className="underline underline-offset-4" style={{ color: COLORS.actionText }}>{t("site.notFound.home")}</Link>
      {imagery && <Photo name="shelf-wall" ratio="16 / 9" sizes="(min-width: 768px) 48rem, 100vw" className="mt-10" />}
    </div>
  );
}
