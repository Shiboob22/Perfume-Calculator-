import React from "react";
import { Link } from "react-router-dom";
import { COLORS } from "../lib/theme";
import { roman } from "../lib/catalogue";
import { useI18n } from "../i18n/I18nProvider";
import { useRoomFlags } from "../lib/useRoomFlags";
import { GUIDES } from "../content/guides";
import { GLOSSARY_ENTRIES } from "../content/glossary";
import { localePath } from "./meta";
import { openRooms } from "../components/SiteChrome";

// The home page below the hero (Design/boards/Homepage.dc.html): the rooms,
// the method and the Pro introduction. Public: no app or Supabase imports.
const PAD = "px-4 sm:px-6 lg:px-12";
const SECTION = "pt-[clamp(72px,8vw,128px)]";
const KICKER = "text-xs uppercase tracking-[0.14em] rtl:tracking-normal rtl:normal-case";
const H2 = "font-serif font-light text-[clamp(36px,4vw,56px)] leading-[1.1] rtl:leading-[1.45] tracking-[-0.01em] rtl:tracking-normal";

function Arrow() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke={COLORS.actionText} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className="rtl:-scale-x-100" aria-hidden="true">
      <path d="M3.5 10h13M11.5 5l5 5-5 5" />
    </svg>
  );
}

