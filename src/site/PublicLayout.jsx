import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Link, PageTransition, Progress } from "../motion";
import { SiteFooter, SiteHeader } from "../components/SiteChrome";
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

  const active = path.startsWith("/library") ? "guides" : path.startsWith("/pricing") ? "pricing" : undefined;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: COLORS.paper, color: COLORS.ink }}>
      <Progress />
      <SiteHeader zone="site" active={active} language={
        <Link to={localePath(other, path)} lang={other} hrefLang={other} title={t("site.nav.languageLabel")}
          className="text-sm min-h-[44px] inline-flex items-center hover:underline underline-offset-4" style={{ color: COLORS.ink }}>
          {t("site.nav.language")}
        </Link>
      } />

      <PageTransition as="main" className="flex-1 w-full">{children}</PageTransition>

      <SiteFooter links={<>
        <Link to={to("/privacy")} className="hover:underline underline-offset-4 min-h-[24px]">{t("site.nav.privacy")}</Link>
        <Link to={to("/terms")} className="hover:underline underline-offset-4 min-h-[24px]">{t("site.nav.terms")}</Link>
      </>} />
    </div>
  );
}
