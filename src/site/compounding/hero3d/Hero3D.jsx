import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useI18n } from "../../../i18n/I18nProvider";
import { COLORS, TYPE } from "../../../lib/theme";
import { fmt2 } from "../../../lib/calc";
import { STRENGTHS as NAMED } from "../../../lib/formulation";
import { createGovernor } from "../../../lib/fpsGovernor";
import { benchFigures } from "../../benchFigures";
import { IconArrow } from "../../../components/icons";
import { createSound } from "./sound";
import * as T from "./timeline";
import "./hero3d.css";

// The canvas label draws with the site's own faces once they have loaded.
const FONTS = {
  serif: "'Instrument Serif', Georgia, serif",
  sans: "'Instrument Sans Variable', system-ui, sans-serif",
  arabic: "'Reem Kufi Variable', 'Readex Pro Variable', sans-serif",
};
const KIND = { 15: "edt", 20: "edp", 25: "edpi", 30: "extrait" };
const TIER_NAME = Object.fromEntries(NAMED.map((s) => [s.pct, s.name]));
const NOTE_DROPS = T.DROPS.filter((d) => d.tier < 3).length; // the first drops are the named notes
const H1 = "ar-display font-serif font-normal tracking-[-0.02em] leading-[0.98] rtl:leading-[1.35] text-[clamp(2.75rem,6.2vw,5.75rem)]";
const H2 = "ar-display font-serif italic rtl:not-italic font-normal tracking-[-0.02em] leading-none rtl:leading-[1.3] text-[clamp(2.375rem,5vw,4.25rem)]";
const LEAD = "text-[clamp(15px,1.3vw,17px)] leading-[1.55] max-w-[420px]";

const loadImage = (src) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });

/**
 * A vertical dial over a short list of values (the handbook's strengths, the
 * bench sizes). Drag or use the keys; it always lands on a listed value.
 * Kept left-to-right in Arabic: it is a scale, like the figures.
 */
function Dial({ values, value, onChange, label, valueText, tickLabel, fill, railX }) {
  const min = values[0], max = values[values.length - 1];
  const at = (v) => 128 * ((v - min) / (max - min));
  const drag = useRef(false);
  const from = (e) => {
    const b = e.currentTarget.getBoundingClientRect();
    const y = (e.clientY - b.top) / (b.height / 176);
    onChange(T.nearest(values, min + ((max - min) * (152 - y)) / 128));
  };
  const step = (dir) => onChange(values[Math.max(0, Math.min(values.length - 1, values.indexOf(value) + dir))]);
  const onKey = (e) => {
    const k = e.key;
    if (k === "ArrowUp" || k === "ArrowRight" || k === "PageUp") step(1);
    else if (k === "ArrowDown" || k === "ArrowLeft" || k === "PageDown") step(-1);
    else if (k === "Home") onChange(min);
    else if (k === "End") onChange(max);
    else return;
    e.preventDefault();
  };
  return (
    <div role="slider" tabIndex={0} aria-label={label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} aria-valuetext={valueText}
      className="h3-dial" data-names={tickLabel ? "" : undefined} onKeyDown={onKey}
      onPointerDown={(e) => { drag.current = true; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* old browsers */ } from(e); }}
      onPointerMove={(e) => { if (drag.current) from(e); }}
      onPointerUp={() => { drag.current = false; }} onPointerCancel={() => { drag.current = false; }}>
      {values.map((v) => {
        const on = v === value, color = on ? COLORS.ink : COLORS.inkSoft;
        return (
          <div key={v} aria-hidden="true" className="absolute left-0 flex items-center pointer-events-none" style={{ top: 145 - at(v), height: 14 }}>
            <span className="tabular-nums text-right text-[11px]" style={{ width: 30, color, fontWeight: on ? 600 : 400 }}>{v}</span>
            <span style={{ width: 8, height: 1, marginLeft: 5, background: color }} />
            {tickLabel && <span className="flex items-center"><span style={{ width: 34 }} /><span style={{ width: 8, height: 1, background: color }} /><span className="ms-1 text-[10px] whitespace-nowrap" style={{ color, fontWeight: on ? 600 : 400 }}>{tickLabel(v)}</span></span>}
          </div>
        );
      })}
      <div aria-hidden="true" className="absolute" style={{ left: railX - 1, top: 24, width: 2, height: 128, background: COLORS.inkSoft, opacity: 0.45 }} />
      <div aria-hidden="true" className="absolute" style={{ left: railX - 2, top: 152 - at(value), bottom: 24, width: 4, borderRadius: 2, background: fill }} />
      <div aria-hidden="true" className="h3-knob" style={{ left: railX, top: 152 - at(value) }} />
    </div>
  );
}

