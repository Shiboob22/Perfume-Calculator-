import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { SiteFooter, SiteHeader, LangButton } from "../components/SiteChrome";
import { COLORS } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import { useRoomFlags } from "../lib/useRoomFlags";
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
  const flags = useRoomFlags();
  const { path } = parsePath(pathname);
  const other = locale === "ar" ? "en" : "ar";
  const to = (p) => localePath(locale, p);

  const active = path.startsWith("/library") ? "guides" : path.startsWith("/pricing") ? "pricing" : undefined;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: COLORS.paper, color: COLORS.ink }}>
      <SiteHeader zone="site" active={active} {...flags} language={
        <LangButton as={Link} to={localePath(other, path)} lang={other} hrefLang={other} title={t("site.nav.languageLabel")} aria-label={t("site.nav.languageLabel")}>
          {t("site.rooms.langShort")}
        </LangButton>
      } />

      <main className="flex-1 w-full">{children}</main>

      <SiteFooter switchTo={(l) => <Link to={localePath(l, path)} lang={l} hrefLang={l} className="inline-flex items-center min-h-[44px]">{l === "ar" ? "العربية" : "English"}</Link>} links={<>
        <Link to={to("/privacy")} className="hover:underline underline-offset-4 min-h-[24px]">{t("site.nav.privacy")}</Link>
        <Link to={to("/terms")} className="hover:underline underline-offset-4 min-h-[24px]">{t("site.nav.terms")}</Link>
      </>} />
    </div>
  );
}
