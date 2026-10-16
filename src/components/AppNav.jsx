import React, { useEffect, useId, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { COLORS, SHAPE } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import { tabPath } from "../routes";
import LanguageToggle from "./LanguageToggle";
import DigitToggle from "./DigitToggle";
import ThemeToggle from "./ThemeToggle";
import {
  IconBalance, IconBook, IconBookmark, IconChat, IconClose, IconCompass, IconCrosshair, IconDrop,
  IconExit, IconFlacon, IconMore, IconNotebook, IconPerson, IconSeal, IconSearch, IconShelf,
} from "./icons";

// The app's own navigation. Phones get one bar at the bottom, in reach of
// the thumb at the bench: four rooms and More, which opens a sheet with the
// rest (other tabs, flagged rooms, guides, pricing, account and settings).
// Wider screens keep the site header and get the tabs as one framed row.

const site = (locale, p) => (locale === "ar" ? `/ar${p}` : p);

/** Every place the app can go, in menu order. `cross` = a full page load to the public site. */
function destinations({ t, locale, flags }) {
  const all = [
    { id: "search", label: t("app.tabs.search"), icon: IconSearch },
    { id: "calculator", label: t("app.tabs.calculator"), icon: IconBalance },
    flags.nose && { id: "nose", label: t("site.nav.nose"), icon: IconDrop },
    { id: "batches", label: t("app.tabs.batches"), icon: IconNotebook },
    { id: "selector", label: t("app.tabs.selector"), icon: IconCompass },
    { id: "inventory", label: t("app.tabs.inventory"), icon: IconShelf },
    { id: "ask", label: t("app.tabs.ask"), icon: IconChat },
    flags.wardrobe && { id: "wardrobe", label: t("site.nav.wardrobe"), icon: IconFlacon },
    flags.atlas && { id: "atlas", label: t("site.nav.atlas"), icon: IconCrosshair },
    flags.salon && { id: "salon", label: t("site.nav.salon"), icon: IconBookmark },
    { id: "guides", label: t("site.nav.guides"), icon: IconBook, href: site(locale, "/library") },
    { id: "pricing", label: t("site.nav.pricing"), icon: IconSeal, href: site(locale, "/pricing") },
    { id: "account", label: t("account.link"), icon: IconPerson, path: "/app/account" },
  ];
  return all.filter(Boolean);
}

// Four on the bar: the bench's daily rooms. The Nose takes the third place
// when it is on; otherwise the Selector does.
const PRIMARY = (flags) => ["search", "calculator", flags.nose ? "nose" : "selector", "batches"];

function DueBadge({ count, t }) {
  if (!count) return null;
  return (
    <span className="inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 text-[10px] font-semibold leading-none"
      style={{ background: COLORS.amber, color: COLORS.onAmber }}>
      <span aria-hidden="true">{count}</span>
      <span className="sr-only">{t("journal.tabBadge", { count })}</span>
    </span>
  );
}

/**
 * @param {{ active: string | null, tabs: string[], dueCount: number, flags: Record<string, boolean>,
 *   onTab: (id: string) => void, onSignOut: () => void }} p
 */
export default function AppNav({ active, tabs, dueCount, flags, onTab, onSignOut }) {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const moreRef = useRef(null);
  const all = destinations({ t, locale, flags });
  const primaryIds = PRIMARY(flags);
  const primary = primaryIds.map((id) => all.find((d) => d.id === id)).filter(Boolean);
  const rest = all.filter((d) => !primaryIds.includes(d.id));
  const moreActive = rest.some((d) => d.id === active);

  // Leaving the page closes the sheet.
  useEffect(() => { setOpen(false); }, [pathname]);

  const go = (d) => {
    setOpen(false);
    if (d.href) { window.location.assign(d.href); return; }
    if (tabs.includes(d.id)) onTab(d.id);
    else navigate(d.path ?? tabPath(d.id));
  };

  return (
    <>
      {/* Wide screens: the tabs as one framed row under the site header. */}
      <div className="hidden md:block max-w-3xl mx-auto px-8 pt-6">
        <nav aria-label={t("app.tabsLabel")}>
          <ul className="flex flex-wrap" style={{ border: `1px solid ${COLORS.line}` }}>
            {tabs.map((id) => {
              const d = all.find((x) => x.id === id);
              const on = active === id;
              const I = d.icon;
              return (
                <li key={id} className="flex-1 min-w-[7.5rem]" style={{ borderInlineEnd: `1px solid ${COLORS.line}` }}>
                  <button type="button" onClick={() => go(d)} aria-current={on ? "page" : undefined}
                    className={`w-full min-h-[48px] px-3 inline-flex items-center justify-center gap-2 text-sm whitespace-nowrap transition-colors ${SHAPE.control}`}
                    style={{ background: on ? COLORS.ink : "transparent", color: on ? COLORS.paper : COLORS.inkSoft }}>
                    <I size={18} accent={on ? COLORS.oil : undefined} />
                    <span>{d.label}</span>
                    {id === "batches" && <DueBadge count={dueCount} t={t} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Phones: one bar at the bottom. */}
      <nav aria-label={t("app.barLabel")} className="md:hidden fixed bottom-0 inset-x-0 z-40"
        style={{ background: COLORS.card, borderTop: `1px solid ${COLORS.line}`, paddingBottom: "env(safe-area-inset-bottom)" }}>
        <ul className="grid grid-cols-5">
          {primary.map((d) => (
            <li key={d.id}>
              <BarButton d={d} on={active === d.id} onClick={() => go(d)}
                badge={d.id === "batches" ? <DueBadge count={dueCount} t={t} /> : null} />
            </li>
          ))}
          <li>
            <BarButton ref={moreRef} d={{ label: t("app.more"), icon: IconMore }} on={open || moreActive}
              current={moreActive} expanded={open} onClick={() => setOpen(true)} />
          </li>
        </ul>
      </nav>

      {open && (
        <MoreSheet items={rest} active={active} onGo={go} onSignOut={onSignOut}
          onClose={() => { setOpen(false); moreRef.current?.focus(); }} />
      )}
    </>
  );
}

const BarButton = React.forwardRef(function BarButton({ d, on, current, expanded, onClick, badge }, ref) {
  const I = d.icon;
  const isMore = expanded !== undefined;
  return (
    <button ref={ref} type="button" onClick={onClick}
      aria-current={!isMore && on ? "page" : current ? "page" : undefined}
      aria-haspopup={isMore ? "dialog" : undefined} aria-expanded={isMore ? expanded : undefined}
      className="relative w-full min-h-[60px] pt-2 pb-1.5 flex flex-col items-center justify-center gap-1 text-[11px] leading-none"
      style={{ color: on ? COLORS.ink : COLORS.inkSoft, fontWeight: on ? 600 : 400 }}>
      {/* The room you are in: an ink rule on the bar's top edge and a tinted plate under the icon. */}
      <span aria-hidden="true" className="absolute top-0 inset-x-4 h-[2px] transition-opacity duration-200"
        style={{ background: COLORS.ink, opacity: on ? 1 : 0 }} />
      <span className="relative inline-flex items-center justify-center w-12 h-7 transition-colors duration-200"
        style={{ background: on ? COLORS.mist : "transparent" }}>
        <I size={22} />
        {badge && <span className="absolute -top-1 -end-1">{badge}</span>}
      </span>
      <span className="max-w-full truncate px-0.5">{d.label}</span>
    </button>
  );
});

function MoreSheet({ items, active, onGo, onSignOut, onClose }) {
  const { t } = useI18n();
  const titleId = useId();
  const closeRef = useRef(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; };
  }, [onClose]);

  return (
    <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
      <div aria-hidden="true" className="absolute inset-0 motion-safe:animate-[sheetFade_.2s_ease-out]"
        style={{ background: "rgba(0,0,0,.45)" }} onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby={titleId}
        className="relative max-h-[85vh] overflow-y-auto motion-safe:animate-[sheetUp_.24s_cubic-bezier(.2,.8,.2,1)]"
        style={{ background: COLORS.paper, borderTop: `1px solid ${COLORS.line}`, paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 id={titleId} className="font-serif italic text-2xl" style={{ color: COLORS.ink }}>{t("app.moreTitle")}</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={t("app.moreClose")}
            className="inline-flex items-center justify-center w-11 h-11" style={{ color: COLORS.ink }}>
            <IconClose size={22} />
          </button>
        </div>
        <ul className="grid grid-cols-3 gap-px mx-4" style={{ background: COLORS.line, border: `1px solid ${COLORS.line}` }}>
          {items.map((d) => {
            const I = d.icon;
            const on = active === d.id;
            return (
              <li key={d.id}>
                <button type="button" onClick={() => onGo(d)} aria-current={on ? "page" : undefined}
                  className="w-full aspect-[1/0.9] flex flex-col items-center justify-center gap-2 px-1 text-sm text-center"
                  style={{ background: on ? COLORS.mist : COLORS.card, color: COLORS.ink, fontWeight: on ? 600 : 400 }}>
                  <I size={28} />
                  <span className="leading-tight">{d.label}</span>
                </button>
              </li>
            );
          })}
          {/* Fill the last row so the hairline grid stays whole. */}
          {Array.from({ length: (3 - (items.length % 3)) % 3 }, (_, i) => (
            <li key={`fill-${i}`} aria-hidden="true" style={{ background: COLORS.card }} />
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-4">
          <LanguageToggle className="min-h-[44px] text-sm" />
          <DigitToggle className="min-h-[44px] text-sm" />
          <ThemeToggle />
          <button type="button" onClick={onSignOut}
            className="ms-auto inline-flex items-center gap-2 min-h-[44px] text-sm" style={{ color: COLORS.inkSoft }}>
            <IconExit size={18} />{t("app.signOut")}
          </button>
        </div>
      </div>
    </div>
  );
}
