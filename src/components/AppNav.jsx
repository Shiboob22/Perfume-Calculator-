import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Link, TOKENS, useExit } from "../motion";
import { COLORS, SHAPE } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import { tabPath } from "../routes";
import LanguageToggle from "./LanguageToggle";
import ThemeToggle from "./ThemeToggle";
import MotionSetting from "./MotionSetting";
import SoundSetting from "./SoundSetting";
import { useProfile } from "../lib/useProfile";
import { useReadyToBottle } from "./orders/OrdersCard";
import { useMinWidth } from "../lib/useMinWidth";
import {
  IconBalance, IconBook, IconBookmark, IconCart, IconChat, IconClose, IconCompass, IconCrosshair, IconDrop,
  IconExit, IconFlacon, IconMore, IconNotebook, IconPerson, IconScaleDrop, IconSeal, IconSearch, IconShelf, IconHourglass, IconSteps,
} from "./icons";

// The app's own navigation. Phones get one bar at the bottom, in reach of
// the thumb at the bench: four rooms and More, which opens a sheet with the
// rest (other tabs, flagged rooms, guides, pricing, account and settings).
// Wider screens get one framed row: the same four, the rooms from 1024 px,
// and More as a drop-down; account and settings are the header's AccountMenu
// (audit H3: the site menu and a second tab grid used to sit on top of each other).

const site = (locale, p) => (locale === "ar" ? `/ar${p}` : p);

/**
 * Every place the app can go, in menu order. `label` is the short name on the
 * bar and the wide row; `title` is the page's own title, used in the More menus;
 * `group` sorts the More menus into rooms, tools, and plan and help (audit M12).
 */
function destinations({ t, locale, flags }) {
  const all = [
    { id: "search", label: t("app.tabs.search"), icon: IconSearch },
    { id: "calculator", label: t("app.tabs.calculator"), icon: IconBalance },
    flags.nose && { id: "nose", label: t("site.nav.nose"), title: t("nose.title"), group: "rooms", icon: IconDrop },
    { id: "journal", label: t("app.tabs.journal"), icon: IconHourglass },
    { id: "batches", label: t("app.tabs.batches"), title: t("batches.title"), group: "tools", icon: IconNotebook },
    flags.orders && { id: "orders", label: t("orders.title"), group: "tools", icon: IconSteps },
    { id: "selector", label: t("app.tabs.selector"), title: t("selector.title"), group: "tools", icon: IconCompass },
    { id: "inventory", label: t("app.tabs.inventory"), title: t("inventory.title"), group: "tools", icon: IconShelf },
    { id: "ask", label: t("app.tabs.ask"), title: t("chat.title"), group: "tools", icon: IconChat },
    flags.wardrobe && { id: "wardrobe", label: t("site.nav.wardrobe"), title: t("wardrobe.title"), group: "rooms", icon: IconFlacon },
    flags.atlas && { id: "atlas", label: t("site.nav.atlas"), title: t("atlas.title"), group: "rooms", icon: IconCrosshair },
    flags.salon && { id: "salon", label: t("site.nav.salon"), title: t("salon.title"), group: "rooms", icon: IconBookmark },
    flags.shop && { id: "shop", label: t("site.nav.shop"), group: "rooms", icon: IconCart, href: site(locale, "/shop") },
    { id: "guides", label: t("site.nav.guides"), title: t("site.compounding.rooms.library.name"), group: "rooms", icon: IconBook, href: site(locale, "/library") },
    { id: "pricing", label: t("site.nav.pricing"), group: "help", icon: IconSeal, href: site(locale, "/pricing") },
    { id: "account", label: t("account.link"), group: "help", icon: IconPerson, path: "/app/account" },
    // The Bench's tour, once its link has left the Bench (seen, or a batch logged).
    { id: "tour", label: t("tour.again"), group: "help", icon: IconScaleDrop, path: "/bench?tour=1" },
  ];
  return all.filter(Boolean);
}