/**
 * The home page's first stage when the 3D pour runs: a pinned track (700vh)
 * with a sticky stage. Scroll scrubs the pour; the captions, readout and beat
 * pill are real text written straight from the timeline. createScene comes
 * from the scene chunk, already loaded by the caller. onFail drops back to the
 * static stage (used only before the visitor has scrolled into the track).
 */
export default function Hero3D({ createScene, onFail }) {
  const { t, locale } = useI18n();
  const ar = locale === "ar";
  const [size, setSize] = useState(100);
  const [pct, setPct] = useState(25);
  const [name, setName] = useState(() => t("site.home.hero3d.defaultName"));
  const [sound, setSound] = useState(false);
  const [gl, setGl] = useState(true);

  const { oil, alcohol, total } = benchFigures(size, pct);
  const nums = { oil: fmt2(oil), alcohol: fmt2(alcohol), total: fmt2(total), size, pct };
  const beats = t.raw("site.home.hero3d.beats") || [];
  const notes = t.raw("site.home.hero3d.notes") || [];
  const hero = t.raw("site.home.hero") || [];
  const tiers = ["top", "heart", "base"].map((id, i) => {
    const start = T.TIER_COUNTS.slice(0, i).reduce((a, b) => a + b, 0);
    return { id, notes: notes.slice(start, start + 3).join(ar ? "، " : ", ") + "…" };
  });

  const track = useRef(null), vis = useRef(null), host = useRef(null), labels = useRef(null), readPill = useRef(null);
  const readout = useRef(null), tare = useRef(null), rail = useRef(null), beat = useRef(null), hint = useRef(null);
  const caps = useRef([]), tierEls = useRef([]);
  const live = useRef({});
  live.current = { size, pct, oil, alcohol, beats, onFail };
  const engine = useRef(null);
  const sfx = useRef(null);

  // The engine: one scene, one scroll listener, frames only on change.
  useLayoutEffect(() => {
    const images = {};
    let scene;
    try {
      scene = createScene(host.current, { overlay: { labels: () => labels.current?.children || [], readout: readPill.current }, fonts: FONTS, images });
    } catch (e) {
      live.current.onFail?.(e);
      return undefined;
    }
    sfx.current = createSound();
    const narrow = matchMedia("(max-width: 819.98px)");
    const E = { scene, k: T.bottleScale(live.current.size), kV: 0, yaw: 0, yawV: 0, pitch: 0, dragging: false, visible: true, last: 0, gov: createGovernor(), raf: 0, spring: 0, hero: 0, p: 0 };

    const kill = () => {
      if (!E.scene) return;
      E.scene.dispose();
      E.scene = null;
      cancelAnimationFrame(E.hero); cancelAnimationFrame(E.spring);
      setGl(false);
    };

    function apply() {
      const el = track.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const p = T.clamp(-r.top / Math.max(1, r.height - innerHeight));
      E.p = p;
      const L = live.current;
      const cs = T.captions(p);
      caps.current.forEach((c, i) => {
        if (!c) return;
        const { o, y } = cs[i];
        c.style.opacity = o;
        c.style.transform = `translateY(${y}px)`;
        c.style.visibility = o < 0.01 ? "hidden" : "visible";
        c.style.pointerEvents = o > 0.5 ? "auto" : "none";
        c.toggleAttribute("inert", o <= 0.5);
      });
      tierEls.current.forEach((c, i) => { if (c) { const s = T.tierState(i, p); c.style.opacity = s === "active" ? 1 : s === "done" ? 0.6 : 0.3; } });
      if (readout.current) readout.current.textContent = fmt2(T.readout(p, L.oil, L.alcohol));
      if (tare.current) tare.current.style.opacity = T.taring(p) ? 1 : 0.35;
      if (rail.current) rail.current.style.transform = `scaleX(${p})`;
      const b = L.beats[T.beatIndex(p)];
      if (beat.current && b && beat.current.textContent !== b) beat.current.textContent = b;
      if (vis.current) vis.current.style.opacity = narrow.matches ? 1 - 0.7 * Math.max(cs[0].o, cs[4].o) : 1;
      if (hint.current) hint.current.style.opacity = E.scene && !narrow.matches ? 0.8 * (1 - cs[0].o) * (1 - cs[4].o) : 0;
      sfx.current?.step(p);
      if (!E.scene || !E.visible) return;

      // The governor reads the gap between frames that follow each other.
      const now = performance.now();
      if (E.last && now - E.last < 250) {
        const lvl = E.gov.push(now - E.last);
        if (lvl >= 2) { kill(); return; }
        E.scene.setQuality(lvl);
      }
      E.last = now;
      E.scene.render({ p, c: L.pct / 100, shade: T.oilShade(L.pct), k: E.k, yaw: E.yaw, pitch: E.pitch, heroT: now / 1000 });
      // The ending breathes on its own loop, only while it is on screen.
      if (T.heroAmount(p) > 0 && !E.hero) {
        const loop = () => { E.hero = 0; if (E.scene && E.visible && T.heroAmount(E.p) > 0) { apply(); } };
        E.hero = requestAnimationFrame(loop);
      }
    }

    // The size spring and the drag's spring back.
    function kick() {
      if (E.spring || !E.scene) return;
      const step = () => {
        E.spring = 0;
        const kT = T.bottleScale(live.current.size);
        E.kV = (E.kV + (kT - E.k) * 0.16) * 0.74; E.k += E.kV;
        if (!E.dragging) { E.yawV = (E.yawV + (0 - E.yaw) * 0.09) * 0.78; E.yaw += E.yawV; E.pitch *= 0.85; }
        apply();
        const busy = E.dragging || [kT - E.k, E.kV, E.yaw, E.yawV, E.pitch].some((x) => Math.abs(x) > 0.0005);
        if (busy) E.spring = requestAnimationFrame(step);
        else { E.k = kT; E.yaw = 0; E.pitch = 0; apply(); }
      };
      E.spring = requestAnimationFrame(step);
    }

    const ask = () => { E.raf = E.raf || requestAnimationFrame(() => { E.raf = 0; apply(); }); };
    addEventListener("scroll", ask, { passive: true });
    addEventListener("resize", ask);
    const ro = new ResizeObserver(() => { E.scene?.resize(); ask(); });
    ro.observe(host.current);
    const io = new IntersectionObserver(([en]) => { E.visible = en.isIntersecting; if (E.visible) ask(); });
    io.observe(track.current);

    E.apply = apply; E.kick = kick;
    engine.current = E;
    apply(); // the first frame, before the browser paints the swap

    // The label's logo and faces arrive after; redraw then.
    Promise.all([
      loadImage("/brand/kyphira-stacked.svg").then((im) => { images.logo = im; }),
      loadImage("/brand/kyphira-symbol.svg").then((im) => { images.symbol = im; }),
      document.fonts?.load(`italic 400 96px ${FONTS.serif}`), document.fonts?.load(`400 34px ${FONTS.sans}`), document.fonts?.load(`400 96px ${FONTS.arabic}`, "كيف"),
    ].map((pr) => Promise.resolve(pr).catch(() => {}))).then(() => { E.redraw?.(); ask(); });

    return () => {
      removeEventListener("scroll", ask);
      removeEventListener("resize", ask);
      ro.disconnect(); io.disconnect();
      cancelAnimationFrame(E.raf); cancelAnimationFrame(E.spring); cancelAnimationFrame(E.hero);
      E.scene?.dispose();
      E.scene = null;
      sfx.current?.dispose();
      engine.current = null;
    };
  }, [createScene]);

  // The label and the engraving follow the recipe; the bottle springs to its size.
  useLayoutEffect(() => {
    const E = engine.current;
    if (!E) return;
    E.redraw = () => {
      if (!E.scene) return;
      const L = live.current;
      E.scene.drawLabel({ name, kind: t(`site.home.hero3d.kind.${KIND[L.pct]}`), figures: `${L.size} mL · ${L.pct}%`, ar });
      E.scene.drawEngrave(`${L.size} mL`);
    };
    E.redraw();
    E.kick();
    E.apply();
  }, [name, size, pct, ar, t]);

  useEffect(() => { sfx.current?.setOn(sound); }, [sound]);

  const drag = {
    onPointerDown: (e) => {
      const E = engine.current;
      if (!E?.scene) return;
      Object.assign(E, { dragging: true, x0: e.clientX, y0: e.clientY, yaw0: E.yaw, yawV: 0 });
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* old browsers */ }
      E.kick();
    },
    onPointerMove: (e) => {
      const E = engine.current;
      if (!E?.dragging) return;
      E.yaw = Math.max(-2.6, Math.min(2.6, E.yaw0 + (e.clientX - E.x0) * 0.012));
      E.pitch = Math.max(-0.12, Math.min(0.12, (e.clientY - E.y0) * 0.0015));
    },
    onPointerUp: () => { const E = engine.current; if (E?.dragging) { E.dragging = false; E.kick(); } },
  };
  drag.onPointerCancel = drag.onPointerUp;

  const href = `/bench?${new URLSearchParams({ size: String(size), unit: "ml", conc: String(pct), ...(name.trim() ? { name: name.trim() } : {}), ref: "home" })}`;
  const cap = (i) => (el) => { caps.current[i] = el; };
  const label = `${TYPE.label}`;

  return (
    <section ref={track} data-hero3d className="h3" aria-labelledby="h3-title" style={{ height: `${T.TRACK_VH}vh` }}>
      <div className="h3-stage">
        <div ref={vis} className="h3-vis">
          <div dir="ltr" className="relative w-full h-full overflow-clip">
            <div ref={host} className="h3-gl" {...drag} />
            <div ref={labels} aria-hidden="true">
              {notes.slice(0, NOTE_DROPS).map((n, i) => <div key={i} className="h3-pt"><span className="font-serif">{n}</span></div>)}
            </div>
            <div ref={readPill} className="h3-read" aria-hidden="true">
              <span ref={tare} className="text-[12px] tracking-[.14em] uppercase" style={{ opacity: 0.35 }}>{t("site.home.hero3d.tare")}</span>
              <span className="flex gap-1.5 items-baseline tabular-nums">
                <span ref={readout} className="text-[22px] font-light">0.00</span>
                <span className="text-[13px]" style={{ color: "#C9B496" }}>{t("site.home.hero3d.grams")}</span>
              </span>
            </div>
            {gl && <div ref={hint} aria-hidden="true" className="absolute end-4 top-4 text-[12px] pointer-events-none" style={{ color: COLORS.inkSoft, opacity: 0 }}>{t("site.home.hero3d.drag")}</div>}
          </div>
        </div>

        <div className="h3-caps">
          <div ref={cap(0)} className="h3-cap" data-first="" style={{ gap: 16 }}>
            <p className={label} style={{ color: COLORS.inkSoft }}>{t("site.home.hero3d.eyebrow")}</p>
            <h1 id="h3-title" className={H1}>
              {hero.map((line, i) => <span key={line} className={`block ${i === hero.length - 1 ? "italic rtl:not-italic" : ""}`}>{line}</span>)}
            </h1>
            <p className={LEAD} style={{ color: COLORS.inkSoft }}>{t("site.home.hero3d.intro")}</p>
            <div className="flex flex-wrap gap-x-4 sm:gap-x-7 gap-y-4 items-center mt-1">
              <div className="flex flex-col gap-1.5">
                <div dir="ltr" className="flex gap-3.5 items-center">
                  <Dial values={T.STRENGTHS} value={pct} onChange={setPct} railX={60} label={t("site.home.hero3d.strength")}
                    valueText={`${pct}% ${TIER_NAME[pct]}`} tickLabel={(v) => TIER_NAME[v]} fill={T.oilShade(pct)} />
                  <div className="h3-info flex flex-col gap-1 min-w-[96px] tabular-nums">
                    <span className="text-[26px] leading-none">{pct}%</span>
                    <span className="text-[11px] uppercase tracking-[.1em]" style={{ color: COLORS.inkSoft }}>{TIER_NAME[pct]}</span>
                    <span className="mt-1.5 text-[12px]" dir={ar ? "rtl" : "ltr"}>{t("site.home.hero3d.oilMl", { ml: (size * pct / 100).toFixed(1) })}</span>
                    <span className="text-[12px]" dir={ar ? "rtl" : "ltr"}>{t("site.home.hero3d.alcMl", { ml: (size * (1 - pct / 100)).toFixed(1) })}</span>
                  </div>
                </div>
                <p className="text-[12px]" style={{ color: COLORS.inkSoft }}>{t("site.home.hero3d.strength")}</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <div dir="ltr" className="flex gap-3.5 items-center">
                  <Dial values={T.SIZES} value={size} onChange={setSize} railX={56} label={t("site.home.hero3d.size")}
                    valueText={t("site.home.hero3d.sizeValue", { size })} fill="#B08D57" />
                  <div className="h3-info flex flex-col gap-1 min-w-[80px] tabular-nums">
                    <span className="text-[26px] leading-none">{size}</span>
                    <span className="text-[11px] uppercase tracking-[.1em]" style={{ color: COLORS.inkSoft }}>mL</span>
                    <span className="mt-1.5 text-[12px]" dir={ar ? "rtl" : "ltr"}>{t("site.home.hero3d.batch", nums)}</span>
                  </div>
                </div>
                <p className="text-[12px]" style={{ color: COLORS.inkSoft }}>{t("site.home.hero3d.size")}</p>
              </div>
            </div>
          </div>

          <div ref={cap(1)} className="h3-cap">
            <p className={label} style={{ color: COLORS.inkSoft }}>{t("site.home.hero3d.step1")}</p>
            <h2 className={H2}>{t("site.home.hero3d.oilTitle")}</h2>
            <p className={LEAD} style={{ color: COLORS.inkSoft }}>{t("site.home.hero3d.oilText", nums)}</p>
            <ul className="flex flex-col gap-1.5 mt-1.5 ps-3.5" style={{ borderInlineStart: `1.5px solid ${COLORS.ink}` }}>
              {tiers.map((tr, i) => (
                <li key={tr.id} ref={(el) => { tierEls.current[i] = el; }} className="flex gap-3 items-baseline" style={{ opacity: 0.3 }}>
                  <span className="text-[12px] uppercase tracking-[.12em] min-w-[52px]">{t(`site.home.hero3d.tiers.${tr.id}`)}</span>
                  <span className="font-serif italic rtl:not-italic text-[16px]" style={{ color: COLORS.inkSoft }}>{tr.notes}</span>
                </li>
              ))}
            </ul>
          </div>

          <div ref={cap(2)} className="h3-cap">
            <p className={label} style={{ color: COLORS.inkSoft }}>{t("site.home.hero3d.step2")}</p>
            <h2 className={H2}>{t("site.home.hero3d.alcTitle")}</h2>
            <p className={LEAD} style={{ color: COLORS.inkSoft }}>{t("site.home.hero3d.alcText", nums)}</p>
          </div>

          <div ref={cap(3)} className="h3-cap">
            <p dir="ltr" className="text-[14px] tabular-nums text-start" style={{ color: COLORS.inkSoft }}>{t("site.home.hero3d.sum", nums)}</p>
            <h2 className={H2}>{t("site.home.hero3d.mixTitle", nums)}</h2>
            <p className={LEAD} style={{ color: COLORS.inkSoft }}>{t("site.home.hero3d.mixText", nums)}</p>
          </div>

          <div ref={cap(4)} className="h3-cap" style={{ gap: 16 }}>
            <p className="text-[14px] tabular-nums" style={{ color: COLORS.inkSoft }}>{t("site.home.hero3d.endEyebrow", nums)}</p>
            <h2 className={H2}>{t("site.home.hero3d.endTitle")}</h2>
            <label className="flex flex-col gap-1.5 max-w-[360px]">
              <span className="text-[12px]" style={{ color: COLORS.inkSoft }}>{t("site.home.hero3d.nameLabel")}</span>
              <input className="h3-name font-serif italic rtl:not-italic" value={name} maxLength={28} onChange={(e) => setName(e.target.value)} />
            </label>
            <div className="flex">
              <a className="h3-cta" href={href}>{t("site.home.hero3d.cta", nums)} <IconArrow size={18} /></a>
            </div>
          </div>
        </div>

        <div className="h3-pill">
          <div className="flex items-center gap-1 ps-[18px] pe-1 py-1">
            <span ref={beat} aria-hidden="true" className="text-[13px] min-w-[96px] whitespace-nowrap" style={{ color: "var(--h3-pill-text)" }}>{beats[0]}</span>
            <span aria-hidden="true" style={{ width: 1, height: 20, background: "#4A3421", margin: "0 4px" }} />
            <button type="button" aria-pressed={sound} onClick={() => setSound((s) => !s)}>{t(sound ? "site.home.hero3d.soundOn" : "site.home.hero3d.soundOff")}</button>
          </div>
          <div className="h3-rail" aria-hidden="true"><i ref={rail} /></div>
        </div>
      </div>
    </section>
  );
}
