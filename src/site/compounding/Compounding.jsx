import React, { useRef } from "react";
import { Link, Light, Magnetic, Tilt, TextReveal } from "../../motion";
import { TYPE, COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { localePath } from "../meta";
import { flagOn } from "../../lib/flags";
import { fmt2 } from "../../lib/calc";
import { GUIDES } from "../../content/guides";
import { benchFigures, BENCH_DEFAULT } from "../benchFigures";
import LiveBench from "../LiveBench";
import { IconArrow, IconBook } from "../../components/icons";
import { Gauge, LiveGauge } from "./parts";
import Weigh from "./Weigh";
import "./rooms.css";
import { M, V, sceneVars, useScrollFallback } from "./motion";

const WRAP = "max-w-[1280px] mx-auto px-4 sm:px-8 lg:px-14";
// Content sits clear of the gauge in the margin (the start side, so it mirrors in Arabic).
const BODY = `${WRAP} ps-14 sm:ps-16 lg:ps-20 relative`;
// The gauge and the marks read their colours from the scene, so both themes work.
const SCENE_VARS = { "--st-ink": "var(--c-ink)", "--st-dim": "var(--c-dim)", "--st-accent": "var(--c-action-text)", "--st-resin": "var(--c-oil)", "--st-line": "var(--c-line)", "--st-bg": "var(--c-paper)" };

// The six rooms, in order. `flag` rooms are links only when their flag is on;
// `lib` is a public page with a locale prefix. `fig` is the number a room is known by.
const ROOMS = [
  { id: "bench", href: "/bench" },
  { id: "wardrobe", href: "/wardrobe", flag: "wardrobe" },
  { id: "library", href: "/library", lib: true },
  { id: "atlas", href: "/atlas", flag: "atlas" },
  { id: "salon", href: "/salon", flag: "salon" },
  { id: "nose", href: "/nose", flag: "nose" },
];

// One stage: a section that is its own timeline box, with the gauge's static reading.
function Stage({ id, children, className = "", bg = COLORS.paper }) {
  return (
    <section data-stage={id} data-vt="" aria-labelledby={`st-${id}`} className={`relative overflow-clip ${className}`} style={{ background: bg, color: COLORS.ink }}>
      <Gauge stage={id} />
      <div className={BODY}>{children(`st-${id}`)}</div>
    </section>
  );
}

// App rooms live outside the public router (full page load); the Library is a public page.
function RoomLink({ room, href, children, ...rest }) {
  return room.lib ? <Link to={href} {...rest}>{children}</Link> : <a href={href} {...rest}>{children}</a>;
}

const HERO_H1 = "ar-display font-serif font-normal tracking-[-0.035em] leading-[0.95] rtl:leading-[1.35] text-[clamp(3.25rem,10.5vw,10rem)]";

const Step = ({ children }) => (
  <p className={`mb-4 ${TYPE.label}`} style={{ color: COLORS.dim }}>{children}</p>
);

// A weight as a figure: the number large, the unit small, always left-to-right.
const Figure = ({ value, unit = "g", size = "text-[clamp(3.5rem,9vw,7rem)]" }) => (
  <p dir="ltr" className={`font-serif leading-none tabular-nums ${size}`}>
    {value}<span className="ms-2 text-[0.3em]" style={{ color: COLORS.dim }}>{unit}</span>
  </p>
);

export default function Compounding() {
  const { t, locale } = useI18n();
  const hero = t.raw("site.home.hero") || [];
  const { oil, alcohol, total, oilShare } = benchFigures(BENCH_DEFAULT.size, BENCH_DEFAULT.pct);
  const to = (p) => localePath(locale, p);
  const roomHref = (room) => (room.lib ? to(room.href) : room.href);
  const scene = useRef(null);
  useScrollFallback(scene);
  const nums = { oil: fmt2(oil), alcohol: fmt2(alcohol), total: fmt2(total) };
  const fig = (id) => t(`site.compounding.rooms.${id}.fig`, { n: GUIDES.length });

  return (
    <div ref={scene} data-compounding role="group" aria-label={t("site.compounding.sceneLabel")} style={{ ...sceneVars(), ...SCENE_VARS }}>
      <LiveGauge />

      {/* I · The reading. The headline never fades or moves (it is the LCP); light and depth sit behind it. */}
      <Stage id="reading" className="mo-grain pt-10 pb-14 lg:pt-14 lg:pb-20 min-h-[88svh] flex items-center">
        {(h) => (
          <div className="w-full">
            <Light />
            <h1 id={h} className={HERO_H1}>
              {hero.map((line, i) => (
                <span key={line} className={`block ${i === hero.length - 1 ? "italic lg:ps-[11vw]" : ""}`} style={i === hero.length - 1 ? { color: "var(--st-accent)" } : undefined}>{line}</span>
              ))}
            </h1>
            <div className="mt-10 lg:mt-14 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-10 lg:gap-16 items-end">
              <div>
                <p className={`measure ${TYPE.lead}`} style={{ color: COLORS.inkSoft }}>{t("site.home.lead")}</p>
                <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3">
                  <Magnetic as="a" href="/bench?ref=home" className="inline-flex items-center gap-2 px-6 min-h-[52px] font-medium" style={{ background: COLORS.amber, color: COLORS.onAmber }}>
                    {t("site.home.ctaApp")} <IconArrow size={18} />
                  </Magnetic>
                  <Link to={to("/library")} className="inline-flex items-center gap-2 min-h-[44px] underline underline-offset-4" style={{ color: COLORS.ink }}>
                    <IconBook size={18} /> {t("site.home.ctaGuides")}
                  </Link>
                </div>
                <p className="mt-6 text-sm" style={{ color: COLORS.dim }}>{t("site.compounding.reading.hint")}</p>
                <a href="#cmp-rooms" className="mt-1 inline-flex items-center min-h-[44px] text-sm underline underline-offset-4" style={{ color: "var(--st-accent)" }}>{t("site.compounding.reading.skip")}</a>
              </div>
              <Tilt as="figure" className="mo-raised relative overflow-clip p-6 sm:p-8 m-0" style={{ background: COLORS.card, border: `1px solid ${COLORS.line}` }}>
                <M kf="pan" aria-hidden="true" className="absolute inset-0" style={{ background: "linear-gradient(to top, color-mix(in srgb, var(--c-amber) 30%, transparent), transparent 72%)" }} />
                <div className="relative">
                  <p className={TYPE.label} style={{ color: COLORS.dim }}>{t("site.compounding.reading.label")}</p>
                  <div className="mt-3"><Figure value={nums.total} size="text-[clamp(4rem,11vw,9.5rem)]" /></div>
                  <p className="mt-3 text-sm" style={{ color: COLORS.dim }}>{t("site.compounding.reading.caption")}</p>
                  <dl className="mt-6 grid grid-cols-2 gap-4" style={{ borderTop: `1px solid ${COLORS.line}`, paddingTop: 16 }}>
                    <div><dt className="text-sm" style={{ color: COLORS.dim }}>{t("site.compounding.oil.label")}</dt><dd className="font-serif text-2xl" dir="ltr">{nums.oil} g</dd></div>
                    <div><dt className="text-sm" style={{ color: COLORS.dim }}>{t("site.compounding.alcohol.label")}</dt><dd className="font-serif text-2xl" dir="ltr">{nums.alcohol} g</dd></div>
                  </dl>
                </div>
              </Tilt>
            </div>
          </div>
        )}
      </Stage>

      {/* II to III · The pinned weighing: oil, dusk, alcohol, the total */}
      <Weigh oil={oil} alcohol={alcohol} total={total} oilShare={oilShare} />

      {/* IV · Six rooms, each known by a number. Sideways across a pinned stage on wide screens (once), a plain grid elsewhere. */}
      <section data-stage="rooms" data-pin aria-labelledby="st-rooms" className="rs relative overflow-clip" style={{ background: COLORS.paper, color: COLORS.ink }}>
        <Gauge stage="rooms" />
        <div className="rs-stage py-16 lg:py-0">
          <div className={BODY}>
            <TextReveal as="h2" id="st-rooms" className={TYPE.title} text={t("site.compounding.rooms.title")} />
            <p className="mt-4 font-serif text-lg measure" style={{ color: COLORS.inkSoft }}>{t("site.compounding.rooms.text")}</p>
          </div>
          <nav id="cmp-rooms" aria-labelledby="st-rooms" className="rs-track mt-12 scroll-mt-8">
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[var(--c-line)] border border-[var(--c-line)]">
              {ROOMS.map((room, i) => {
                const open = !room.flag || flagOn(room.flag);
                const body = (
                  <>
                    <span className="block font-serif ar-display text-[clamp(2rem,4vw,3rem)] leading-none tabular-nums rs-fig">{fig(room.id)}</span>
                    <span className="block mt-4 text-lg font-medium">{t(`site.compounding.rooms.${room.id}.name`)}</span>
                    <span className="block mt-1 text-sm" style={{ color: COLORS.dim }}>{open ? t(`site.compounding.rooms.${room.id}.line`) : t("site.compounding.closed")}</span>
                  </>
                );
                return (
                  <V as="li" key={room.id} data-room={room.id} style={{ background: COLORS.paper }}>
                    <M kf="plate" i={i} className="h-full">
                      {open ? (
                        <RoomLink room={room} href={roomHref(room)} className="block p-6 min-h-[150px] h-full hover:bg-[var(--c-card)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2" style={{ outlineColor: COLORS.focus }}>{body}</RoomLink>
                      ) : (
                        <div className="block p-6 min-h-[150px] h-full opacity-80">{body}</div>
                      )}
                    </M>
                  </V>
                );
              })}
            </ul>
          </nav>
          <div className={BODY}><div aria-hidden="true" className="rs-meter"><i /></div></div>
        </div>
      </section>

      {/* V · Handoff: the live Bench */}
      <Stage id="handoff" bg={COLORS.card} className="py-16 lg:py-24">
        {(h) => (
          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-10 lg:gap-16 items-center">
            <div>
              <TextReveal as="h2" id={h} className={TYPE.title} text={t("site.compounding.handoff.title")} />
              <p className="mt-4 font-serif text-lg measure" style={{ color: COLORS.inkSoft }}>{t("site.compounding.handoff.text", nums)}</p>
              <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3">
                <Magnetic as="a" href="/bench?ref=home" className="inline-flex items-center gap-2 px-6 min-h-[52px] font-medium" style={{ background: COLORS.amber, color: COLORS.onAmber }}>
                  {t("site.compounding.handoff.cta", nums)} <IconArrow size={18} />
                </Magnetic>
              </div>
            </div>
            <LiveBench />
          </div>
        )}
      </Stage>
    </div>
  );
}
