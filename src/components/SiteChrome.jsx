import React, { useState } from "react";
import { Link } from "react-router-dom";
import KyphiraLogo from "./kx/KyphiraLogo";
import ThemeToggle from "./ThemeToggle";
import { IconArrow } from "./icons";
import { COLORS } from "../lib/theme";
import { roman } from "../lib/catalogue";
import { useI18n } from "../i18n/I18nProvider";

// Header and footer shared by the public site and the app (Design System IV,
// "Nav"). No Supabase or app imports: public pages are prerendered with it.
// `zone` says which side of the /app line we are on; links that cross it are
// full page loads. Rooms that are behind a flag appear only when it is on.
const site = (locale, p) => (locale === "ar" ? `/ar${p === "/" ? "" : p}` : p);

const PAD = "px-4 sm:px-6 lg:px-12"; // 16 px on a phone, 48 px at 1440

// id, path, `lib` = a public page (prefixed with the locale), `flag` = the
// prop that switches it on, `active` = the ids a page can pass for it.
const ROOMS = [
  { id: "bench", href: "/bench", active: ["calculator", "journal", "bench"] },
  { id: "wardrobe", href: "/wardrobe", flag: "wardrobe", active: ["wardrobe"] },
  { id: "library", href: "/library", lib: true, active: ["guides", "library"] },
  { id: "atlas", href: "/atlas", flag: "atlas", active: ["atlas"] },
  { id: "salon", href: "/salon", flag: "salon", active: ["salon"] },
  { id: "nose", href: "/nose", flag: "nose", active: ["nose"] },
];

/** The rooms that are open, with their Roman numeral and address. */
export function openRooms(flags = {}) {
  return ROOMS.filter((r) => !r.flag || flags[r.flag]).map((r, i) => ({ ...r, num: roman(ROOMS.indexOf(r) + 1), i }));
}

function RoomLink({ room, inApp, locale, className, style, children, onClick, current }) {
  const props = { className, style, onClick, "aria-current": current ? "page" : undefined };
  const cross = room.lib ? inApp : !inApp;
  const href = room.lib ? site(locale, room.href) : room.href;
  return cross ? <a href={href} {...props}>{children}</a> : <Link to={href} {...props}>{children}</Link>;
}

const BTN = "inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-3 text-sm rounded-sm border hover:border-[color:var(--c-dim)]";

/** The language switch of the header: the other language's own script, in a 44 px frame. */
export function LangButton({ as: Tag = "button", className = "", ...rest }) {
  return <Tag className={`${BTN} ${className}`} style={{ borderColor: COLORS.line, color: COLORS.ink, background: "transparent" }} {...rest} />;
}

/**
 * @param {{ zone: "site" | "app", active?: string, wardrobe?: boolean, atlas?: boolean, salon?: boolean, nose?: boolean, language: React.ReactNode, extra?: React.ReactNode }} p
 */