const GROUPS = ["rooms", "tools", "help"];
/** The More menus' items by group, in menu order, empty groups left out. */
const grouped = (items) => GROUPS.map((g) => [g, items.filter((d) => d.group === g)]).filter(([, list]) => list.length);

// Four on the bar: the bench's daily rooms. The Nose takes the third place
// when it is on; otherwise the Selector does. For a seller ("I sell what I
// blend" in Account) Orders takes that place and the Nose moves to More.
const PRIMARY = (flags) => ["search", "calculator", flags.seller ? "orders" : flags.nose ? "nose" : "selector", "journal"];
// On the wide row from 1024 px, after the four; below that they sit in More.
const ROOMS = ["atlas", "salon", "wardrobe"];

function DueBadge({ count, t, label = "journal.tabBadge" }) {
  if (!count) return null;
  return (
    // Keyed by the count: a new number settles in (kx-settle, motion M3) instead of swapping.
    <span key={count} data-badge={count} className="kx-settle inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 text-[10px] font-semibold leading-none"
      style={{ background: COLORS.amber, color: COLORS.onAmber }}>
      <span aria-hidden="true">{count}</span>
      <span className="sr-only">{t(label, { count })}</span>
    </span>
  );
}

/**
 * @param {{ active: string | null, tabs: string[], dueCount: number, flags: Record<string, boolean>,
 *   onSignOut: () => void }} p
 */
