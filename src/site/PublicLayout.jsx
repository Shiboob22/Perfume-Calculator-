import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import FlaconMark from "../components/FlaconMark";
import { COLORS } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import { headFor, localePath, parsePath } from "./meta";

// Keeps <title> and the description in step on client-side navigation. The
// full head (canonical, hreflang, Open Graph) is written by the prerender.
function usePageHead() {
  const { pathname } = useLocation();
  useEffect(() => {
    const head = headFor(pathname);
    if (!head) return;
    document.title = head.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", head.description);
  }, [pathname]);
}

export default function PublicLayout({ children }) {
  const { t, locale } = useI18n();
  const { pathname } = useLocation();
  usePageHead();
  const { path } = parsePath(pathname);
  const other = locale === "ar" ? "en" : "ar";
  const to = (p) => localePath(locale, p);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: COLORS.paper, color: COLORS.ink }}>
      <header className="w-full max-w-5xl mx-auto px-4 sm:px-8 pt-6 pb-4 flex items-center gap-4 flex-wrap">
        <Link to={to("/")} className="flex items-center gap-3 me-auto" aria-label={t("site.nav.home")}>
          <FlaconMark size={26} />
          <span className="font-serif italic text-xl" style={{ color: COLORS.forestDeep }}>{t("brand")}</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link to={to("/guides")} className="hover:underline underline-offset-4" style={{ color: COLORS.ink }}>{t("site.nav.guides")}</Link>
          <Link to={to("/pricing")} className="hover:underline underline-offset-4" style={{ color: COLORS.ink }}>{t("site.nav.pricing")}</Link>
          <Link to={localePath(other, path)} lang={other} hrefLang={other} title={t("site.nav.languageLabel")}
            className="hover:underline underline-offset-4" style={{ color: COLORS.inkSoft }}>
            {t("site.nav.language")}
          </Link>
          <a href="/app" className="px-3 py-1.5 rounded-lg text-sm font-semibold"
            style={{ background: COLORS.amber, color: COLORS.onAmber }}>
            {t("site.nav.openApp")}
          </a>
        </nav>
      </header>

      <main className="flex-1 w-full">{children}</main>

      <footer className="w-full max-w-5xl mx-auto px-4 sm:px-8 py-10 mt-16 text-sm flex flex-wrap gap-x-6 gap-y-2"
        style={{ borderTop: `1px solid ${COLORS.line}`, color: COLORS.inkSoft }}>
        <span className="font-serif italic" style={{ color: COLORS.forestDeep }}>{t("brand")}</span>
        <Link to={to("/guides")} className="hover:underline">{t("site.nav.guides")}</Link>
        <Link to={to("/pricing")} className="hover:underline">{t("site.nav.pricing")}</Link>
        <Link to={localePath(other, path)} lang={other} className="hover:underline">{t("site.nav.language")}</Link>
        <Link to={to("/privacy")} className="hover:underline">{t("site.nav.privacy")}</Link>
        <Link to={to("/terms")} className="hover:underline">{t("site.nav.terms")}</Link>
        <span className="ms-auto">{t("site.footer.by")} · {t("site.footer.rights")}</span>
      </footer>
    </div>
  );
}