export default function SiteHeader({ zone, active, language, extra, wardrobe = false, atlas = false, salon = false, nose = false }) {
  const { t, locale } = useI18n();
  const inApp = zone === "app";
  const [menu, setMenu] = useState(false);
  const rooms = openRooms({ wardrobe, atlas, salon, nose });
  const isActive = (r) => r.active.includes(active);
  const logo = (
    <span className="inline-flex items-center min-h-[44px]" style={{ color: COLORS.ink }}>
      <KyphiraLogo form="wordmark" height={16} title={t("brand")} />
    </span>
  );
  return (
    <header className="w-full relative z-20" style={{ background: COLORS.paper, borderBottom: `1px solid ${COLORS.line}` }}>
      <div className={`${PAD} h-[72px] flex items-center justify-between gap-6`}>
        {inApp
          ? <a href={site(locale, "/")} aria-label={t("site.nav.home")}>{logo}</a>
          : <Link to={site(locale, "/")} aria-label={t("site.nav.home")}>{logo}</Link>}

        <nav aria-label={t("site.nav.main")} className="hidden lg:flex gap-1">
          {rooms.map((r) => (
            <RoomLink key={r.id} room={r} inApp={inApp} locale={locale} current={isActive(r)}
              className="relative flex items-center min-h-[44px] px-3 text-sm hover:text-[color:var(--c-ink)]"
              style={{ color: isActive(r) ? COLORS.ink : COLORS.inkSoft }}>
              {t(`site.rooms.${r.id}.name`)}
              {isActive(r) && <span aria-hidden="true" className="absolute inset-x-3 -bottom-[14px] h-px" style={{ background: COLORS.amber }} />}
            </RoomLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {inApp && <span className="hidden lg:flex items-center gap-2">{extra}<ThemeToggle /></span>}
          {language}
          {!inApp && (
            <span className="hidden lg:flex items-center gap-2">
              <a href="/app" className="flex items-center min-h-[44px] px-3 text-sm hover:text-[color:var(--c-action-text)]" style={{ color: COLORS.ink }}>{t("site.rooms.signIn")}</a>
              <Link to={site(locale, "/pricing")} aria-current={active === "pricing" ? "page" : undefined}
                className="on-resin flex items-center min-h-[44px] px-[18px] text-sm font-semibold rounded-sm hover:bg-[color:var(--c-action-hover)]"
                style={{ background: COLORS.amber, color: COLORS.onAmber }}>{t("site.rooms.pro")}</Link>
            </span>
          )}
          {!inApp && (
            <button type="button" className={`lg:hidden ${BTN}`} style={{ borderColor: COLORS.line, color: COLORS.ink }}
              aria-expanded={menu} aria-controls="site-menu" aria-label={t("site.rooms.menu")} onClick={() => setMenu((o) => !o)}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" aria-hidden="true"><path d="M3 6h14M3 10h14M3 14h9" /></svg>
            </button>
          )}
        </div>
      </div>

      {!inApp && menu && (
        <div id="site-menu" className="lg:hidden absolute inset-x-0 top-[72px] px-4 pt-2 pb-6 flex flex-col"
          style={{ background: COLORS.card, borderBottom: `1px solid ${COLORS.line}` }}>
          <nav aria-label={t("site.nav.main")}>
            {rooms.map((r) => (
              <RoomLink key={r.id} room={r} inApp={inApp} locale={locale} current={isActive(r)} onClick={() => setMenu(false)}
                className="flex items-baseline gap-4 min-h-[52px] py-3 px-1" style={{ borderBottom: `1px solid ${COLORS.line}`, color: COLORS.ink }}>
                <span dir="ltr" className="font-serif text-sm w-8" style={{ color: COLORS.actionText }}>{r.num}</span>
                <span className="font-serif text-[22px]">{t(`site.rooms.${r.id}.name`)}</span>
              </RoomLink>
            ))}
          </nav>
          <div className="flex gap-2 mt-5">
            <a href="/app" className="flex-1 flex items-center justify-center min-h-[48px] rounded-sm border" style={{ borderColor: COLORS.line, color: COLORS.ink }}>{t("site.rooms.signIn")}</a>
            <Link to={site(locale, "/pricing")} onClick={() => setMenu(false)} className="on-resin flex-1 flex items-center justify-center min-h-[48px] rounded-sm font-semibold"
              style={{ background: COLORS.amber, color: COLORS.onAmber }}>{t("site.rooms.pro")}</Link>
          </div>
        </div>
      )}
    </header>
  );
}
export { SiteHeader };

export function SiteFooter({ links, switchTo }) {
  const { t, locale } = useI18n();
  const tab = (on) => ({ borderBottom: `1px solid ${on ? COLORS.amber : "transparent"}`, color: on ? COLORS.ink : COLORS.inkSoft });
  return (
    <footer className="w-full mt-16 sm:mt-24" style={{ borderTop: `1px solid ${COLORS.line}`, background: COLORS.paper, color: COLORS.ink }}>
      <div className={`${PAD} pt-14 pb-8 flex flex-col gap-14`}>
        <div className="grid gap-12 md:grid-cols-2 items-end">
          <div className="flex items-end gap-6">
            <KyphiraLogo form="symbol" height={96} />
            <p className="font-serif italic text-xl leading-relaxed" style={{ color: COLORS.inkSoft }}>{t("site.rooms.builtIn")}</p>
          </div>
          <div className="flex flex-col gap-3 text-sm" style={{ color: COLORS.inkSoft }}>
            <p>{t("site.footer.line")}</p>
            <p>{t("site.footer.safety")}</p>
            {links && <div className="flex flex-wrap gap-x-5 gap-y-1" style={{ color: COLORS.ink }}>{links}</div>}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 pt-6 text-[13px]" style={{ borderTop: `1px solid ${COLORS.line}`, color: COLORS.inkSoft }}>
          <span>{t("site.footer.rights")}</span>
          {switchTo && (
            <div role="group" aria-label={t("site.rooms.langAria")} className="flex gap-1 text-sm">
              <span className="min-h-[44px] px-3 inline-flex items-center" style={tab(locale === "en")}>
                {locale === "en" ? "English" : switchTo("en")}
              </span>
              <span lang="ar" className="min-h-[44px] px-3 inline-flex items-center" style={tab(locale === "ar")}>
                {locale === "ar" ? "العربية" : switchTo("ar")}
              </span>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
