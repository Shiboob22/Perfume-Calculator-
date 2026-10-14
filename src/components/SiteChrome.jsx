import React from "react";
import { Link } from "react-router-dom";
import { BrandMark } from "./FlaconMark";
import FlaconMark from "./FlaconMark";
import ThemeToggle from "./ThemeToggle";
import { IconBalance, IconBook, IconFlacon, IconFlameTriangle, IconNotebook, IconSeal } from "./icons";
import { COLORS } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";

// Header and footer shared by the public site and the app. No Supabase or
// app imports: public pages are prerendered with it. `zone` says which side
// of the /app line we are on — links that cross it are full page loads.
const site = (locale, p) => (locale === "ar" ? `/ar${p === "/" ? "" : p}` : p);

function NavLink({ to, cross, active, icon: I, children }) {
  const style = { color: active ? COLORS.forest : COLORS.ink, borderBottom: `1px solid ${active ? COLORS.forest : "transparent"}` };
  const cls = "inline-flex items-center gap-2 min-h-[44px] text-sm whitespace-nowrap hover:opacity-80";
  const body = <><I size={18} /><span>{children}</span></>;
  return cross
    ? <a href={to} className={cls} style={style} aria-current={active ? "page" : undefined}>{body}</a>
    : <Link to={to} className={cls} style={style} aria-current={active ? "page" : undefined}>{body}</Link>;
}

/**
 * @param {{ zone: "site" | "app", active?: "guides"|"calculator"|"journal"|"pricing"|"wardrobe", wardrobe?: boolean, language: React.ReactNode, extra?: React.ReactNode }} p
 */
export function SiteHeader({ zone, active, language, extra, wardrobe = false }) {
  const { t, locale } = useI18n();
  const inApp = zone === "app";
  return (
    <header className="w-full" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
      <div className="max-w-[1280px] mx-auto px-4 sm:px-8 lg:px-14 py-3 flex flex-wrap items-center gap-x-8 gap-y-1">
        {inApp
          ? <a href={site(locale, "/")} aria-label={t("site.nav.home")} className="me-auto"><BrandMark brand={t("brand")} sub={t("brandTagline")} signature={t("brandSignature")} /></a>
          : <Link to={site(locale, "/")} aria-label={t("site.nav.home")} className="me-auto"><BrandMark brand={t("brand")} sub={t("brandTagline")} signature={t("brandSignature")} /></Link>}
        <nav aria-label={t("site.nav.main")} className="flex items-center gap-x-6 gap-y-1 flex-wrap -mx-1 px-1">
          <NavLink to={site(locale, "/library")} cross={inApp} active={active === "guides"} icon={IconBook}>{t("site.nav.guides")}</NavLink>
          <NavLink to="/bench" cross={!inApp} active={active === "calculator"} icon={IconBalance}>{t("site.nav.calculator")}</NavLink>
          <NavLink to="/bench/journal" cross={!inApp} active={active === "journal"} icon={IconNotebook}>{t("site.nav.journal")}</NavLink>
          {wardrobe && <NavLink to="/wardrobe" cross={!inApp} active={active === "wardrobe"} icon={IconFlacon}>{t("site.nav.wardrobe")}</NavLink>}
          <NavLink to={site(locale, "/pricing")} cross={inApp} active={active === "pricing"} icon={IconSeal}>{t("site.nav.pricing")}</NavLink>
          <span aria-hidden="true" className="self-stretch my-3" style={{ borderInlineStart: `1px solid ${COLORS.line}` }} />
          {language}
          <ThemeToggle />
          {extra}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ links }) {
  const { t } = useI18n();
  return (
    <footer className="w-full mt-16" style={{ background: COLORS.inkBand, color: COLORS.onInk }}>
      <div className="max-w-[1280px] mx-auto px-4 sm:px-8 lg:px-14 py-12 grid gap-8 md:grid-cols-[1.4fr_1fr]">
        <div className="flex gap-4 items-start">
          <FlaconMark size={40} color={COLORS.onInk} />
          <p className="font-serif italic text-lg leading-relaxed max-w-[34em]">{t("site.footer.line")}</p>
        </div>
        <div className="flex flex-col gap-3 text-sm">
          <p className="flex gap-2 items-start"><IconFlameTriangle size={18} className="mt-0.5" />{t("site.footer.safety")}</p>
          <p style={{ opacity: 0.85 }}>{t("site.footer.credit")}</p>
          {links && <div className="flex flex-wrap gap-x-5 gap-y-1">{links}</div>}
          <p style={{ opacity: 0.7 }}>{t("site.footer.rights")}</p>
        </div>
      </div>
    </footer>
  );
}