export function Rooms() {
  const { t, locale } = useI18n();
  const flags = useRoomFlags();
  const open = new Map(openRooms(flags).map((r) => [r.id, r]));
  const ids = ["bench", "wardrobe", "library", "atlas", "salon", "nose"];
  const guides = GUIDES.length;
  const terms = GLOSSARY_ENTRIES.length;
  return (
    <section id="rooms" className={`${PAD} ${SECTION}`}>
      <div className="flex flex-wrap items-end justify-between gap-6 mb-12">
        <div className="flex flex-col gap-3">
          <span className={KICKER} style={{ color: COLORS.dim }}>{t("site.landing.roomsKicker")}</span>
          <h2 className={H2}>{t("site.landing.roomsTitle")}</h2>
        </div>
        <p className="max-w-[380px]" style={{ color: COLORS.dim }}>{t("site.landing.roomsSub")}</p>
      </div>
      <ul className="grid gap-px" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))", background: COLORS.line, border: `1px solid ${COLORS.line}` }}>
        {ids.map((id, i) => {
          const room = open.get(id);
          const body = (
            <>
              <span dir="ltr" className="font-serif text-[15px] tracking-[0.06em]" style={{ color: COLORS.actionText }}>{roman(i + 1)}</span>
              <span className="flex flex-col gap-2.5">
                <span className="flex flex-col gap-0.5">
                  <span className="font-serif font-light text-[34px] leading-[1.1] rtl:leading-[1.45]">{t(`site.rooms.${id}.name`)}</span>
                  <span lang={locale === "ar" ? "en" : "ar"} className="text-base" style={{ color: COLORS.dim, fontFamily: "'Noto Naskh Arabic Variable',serif" }}>{t(`site.rooms.${id}.alt`)}</span>
                </span>
                <span className="max-w-[300px]" style={{ color: COLORS.dim }}>{t(`site.rooms.${id}.desc`, { terms, guides })}</span>
              </span>
              <span className="flex items-center justify-between gap-3 pt-4" style={{ borderTop: `1px solid ${COLORS.line}` }}>
                <span className="text-sm">{room ? t(`site.rooms.${id}.fig`, { terms, guides }) : t("site.hero.closed")}</span>
                {room && <Arrow />}
              </span>
            </>
          );
          const cls = "flex flex-col justify-between gap-10 min-h-[300px] p-7 hover:bg-[color:var(--c-card)] focus-visible:bg-[color:var(--c-card)]";
          const style = { background: COLORS.paper, color: COLORS.ink };
          return (
            <li key={id} className="contents">
              {!room ? <div id={id} className={cls} style={{ ...style, color: COLORS.dim }}>{body}</div>
                : room.lib ? <Link id={id} to={localePath(locale, room.href)} className={cls} style={style}>{body}</Link>
                : <a id={id} href={room.href} className={cls} style={style}>{body}</a>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// An example formula, to show what the Bench produces. The grams are the
// board's: the six lines weigh 100.00 g. (The calculator itself works from a
// concentrate and ethanol; this card is an illustration.)
const EXAMPLE = [
  ["Frankincense", "لبان", "resinoid 50%", "راتنجي 50%", 22],
  ["Labdanum", "لادن", "absolute", "مطلق", 14],
  ["Iso E Super", "إيزو إي سوبر", "neat", "صافٍ", 30],
  ["Cassia", "سليخة", "oil, 10%", "زيت، 10%", 6],
  ["Honey", "عسل", "abs. 10%", "مطلق 10%", 8],
  ["Sandalwood", "صندل", "oil", "زيت", 20],
];

export function Method() {
  const { t, locale } = useI18n();
  const ar = locale === "ar";
  const steps = t.raw("site.landing.steps") || [];
  const total = EXAMPLE.reduce((s, r) => s + r[4], 0);
  const ROW = "grid grid-cols-[minmax(0,1fr)_80px_64px] gap-2";
  return (
    <section id="method" className={`${PAD} ${SECTION} grid gap-[clamp(40px,6vw,96px)] items-start`} style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))" }}>
      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-3">
          <span className={KICKER} style={{ color: COLORS.dim }}>{t("site.landing.methodKicker")}</span>
          <h2 className={H2}>{t("site.landing.methodTitle")}</h2>
        </div>
        <ol>
          {steps.map((s, i) => (
            <li key={s.title} className="grid grid-cols-[56px_minmax(0,1fr)] gap-4 py-6" style={{ borderTop: `1px solid ${COLORS.line}` }}>
              <span dir="ltr" className="text-sm pt-2 text-start" style={{ color: COLORS.actionText }}>{String(i + 1).padStart(2, "0")}</span>
              <div className="flex flex-col gap-2">
                <h3 className="font-serif text-[28px] leading-[1.2] rtl:leading-[1.5]">{s.title}</h3>
                <p style={{ color: COLORS.dim }}>{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <figure className="flex flex-col gap-5 p-7 rounded-sm" style={{ background: COLORS.card, border: `1px solid ${COLORS.line}` }} aria-label={t("site.landing.example")}>
        <figcaption className="flex flex-wrap items-baseline justify-between gap-3">
          <span className="flex flex-col gap-1">
            <span dir="ltr" className="text-xs tracking-[0.1em]" style={{ color: COLORS.dim }}>R·0318</span>
            <span className="font-serif text-[26px]">{t("site.landing.recipeName")}</span>
          </span>
          <span className="text-[13px]" style={{ color: COLORS.dim }}>{t("site.landing.recipeMeta")}</span>
        </figcaption>
        <div role="table" className="flex flex-col text-[15px]">
          <div role="row" className={`${ROW} pb-2.5 text-xs uppercase tracking-[0.1em] rtl:tracking-normal rtl:normal-case`} style={{ color: COLORS.dim }}>
            <span role="columnheader">{t("site.landing.colMaterial")}</span>
            <span role="columnheader" className="text-end">g</span>
            <span role="columnheader" className="text-end">%</span>
          </div>
          {EXAMPLE.map((r) => (
            <div role="row" key={r[0]} className={`${ROW} py-[11px] items-baseline`} style={{ borderTop: `1px solid ${COLORS.line}` }}>
              <span role="cell" className="flex flex-wrap items-baseline gap-2">{ar ? r[1] : r[0]} <span className="text-[13px]" style={{ color: COLORS.dim }}>{ar ? r[3] : r[2]}</span></span>
              <span role="cell" dir="ltr" className="text-end">{r[4].toFixed(2)}</span>
              <span role="cell" dir="ltr" className="text-end" style={{ color: COLORS.dim }}>{r[4].toFixed(1)}</span>
            </div>
          ))}
          <div role="row" className={`${ROW} py-3 font-medium`} style={{ borderTop: `1px solid ${COLORS.dim}` }}>
            <span role="cell">{t("site.landing.total")}</span>
            <span role="cell" dir="ltr" className="text-end">{total.toFixed(2)}</span>
            <span role="cell" dir="ltr" className="text-end font-normal" style={{ color: COLORS.dim }}>{total.toFixed(1)}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2.5 pt-1">
          <div className="flex justify-between text-[13px]">
            <span style={{ color: COLORS.dim }}>{t("site.landing.resting")}</span>
            <span>{t("site.landing.restDays")}</span>
          </div>
          <div role="progressbar" aria-label={t("site.landing.resting")} aria-valuemin={0} aria-valuemax={42} aria-valuenow={18} className="h-0.5" style={{ background: COLORS.line }}>
            <div className="h-0.5" style={{ width: `${(18 / 42) * 100}%`, background: COLORS.amber }} />
          </div>
        </div>
      </figure>
    </section>
  );
}

export function ProSection() {
  const { t, locale } = useI18n();
  const items = t.raw("site.landing.pro") || [];
  return (
    <section id="pro" className={`mx-4 sm:mx-6 lg:mx-12 mt-[clamp(72px,8vw,128px)] p-[clamp(28px,4.4vw,64px)] grid gap-12 rounded-sm`}
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", background: COLORS.card, border: `1px solid ${COLORS.line}` }}>
      <div className="flex flex-col justify-between gap-8">
        <div className="flex flex-col gap-3">
          <span className={KICKER} style={{ color: COLORS.actionText }}>{t("site.landing.proKicker")}</span>
          <h2 className={H2}>{t("site.landing.proTitle")}</h2>
          <p className="max-w-[380px]" style={{ color: COLORS.dim }}>{t("site.landing.proSub")}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to={localePath(locale, "/pricing")} className="on-resin flex items-center min-h-[48px] px-6 rounded-sm font-semibold hover:bg-[color:var(--c-action-hover)]"
            style={{ background: COLORS.amber, color: COLORS.onAmber }}>{t("site.landing.proCta")}</Link>
          <a href="/app" className="flex items-center min-h-[48px] px-6 rounded-sm border hover:border-[color:var(--c-dim)]" style={{ borderColor: COLORS.line, color: COLORS.ink }}>{t("site.landing.proCta2")}</a>
        </div>
      </div>
      <ul>
        {items.map((f, i) => (
          <li key={f.title} className="grid grid-cols-[44px_minmax(0,1fr)] gap-3 py-[18px]" style={{ borderTop: `1px solid ${COLORS.line}` }}>
            <span dir="ltr" className="font-serif text-sm pt-[3px] text-start" style={{ color: COLORS.actionText }}>{roman(i + 1)}</span>
            <div className="flex flex-col gap-0.5">
              <span className="text-[17px] font-medium">{f.title}</span>
              <span className="text-[15px]" style={{ color: COLORS.dim }}>{f.text}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