export default function AppNav({ active, dueCount, flags: baseFlags, onSignOut }) {
  const { t, locale } = useI18n();
  const { profile } = useProfile() ?? {};
  const seller = Boolean(baseFlags.orders && profile?.sells);
  const flags = { ...baseFlags, seller };
  const readyCount = useReadyToBottle(seller);
  const badgeFor = (id) => (id === "journal" ? <DueBadge count={dueCount} t={t} />
    : id === "orders" ? <DueBadge count={readyCount} t={t} label="orders.tabBadge" /> : null);
  const { pathname, search } = useLocation();
  const [open, setOpen] = useState(false);
  const moreRef = useRef(null);
  const all = destinations({ t, locale, flags });
  const primaryIds = PRIMARY(flags);
  const primary = primaryIds.map((id) => all.find((d) => d.id === id)).filter(Boolean);
  const rest = all.filter((d) => !primaryIds.includes(d.id));
  const moreActive = rest.some((d) => d.id === active);
  // The wide row: the same four, then the rooms when there is room, then More (account lives in the header).
  const roomsOnRow = useMinWidth(1024);
  const row = [...primary, ...(roomsOnRow ? rest.filter((d) => ROOMS.includes(d.id)) : [])];
  const rowMore = rest.filter((d) => d.id !== "account" && !row.includes(d));

  // Leaving the page closes the sheet.
  useEffect(() => { setOpen(false); }, [pathname]);

  // The calculator keeps the address's query (a guide's ?size=…&conc=…).
  const barIndex = primary.findIndex((d) => d.id === active);
  const to = (d) => d.path ?? `${tabPath(d.id)}${d.id === "calculator" ? search : ""}`;

  return (
    <>
      {/* Wide screens: one framed row of rooms under the header, More at its end. */}
      <div className="hidden md:block max-w-5xl mx-auto px-8 pt-6">
        <nav aria-label={t("app.tabsLabel")}>
          <ul className="flex" style={{ border: `1px solid ${COLORS.line}` }}>
            {row.map((d) => {
              const on = active === d.id;
              const I = d.icon;
              return (
                <li key={d.id} className="flex-1 min-w-0" style={{ borderInlineEnd: `1px solid ${COLORS.line}` }}>
                  <Dest d={d} to={to(d)} current={on}
                    className={`mo-press relative w-full min-h-[48px] px-3 inline-flex items-center justify-center gap-2 text-sm whitespace-nowrap transition-colors ${SHAPE.control}`}
                    style={{ color: on ? COLORS.paper : COLORS.inkSoft }}>
                    {/* The active tab's plate is its own element so a route change can slide it (src/motion). */}
                    <span aria-hidden="true" data-mo-ind="tab" data-on={on ? "" : undefined} className="absolute inset-0" style={{ background: on ? COLORS.ink : "transparent" }} />
                    <I size={18} accent={on ? COLORS.oil : undefined} className="relative" />
                    <span className="relative truncate">{d.label}</span>
                    {/* In the corner, out of the flow: a badge that arrives with the data moves nothing (motion M3). */}
                    {badgeFor(d.id) && <span className="absolute top-1 end-1">{badgeFor(d.id)}</span>}
                  </Dest>
                </li>
              );
            })}
            <li className="flex-1 min-w-0">
              <DropMenu label={t("app.more")} icon={IconMore} current={rowMore.some((d) => d.id === active)} data-more>
                {(close) => grouped(rowMore).map(([g, list], i) => (
                  <section key={g} aria-labelledby={`more-${g}`} className={i ? "mt-1 pt-1" : undefined} style={i ? { borderTop: `1px solid ${COLORS.line}` } : undefined}>
                    <h3 id={`more-${g}`} className="px-4 pt-2 pb-1 text-[12px] uppercase tracking-[0.15em] rtl:tracking-normal" style={{ color: COLORS.dim }}>{t(`app.groups.${g}`)}</h3>
                    <ul>
                      {list.map((d) => {
                        const I = d.icon;
                        const on = active === d.id;
                        return (
                          <li key={d.id}>
                            <Dest d={d} to={to(d)} current={on} onClick={close}
                              className="w-full min-h-[44px] px-4 flex items-center gap-3 text-sm"
                              style={{ background: on ? COLORS.sand : "transparent", color: COLORS.ink, fontWeight: on ? 600 : 400 }}>
                              <I size={18} /><span>{d.title ?? d.label}</span>
                            </Dest>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </DropMenu>
            </li>
          </ul>
        </nav>
      </div>

      {/* Phones: one bar at the bottom. */}
      <nav aria-label={t("app.barLabel")} data-mo-chrome="bar" className="md:hidden fixed bottom-0 inset-x-0 z-40"
        style={{ background: COLORS.card, borderTop: `1px solid ${COLORS.line}`, paddingBottom: "env(safe-area-inset-bottom)" }}>
        {/* The room you are in: one ink rule on the bar's top edge that slides from room to room. */}
        <span aria-hidden="true" data-mo-ind="bar" data-on={barIndex >= 0 ? "" : undefined}
          className="kx-bar-ind pointer-events-none absolute top-0 start-0 h-[2px] px-4"
          style={{ width: `${100 / (primary.length + 1)}%`, "--i": Math.max(barIndex, 0), opacity: barIndex >= 0 ? 1 : 0 }}>
          <span className="block h-full" style={{ background: COLORS.ink }} />
        </span>
        <ul className="grid grid-cols-5">
          {primary.map((d) => (
            <li key={d.id}>
              <BarButton d={d} to={to(d)} on={active === d.id}
                badge={badgeFor(d.id)} />
            </li>
          ))}
          <li>
            <BarButton ref={moreRef} d={{ label: t("app.more"), icon: IconMore }} on={open || moreActive}
              current={moreActive} expanded={open} onClick={() => setOpen(true)} />
          </li>
        </ul>
      </nav>

      {open && (
        <MoreSheet items={rest} active={active} to={to} onGo={() => setOpen(false)} onSignOut={onSignOut}
          onClose={() => { setOpen(false); moreRef.current?.focus(); }} />
      )}
    </>
  );
}

/** A destination: an in-app Link, or a plain link to the public site. */
function Dest({ d, to, current, onClick, className, style, children }) {
  const props = { className, style, onClick, "aria-current": current ? "page" : undefined, "data-tab": d.id };
  return d.href ? <a href={d.href} {...props}>{children}</a> : <Link to={to} {...props}>{children}</Link>;
}

const BarButton = React.forwardRef(function BarButton({ d, to, on, current, expanded, onClick, badge }, ref) {
  const I = d.icon;
  const isMore = expanded !== undefined;
  const Tag = isMore ? "button" : Dest;
  const own = isMore
    ? { ref, type: "button", onClick, "aria-current": current ? "page" : undefined, "aria-haspopup": "dialog", "aria-expanded": expanded }
    : { d, to, current: on };
  return (
    <Tag {...own}
      className="mo-press relative w-full min-h-[60px] pt-2 pb-1.5 flex flex-col items-center justify-center gap-1 text-[11px] leading-none"
      style={{ color: on ? COLORS.ink : COLORS.inkSoft, fontWeight: on ? 600 : 400 }}>
      {/* The room you are in: a tinted plate under the icon (the bar's sliding rule marks it too). */}
      <span className="relative inline-flex items-center justify-center w-12 h-7 transition-colors duration-fast"
        style={{ background: on ? COLORS.sand : "transparent" }}>
        <I size={22} />
        {badge && <span className="absolute -top-1 -end-1">{badge}</span>}
      </span>
      <span className="max-w-full truncate px-0.5">{d.label}</span>
    </Tag>
  );
});

function MoreSheet({ items, active, to, onGo, onSignOut, onClose: close }) {
  const { t } = useI18n();
  const titleId = useId();
  const closeRef = useRef(null);
  // Closing plays the sheet's exit first (with the motion layer on; at once without it).
  const { leaving, leave } = useExit(TOKENS.duration.fast);
  const onClose = useCallback(() => leave(close), [leave, close]);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; };
  }, [onClose]);

  return (
    <div data-leaving={leaving ? "" : undefined} className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
      <div aria-hidden="true" className="mo-sheet-scrim absolute inset-0 motion-safe:animate-[sheetFade_var(--dur-base)_var(--ease-out)]"
        style={{ background: "rgba(0,0,0,.45)" }} onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby={titleId}
        className="mo-sheet-panel relative max-h-[85vh] overflow-y-auto motion-safe:animate-[sheetUp_var(--dur-base)_var(--ease-out)]"
        style={{ background: COLORS.paper, borderTop: `1px solid ${COLORS.line}`, paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 id={titleId} className="font-serif italic text-2xl" style={{ color: COLORS.ink }}>{t("app.more")}</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={t("app.moreClose")}
            className="inline-flex items-center justify-center w-11 h-11" style={{ color: COLORS.ink }}>
            <IconClose size={22} />
          </button>
        </div>
        {grouped(items).map(([g, list]) => (
          <section key={g} aria-labelledby={`${titleId}-${g}`} className="mx-4 mb-3">
            <h3 id={`${titleId}-${g}`} className="mb-1.5 text-[12px] uppercase tracking-[0.15em] rtl:tracking-normal" style={{ color: COLORS.dim }}>{t(`app.groups.${g}`)}</h3>
            <ul className="grid grid-cols-3 gap-px" style={{ background: COLORS.line, border: `1px solid ${COLORS.line}` }}>
              {list.map((d) => {
                const I = d.icon;
                const on = active === d.id;
                return (
                  <li key={d.id}>
                    <Dest d={d} to={to(d)} current={on} onClick={onGo}
                      className="w-full aspect-[1/0.9] flex flex-col items-center justify-center gap-2 px-1 text-sm text-center"
                      style={{ background: on ? COLORS.sand : COLORS.card, color: COLORS.ink, fontWeight: on ? 600 : 400 }}>
                      <I size={28} />
                      <span className="leading-tight">{d.title ?? d.label}</span>
                    </Dest>
                  </li>
                );
              })}
              {/* Fill the last row so the hairline grid stays whole. */}
              {Array.from({ length: (3 - (list.length % 3)) % 3 }, (_, k) => (
                <li key={`fill-${k}`} aria-hidden="true" style={{ background: COLORS.card }} />
              ))}
            </ul>
          </section>
        ))}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-4">
          <LanguageToggle className="min-h-[44px] text-sm" />
          <ThemeToggle />
          <MotionSetting compact className="basis-full order-last pt-2" />
          <SoundSetting compact className="basis-full order-last pt-2" />
          <button type="button" onClick={onSignOut}
            className="ms-auto inline-flex items-center gap-2 min-h-[44px] text-sm" style={{ color: COLORS.inkSoft }}>
            <IconExit size={18} />{t("app.signOut")}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * A drop-down under its button (wide screens): More on the row, and the
 * header's account menu. Esc, a tap outside or leaving the page closes it.
 */
function DropMenu({ label, icon: I, current = false, bare = false, children, ...rest }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const box = useRef(null);
  const btn = useRef(null);
  const { pathname } = useLocation();
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const down = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    const key = (e) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", down); document.removeEventListener("keydown", key); };
  }, [open]);
  const on = current || open;
  return (
    <div ref={box} className="relative h-full" {...rest}>
      <button ref={btn} type="button" aria-expanded={open} aria-controls={id} aria-current={current ? "page" : undefined}
        onClick={() => setOpen((v) => !v)}
        className={bare
          ? "inline-flex items-center gap-2 min-h-[44px] text-sm hover:underline underline-offset-4"
          : `mo-press relative w-full h-full min-h-[48px] px-3 inline-flex items-center justify-center gap-2 text-sm whitespace-nowrap ${SHAPE.control}`}
        style={bare ? { color: current ? COLORS.forest : COLORS.inkSoft } : { color: on ? COLORS.ink : COLORS.inkSoft, background: on ? COLORS.sand : "transparent", fontWeight: current ? 600 : 400 }}>
        <I size={18} /><span>{label}</span>
      </button>
      <div id={id} hidden={!open} className="absolute top-full end-0 z-50 mt-1 min-w-[15rem] py-2"
        style={{ background: COLORS.paper, border: `1px solid ${COLORS.line}`, boxShadow: "0 8px 24px rgba(0,0,0,.12)" }}>
        {children(() => setOpen(false))}
      </div>
    </div>
  );
}

/** The header's menu on wide screens: Account, language, theme, motion and Sign out (phones have them in More). */
export function AccountMenu({ current, onSignOut }) {
  const { t } = useI18n();
  return (
    <DropMenu label={t("app.accountMenu")} icon={IconPerson} current={current} bare data-account-menu>
      {(close) => (
        <div className="flex flex-col">
          <Link to="/app/account" onClick={close} aria-current={current ? "page" : undefined}
            className="min-h-[44px] px-4 flex items-center gap-3 text-sm" style={{ color: COLORS.ink, fontWeight: current ? 600 : 400 }}>
            <IconPerson size={18} />{t("account.link")}
          </Link>
          <div className="px-4 py-2 flex flex-wrap items-center gap-x-5 gap-y-1" style={{ borderTop: `1px solid ${COLORS.line}` }}>
            <LanguageToggle className="min-h-[44px] text-sm" />
            <ThemeToggle />
          </div>
          <MotionSetting compact className="px-4 pb-2" />
          <SoundSetting compact className="px-4 pb-2" />
          <button type="button" onClick={() => { close(); onSignOut(); }}
            className="min-h-[44px] px-4 flex items-center gap-3 text-sm text-start" style={{ color: COLORS.inkSoft, borderTop: `1px solid ${COLORS.line}` }}>
            <IconExit size={18} />{t("app.signOut")}
          </button>
        </div>
      )}
    </DropMenu>
  );
}
