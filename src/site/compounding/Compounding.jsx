import React, { useRef } from "react";
import { Link } from "../../motion";
import { TYPE, COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { localePath } from "../meta";
import { flagOn } from "../../lib/flags";
import { fmt2 } from "../../lib/calc";
import { BAND, BAND_NEXT, STAGE_LIGHT } from "../../lib/compounding/config";
import { KYPHI_INGREDIENTS, roman } from "../../content/kyphi";
import { benchFigures, BENCH_DEFAULT } from "../benchFigures";
import LiveBench from "../LiveBench";
import { IconArrow } from "../../components/icons";
import { Bowl, Ember, GRAINS, Gauge, LiveGauge } from "./parts";
import CanvasSmoke from "./CanvasSmoke";
import { M, V, sceneVars, useScrollFallback } from "./motion";

const WRAP = "max-w-[1280px] mx-auto px-4 sm:px-8 lg:px-14";
// Content sits clear of the gauge in the margin (the start side, so it mirrors in Arabic).
const BODY = `${WRAP} ps-14 sm:ps-16 lg:ps-20 relative`;

// The six rooms, in the order of the brief. `flag` rooms are links only when
// their flag is on (Atlas and Salon are built but not yet open); `lib` is a
// public page with a locale prefix.
const ROOMS = [
  { id: "bench", href: "/bench" },
  { id: "wardrobe", href: "/wardrobe", flag: "wardrobe" },
  { id: "library", href: "/library", lib: true },
  { id: "atlas", href: "/atlas", flag: "atlas" },
  { id: "salon", href: "/salon", flag: "salon" },
  { id: "nose", href: "/nose", flag: "nose" },
];
// Each room is a different wisp of smoke: an uneven shape, and a rise.
const WISPS = [
  { r: "58% 42% 55% 45% / 46% 58% 42% 54%", rise: 40 },
  { r: "44% 56% 40% 60% / 58% 44% 56% 42%", rise: 8 },
  { r: "52% 48% 62% 38% / 42% 56% 44% 58%", rise: 64 },
  { r: "60% 40% 46% 54% / 54% 40% 60% 46%", rise: 0 },
  { r: "42% 58% 52% 48% / 60% 46% 54% 40%", rise: 48 },
  { r: "56% 44% 38% 62% / 44% 60% 40% 56%", rise: 20 },
];

const lightVars = (id) => {
  const l = STAGE_LIGHT[id];
  return l ? { "--st-bg": l.bg, "--st-ink": l.ink, "--st-dim": l.dim, "--st-accent": l.accent, "--st-resin": l.resin, "--st-line": l.line } : {};
};

// `overflow-clip`, not `hidden`: hidden makes the stage a scroll container,
// and the marks inside it would then be timed against it instead of the page.
function Stage({ id, children, className = "", style, vt }) {
  const next = BAND_NEXT[id];
  return (
    <section data-stage={id} data-next={next} data-vt={vt ? "" : undefined} aria-labelledby={`st-${id}`} className={`relative overflow-clip ${className}`}
      style={{ background: "var(--st-bg)", color: "var(--st-ink)", ...lightVars(id), "--band": `clamp(${BAND.min}px, ${BAND.vh}vh, ${BAND.max}px)`, ...style }}>
      <Gauge stage={id} />
      <div className={BODY}>{children(`st-${id}`)}</div>
      {next && <div aria-hidden="true" className="cmp-band" style={{ background: `linear-gradient(to bottom, transparent, ${STAGE_LIGHT[next].bg})` }} />}
    </section>
  );
}

// App rooms live outside the public router (full page load); the Library is a public page.
function RoomLink({ room, href, children, ...rest }) {
  return room.lib ? <Link to={href} {...rest}>{children}</Link> : <a href={href} {...rest}>{children}</a>;
}

const Time = ({ children }) => (
  <p className="mb-5 text-xs" style={{ color: "var(--st-dim)" }}>
    <span dir="ltr" className="font-mono" style={{ fontVariantNumeric: "tabular-nums" }}>{children}</span>
  </p>
);

export default function Compounding() {
  const { t, locale } = useI18n();
  const ar = locale === "ar";
  const hero = t.raw("site.home.hero") || [];
  const total = fmt2(benchFigures(BENCH_DEFAULT.size, BENCH_DEFAULT.pct).total);
  const to = (p) => localePath(locale, p);
  const roomHref = (room) => (room.lib ? to(room.href) : room.href);
  const scene = useRef(null);
  useScrollFallback(scene);

  return (
    <div ref={scene} data-compounding role="group" aria-label={t("site.compounding.sceneLabel")} style={sceneVars()}>
      <LiveGauge />
      {/* I · Afternoon, empty room */}
      <Stage id="afternoon" className="py-16 lg:py-24 min-h-[78svh] flex items-center">
        {(h) => (
          <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-10 lg:gap-16 items-center w-full">
            <div>
              <Time>{t("site.compounding.afternoon.time")}</Time>
              <h1 id={h} className={TYPE.display}>
                {hero.map((line, i) => (
                  <span key={line} className={`block ${i === hero.length - 1 ? "font-serif italic font-normal tracking-[-0.02em] rtl:tracking-normal" : ""}`}
                    style={i === hero.length - 1 ? { color: "var(--st-accent)" } : undefined}>{line}</span>
                ))}
              </h1>
              <p className={`mt-7 measure ${TYPE.lead}`}>{t("site.compounding.afternoon.lead")}</p>
              <p className="mt-6 text-sm" style={{ color: "var(--st-dim)" }}>{t("site.compounding.afternoon.hint")}</p>
              <a href="#cmp-rooms" className="mt-3 inline-flex items-center min-h-[44px] text-sm underline underline-offset-4" style={{ color: "var(--st-accent)" }}>{t("site.compounding.afternoon.skip")}</a>
            </div>
            <V className="w-full max-w-[420px] justify-self-center lg:justify-self-end">
              <M kf="parallax"><Bowl fill="empty" className="w-full" /></M>
            </V>
          </div>
        )}
      </Stage>

      {/* II · The sixteen */}
      <Stage id="sixteen" className="py-16 lg:py-24">
        {(h) => (
          <>
            <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-8 lg:gap-14 items-end mb-10">
              <V>
                <M kf="drift">
                  <Time>{t("site.compounding.sixteen.time")}</Time>
                  <h2 id={h} className={TYPE.title}>{t("site.compounding.sixteen.title")}</h2>
                  <p className="mt-4 font-serif text-lg measure" style={{ color: "var(--st-dim)" }}>{t("site.compounding.sixteen.text")}</p>
                </M>
              </V>
              <V className="w-full max-w-[300px] justify-self-center lg:justify-self-end">
                <Bowl fill="grains" grains={GRAINS} className="w-full" />
              </V>
            </div>
            <ol className="grid grid-cols-2 sm:grid-cols-4 gap-px" style={{ background: "var(--st-line)", border: "1px solid var(--st-line)" }}>
              {KYPHI_INGREDIENTS.map((ing, i) => {
                const [main, mainLang, other, otherLang] = ar ? [ing.ar, "ar", ing.en, "en"] : [ing.en, "en", ing.ar, "ar"];
                return (
                  <V as="li" key={ing.id} data-plate style={{ background: "var(--st-bg)" }}>
                    <M kf="plate" i={i % 4} className="p-3 sm:p-4 min-h-[112px] h-full flex flex-col justify-between gap-3">
                      <span aria-hidden="true" dir="ltr" className={`${TYPE.numeral} text-2xl`} style={{ color: "var(--st-accent)" }}>{roman(i + 1)}</span>
                      <span className="block">
                        <span lang={mainLang} className={`block font-serif ${ar ? "text-2xl leading-[1.5]" : "text-xl leading-tight"}`}>{main}</span>
                        <span lang={otherLang} dir={otherLang === "ar" ? "rtl" : "ltr"} className={`block mt-1 ${otherLang === "ar" ? "font-serif text-base leading-[1.6]" : "text-xs"}`} style={{ color: "var(--st-dim)" }}>{other}</span>
                      </span>
                    </M>
                  </V>
                );
              })}
            </ol>
            <p className="mt-5 text-xs" style={{ color: "var(--st-dim)" }}>{t("site.compounding.sixteen.source")}</p>
          </>
        )}
      </Stage>

      {/* III · The pour and the grind */}
      <Stage id="pour" className="py-16 lg:py-24">
        {(h) => (
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <V>
              <M kf="drift">
                <Time>{t("site.compounding.pour.time")}</Time>
                <h2 id={h} className={TYPE.title}>{t("site.compounding.pour.title")}</h2>
                <p className="mt-4 font-serif text-lg measure">{t("site.compounding.pour.text")}</p>
              </M>
            </V>
            <V className="w-full max-w-[460px] justify-self-center">
              <Bowl fill="pour" grains={GRAINS} className="w-full" />
            </V>
          </div>
        )}
      </Stage>

      {/* IV · Dusk */}
      <Stage id="dusk" className="py-20 lg:py-28 min-h-[56svh] flex items-end">
        {(h) => (
          <V>
            <M kf="drift">
              <Time>{t("site.compounding.dusk.time")}</Time>
              <h2 id={h} className={TYPE.title}>{t("site.compounding.dusk.title")}</h2>
              <p className="mt-4 font-serif text-lg measure" style={{ color: "var(--st-dim)" }}>{t("site.compounding.dusk.text")}</p>
            </M>
          </V>
        )}
      </Stage>

      {/* V · The burn: six rooms inside the smoke */}
      <Stage id="burn" vt className="py-16 lg:py-24">
        {(h) => (
          <>
            <CanvasSmoke />
            <div className="relative">
              <V>
                <M kf="drift">
                  <Time>{t("site.compounding.burn.time")}</Time>
                  <h2 id={h} className={TYPE.title}>{t("site.compounding.burn.title")}</h2>
                  <p className="mt-4 font-serif text-lg measure" style={{ color: "var(--st-dim)" }}>{t("site.compounding.burn.text")}</p>
                </M>
              </V>
              <nav id="cmp-rooms" aria-labelledby={h} className="mt-12 scroll-mt-8">
                <ul className="grid grid-cols-2 lg:grid-cols-6 gap-x-3 gap-y-6 lg:items-start">
                  {ROOMS.map((room, i) => {
                    const open = !room.flag || flagOn(room.flag);
                    const w = WISPS[i];
                    const body = (
                      <>
                        <span aria-hidden="true" dir="ltr" className={`${TYPE.numeral} block text-base mb-1`} style={{ color: "var(--st-accent)" }}>{roman(i + 1)}</span>
                        <span className={`block font-serif ${ar ? "text-xl leading-[1.5]" : "text-lg leading-tight"}`}>{t(`site.compounding.rooms.${room.id}.name`)}</span>
                        <span className="block mt-1 text-xs" style={{ color: "var(--st-dim)" }}>{open ? t(`site.compounding.rooms.${room.id}.line`) : t("site.compounding.closed")}</span>
                      </>
                    );
                    const shape = { borderRadius: w.r, background: "color-mix(in srgb, var(--st-accent) 14%, transparent)", border: "1px solid color-mix(in srgb, var(--st-accent) 55%, transparent)" };
                    return (
                      <V as="li" key={room.id} data-room={room.id} style={{ "--rise": `${64 - w.rise}px` }} className="lg:[margin-top:var(--rise)]">
                        <M kf="wisp" i={i}>
                        {open ? (
                          <RoomLink room={room} href={roomHref(room)}
                            className="block px-5 py-7 min-h-[112px] hover:brightness-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" style={{ ...shape, outlineColor: "var(--st-accent)" }}>{body}</RoomLink>
                        ) : (
                          <div className="block px-5 py-7 min-h-[112px] opacity-80" style={{ ...shape, borderStyle: "dashed" }}>{body}</div>
                        )}
                        </M>
                      </V>
                    );
                  })}
                </ul>
              </nav>
              <div className="mt-14 flex justify-center"><Ember /></div>
            </div>
          </>
        )}
      </Stage>

      {/* VI · Handoff: the smoke clears into the live bench */}
      <section data-stage="handoff" data-vt="" aria-labelledby="st-handoff" className="relative overflow-clip" style={{ background: COLORS.paper, color: COLORS.ink, ...{ "--st-dim": "var(--c-dim)", "--st-accent": "var(--c-action-text)", "--st-resin": "var(--c-oil)", "--st-line": "var(--c-line)" } }}>
        <Gauge stage="handoff" />
        <M kf="veil" aria-hidden="true" className="cmp-veil absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(${STAGE_LIGHT.burn.bg}, transparent)` }} />
        <div className={`${BODY} py-16 lg:py-24 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-10 lg:gap-16 items-center`}>
          <div>
            <Time>{t("site.compounding.handoff.time")}</Time>
            <h2 id="st-handoff" className={TYPE.title}>{t("site.compounding.handoff.title")}</h2>
            <p className="mt-4 font-serif text-lg measure" style={{ color: COLORS.inkSoft }}>{t("site.compounding.handoff.text", { total })}</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3">
              <a href="/bench?ref=home" className="inline-flex items-center gap-2 px-6 min-h-[52px] font-medium" style={{ background: COLORS.amber, color: COLORS.onAmber }}>
                {t("site.home.ctaApp")} <IconArrow size={18} />
              </a>
            </div>
          </div>
          <LiveBench />
        </div>
      </section>
    </div>
  );
}
