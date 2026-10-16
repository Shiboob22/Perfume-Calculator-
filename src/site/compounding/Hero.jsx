import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PALETTES } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { localePath } from "../meta";
import { useRoomFlags } from "../../lib/useRoomFlags";
import { PLATES } from "../../content/hero";
import { END, clamp, heroFrame } from "../../lib/hero/timeline";
import { openRooms } from "../../components/SiteChrome";

// The Compounding (Design/boards/Compounding.dc.html): a 9.2 s autoplay of
// sixteen plates that blend into one amber ember, then the six rooms; the
// reader can skip it, and scrolling takes over. All timing is in
// lib/hero/timeline.js; this component only paints a frame.
//
// The first render (and the prerender) is the resting frame, so the page is
// whole without script and under reduced motion. The autoplay starts after
// hydration. The hero sits on its own dark ground in both themes: it is the
// room at dusk, not a page surface.
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
const D = PALETTES.dark;
const SERIF = "'Newsreader Variable','Newsreader Fallback','Noto Naskh Arabic Variable',Georgia,serif";
const SERIF_AR = "'Noto Naskh Arabic Variable','Newsreader Variable',serif";
const px = (n) => `${Number(n).toFixed(2)}px`;

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const q = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!q) return undefined;
    const on = () => setReduced(q.matches);
    on();
    q.addEventListener?.("change", on);
    return () => q.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

/** Seconds into the autoplay. Rests at END; plays once after mount unless motion is reduced; paused off-screen. */
function useHeroClock(rootRef, { reduced, freezeAt }) {
  const [T, setT] = useState(freezeAt ?? END);
  const start = useRef(null);
  const visible = useRef(true);
  const raf = useRef(0);
  const [played, setPlayed] = useState(false);

  const loop = useCallback((now) => {
    if (start.current == null) start.current = now;
    setT((now - start.current) / 1000);
    raf.current = visible.current && !document.hidden ? requestAnimationFrame(loop) : 0;
  }, []);
  const run = useCallback(() => { if (!raf.current) raf.current = requestAnimationFrame(loop); }, [loop]);

  useEffect(() => {
    if (freezeAt != null || reduced) { setT(freezeAt ?? END); return undefined; }
    start.current = performance.now();
    setT(0);
    setPlayed(true);
    run();
    const io = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([e]) => {
      visible.current = e.isIntersecting;
      if (visible.current) run();
    });
    if (io && rootRef.current) io.observe(rootRef.current);
    const vis = () => { if (!document.hidden) run(); };
    document.addEventListener("visibilitychange", vis);
    return () => { cancelAnimationFrame(raf.current); raf.current = 0; io?.disconnect(); document.removeEventListener("visibilitychange", vis); };
  }, [reduced, freezeAt, run, rootRef]);

  // Skip jumps to the resting frame (frame 8); once there the button replays.
  const control = useCallback(() => {
    const now = performance.now();
    const t = (now - (start.current ?? now)) / 1000;
    start.current = t < END ? now - END * 1000 : now;
    setPlayed(true);
    run();
  }, [run]);
  return { T: Math.max(0, T), control, played };
}

export default function Hero({ freezeAt = null }) {
  const { t, locale } = useI18n();
  const ar = locale === "ar";
  const rootRef = useRef(null);
  const reduced = useReducedMotion();
  const [w, setW] = useState(1440);
  const [fade, setFade] = useState(0);
  const { T, control, played } = useHeroClock(rootRef, { reduced, freezeAt });

  useIsoLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    setW(el.getBoundingClientRect().width || 1440);
    const ro = new ResizeObserver((e) => setW(e[0].contentRect.width || 1440));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Once the autoplay has handed over, the ember fades with the first 60% of the hero's exit.
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const h = rootRef.current?.offsetHeight || 860;
        setFade(clamp(window.scrollY / (h * 0.6)));
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(frame); };
  }, []);

  const f = heroFrame(T, { w, ar, reduced });
  const { mobile } = f;
  const settled = T >= END;
  const emberOpacity = settled ? 1 - fade : 1;
  const head = t.raw("site.hero.head") || [];
  const tracking = ar ? "0" : "0.14em";
  const flags = useRoomFlags();
  const open = new Map(openRooms(flags).map((r) => [r.id, r]));
  const ROOM_IDS = ["bench", "wardrobe", "library", "atlas", "salon", "nose"];
  const ROMAN = ["I", "II", "III", "IV", "V", "VI"];
  const showControl = freezeAt == null && !reduced && played;
  const grams = f.grams.toFixed(2);

  return (
    <div ref={rootRef} dir={ar ? "rtl" : "ltr"} data-hero="" data-settled={settled || undefined}
      className="relative w-full overflow-hidden h-[760px] min-[760px]:h-[860px]"
      style={{ background: f.bg, color: D.ink, fontFamily: "'Hanken Grotesk Variable','IBM Plex Sans Arabic',sans-serif", containerType: "inline-size" }}>
      <p className="sr-only">{t("site.hero.summary")}</p>

      <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: f.lightOpacity,
        background: `radial-gradient(90% 70% at ${ar ? "85%" : "15%"} -15%, rgba(232,170,104,0.30), rgba(232,170,104,0) 62%)` }} />

      {/* The caption and the running count */}
      <div aria-hidden="true" style={{ position: "absolute", insetInline: 0, top: 0, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, padding: mobile ? "20px" : "32px 48px", opacity: f.barOpacity }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
          <span style={{ fontSize: 12, letterSpacing: tracking, textTransform: "uppercase", color: D.dim }}>{t("site.hero.kicker")}</span>
          <span style={{ fontFamily: ar ? SERIF_AR : SERIF, fontStyle: "italic", fontSize: 18, color: D.ink, lineHeight: 1.5 }}>{t("site.hero.caption")}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 16, fontVariantNumeric: "tabular-nums", fontSize: 14 }}>
            <span style={{ color: D.dim }} dir="ltr">{String(f.arrived).padStart(2, "0")} / 16</span>
            <span style={{ color: D.ink, fontWeight: 500 }} dir="ltr">{grams} g</span>
          </div>
          <div style={{ width: mobile ? 110 : 180, height: 2, background: D.line }}>
            <div style={{ height: 2, background: D.amber, width: `${grams}%` }} />
          </div>
        </div>
      </div>

      {/* The stage: sixteen plates, the amber body, the smoke */}
      <div aria-hidden="true" style={{ position: "absolute", left: "50%", top: f.stageY, width: f.gridW, height: f.gridH, transform: `translate(-50%,-50%) scale(${f.scale.toFixed(4)})` }}>
        <div dir={ar ? "rtl" : "ltr"} style={{ display: "grid", gridTemplateColumns: `repeat(${f.cols}, ${f.pw}px)`, gridAutoRows: `${f.ph}px`, gap: f.gap }}>
          {PLATES.map((p, i) => {
            const pl = f.plates[i];
            return (
              <div key={p[0]} style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: mobile ? 8 : 14, boxSizing: "border-box",
                border: `1px solid ${pl.border}`, borderRadius: 2, background: pl.bg, opacity: pl.opacity.toFixed(3), transform: `translate(${px(pl.x)}, ${px(pl.y)}) scale(${pl.scale.toFixed(3)})` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 4 }}>
                  <span dir="ltr" style={{ fontFamily: SERIF, fontSize: mobile ? 12 : 15, color: D.amber, letterSpacing: "0.04em" }}>{p[0]}</span>
                  {!mobile && <span dir="ltr" style={{ fontSize: 11, color: D.dim, fontVariantNumeric: "tabular-nums", letterSpacing: "0.06em" }}>{p[3]}</span>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontFamily: ar ? SERIF_AR : SERIF, fontSize: mobile ? 13 : 20, lineHeight: 1.25, color: D.ink }}>{ar ? p[2] : p[1]}</span>
                  <span style={{ fontFamily: ar ? SERIF : SERIF_AR, fontSize: mobile ? 12 : 16, lineHeight: 1.5, color: D.dim }}>{ar ? p[1] : p[2]}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 4, borderTop: `1px solid ${D.line}`, paddingTop: 6 }}>
                  <span dir="ltr" style={{ fontSize: mobile ? 11 : 13, fontVariantNumeric: "tabular-nums", color: D.ink }}>{p[4].toFixed(2)} g</span>
                  {!mobile && <span style={{ fontSize: 11, color: D.dim }}>{ar ? p[6] : p[5]}</span>}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ position: "absolute", left: "50%", top: "50%", width: f.disc, height: f.disc, transform: "translate(-50%,-50%)", borderRadius: "50%", opacity: (f.discOpacity * emberOpacity).toFixed(3), pointerEvents: "none",
          background: "radial-gradient(circle at 50% 45%, #F2C489 0%, #D4924A 38%, #8A5424 72%, rgba(138,84,36,0) 100%)", boxShadow: `0 0 ${px(f.glow)} ${px(f.glowSpread)} rgba(212,146,74,0.35)` }} />
        {f.smoke.map((s, k) => (
          <div key={k} style={{ position: "absolute", left: "50%", top: "50%", width: s.w, height: s.h, borderRadius: "50%", background: "rgba(214,200,182,0.16)", filter: `blur(${s.blur.toFixed(1)}px)`,
            opacity: (s.opacity * emberOpacity).toFixed(3), transform: `translate(calc(-50% + ${s.x.toFixed(1)}px), calc(-100% - ${s.rise.toFixed(1)}px))`, pointerEvents: "none" }} />
        ))}
      </div>

      {/* The headline */}
      <div style={{ position: "absolute", insetInline: 0, top: f.stageY + (mobile ? 40 : 64), display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "0 24px", textAlign: "center",
        opacity: f.headOpacity.toFixed(3), transform: `translateY(${f.headDy.toFixed(1)}px)` }}>
        <h1 style={{ margin: 0, fontFamily: ar ? SERIF_AR : SERIF, fontWeight: 300, fontSize: "clamp(34px, 5.4cqw, 76px)", lineHeight: ar ? 1.5 : 1.08, letterSpacing: "-0.01em",
          fontVariantNumeric: "lining-nums", display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: "0.28em" }}>
          {head.map((part) => <span key={part} style={{ whiteSpace: "nowrap" }}>{part}</span>)}
        </h1>
        <p style={{ margin: 0, maxWidth: 520, fontSize: "clamp(16px, 1.3cqw, 19px)", lineHeight: ar ? 1.9 : 1.55, color: D.dim, textWrap: "pretty" }}>{t("site.hero.sub")}</p>
      </div>

      {/* The rooms */}
      <nav aria-label={t("site.rooms.label")} style={{ position: "absolute", insetInline: 0, bottom: mobile ? 72 : 56, display: "grid", gridTemplateColumns: `repeat(${mobile ? 3 : 6}, minmax(0,1fr))`, padding: mobile ? "0 16px" : "0 48px" }}>
        {ROOM_IDS.map((id, j) => {
          const room = open.get(id);
          const r = f.rooms[j];
          const body = (
            <>
              <span dir="ltr" style={{ fontFamily: SERIF, fontSize: 14, color: D.amber, letterSpacing: "0.06em" }}>{ROMAN[j]}</span>
              <span style={{ fontFamily: ar ? SERIF_AR : SERIF, fontSize: mobile ? 15 : 21, lineHeight: 1.3 }}>{t(`site.rooms.${id}.name`)}</span>
            </>
          );
          const style = { display: "flex", flexDirection: "column", gap: 4, minHeight: 44, padding: "14px 12px 4px", borderTop: `1px solid ${D.line}`, textDecoration: "none", color: D.ink,
            opacity: r.opacity.toFixed(3), transform: `translateY(${r.dy.toFixed(1)}px)`, pointerEvents: r.opacity < 0.05 ? "none" : undefined };
          const cls = "hero-room";
          if (!room) return <span key={id} className={cls} style={{ ...style, color: D.dim }} title={t("site.hero.closed")}>{body}<span className="sr-only">{t("site.hero.closed")}</span></span>;
          if (room.lib) return <Link key={id} to={localePath(locale, room.href)} className={cls} style={style}>{body}</Link>;
          return <a key={id} href={room.href} className={cls} style={style}>{body}</a>;
        })}
      </nav>

      {showControl && (
        <button type="button" onClick={control}
          style={{ position: "absolute", insetInlineEnd: mobile ? 16 : 48, bottom: mobile ? 16 : 0, minHeight: 44, minWidth: 44, padding: "0 16px", background: "transparent", border: `1px solid ${D.line}`, borderRadius: 2,
            color: D.dim, font: "inherit", fontSize: 13, letterSpacing: ar ? 0 : "0.08em", cursor: "pointer" }}
          className="hover:!text-[#EDE4D6] hover:!border-[#A3968A]">
          {T < END ? t("site.hero.skip") : t("site.hero.replay")}
        </button>
      )}
    </div>
  );
}
