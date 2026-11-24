import React, { useEffect, useRef, useState } from "react";
import media from "./media.json";
import { flagOn } from "../lib/flags";
import { reduced, lowPower } from "../motion/env";
import { useI18n } from "../i18n/I18nProvider";
import { IconPause, IconPlay } from "../components/icons";

// The brand photographs and films (brand book "05. Imagery") on the public
// pages, behind the `imagery` flag. Made by scripts/make-imagery.mjs.
// Nothing here is in the first view or the critical path: photos are lazy
// AVIF with a JPEG fallback, films are not fetched until they near the screen,
// and the service worker never precaches /media.
const BASE = "/media/";
// Brand book Obsidian: every photo is dark, so a box never flashes light while it loads.
export const GROUND = "#1B1814";

/** The flag, read like useCompounding: build flag on the first render (same HTML as the prerender), device flag after. */
export function useImagery() {
  const [on, setOn] = useState(() => flagOn("imagery", { storage: null }));
  useEffect(() => { if (!on && flagOn("imagery")) setOn(true); }, [on]);
  return on;
}

/** A photograph: fixed box (no layout shift), lazy unless `priority` (the hero), decorative unless given `alt`. */
export function Photo({ name, alt = "", sizes = "100vw", ratio, className = "", priority = false }) {
  const m = media.photos[name];
  return (
    <picture className={`block overflow-hidden ${className}`} style={{ background: GROUND, aspectRatio: ratio ?? `${m.w} / ${m.h}` }}>
      <source type="image/avif" srcSet={m.widths.map((w) => `${BASE}${name}-${w}.avif ${w}w`).join(", ")} sizes={sizes} />
      <img src={`${BASE}${name}.jpg`} alt={alt} width={m.w} height={m.h} loading={priority ? "eager" : "lazy"} fetchpriority={priority ? "high" : undefined} decoding="async" className="block w-full h-full object-cover" />
    </picture>
  );
}

/**
 * The hero's photograph, full bleed behind the headline. The section that
 * holds it carries `kx-dark` (the dark palette, contrast-tested) so the text
 * reads on the photo in both themes; the scrim darkens the reading side.
 */
export const HERO_PHOTO = "hero"; // the measuring photo, lighter (scripts/make-imagery.mjs)
export function HeroPhoto() {
  return (
    <div aria-hidden="true" className="absolute inset-0">
      <Photo name={HERO_PHOTO} priority ratio="auto" sizes="100vw" className="w-full h-full" />
      <div className="absolute inset-0 bg-gradient-to-r rtl:bg-gradient-to-l from-[#15120F]/95 via-[#15120F]/60 to-[#15120F]/5" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#15120F]/70 to-transparent" />
    </div>
  );
}

/**
 * An ambient film: muted, looped, no sound track. Nothing loads until it is
 * within NEAR of the screen; it plays only while on screen and the tab is
 * visible, and has a pause button (WCAG 2.2.2: moving content over 5 s).
 * Reduced motion, Save-Data or a low-power device get the still poster.
 */
const NEAR = "300px 0px";
const SETTLE_MS = 250;

export function Film({ name, ratio, className = "" }) {
  const { t } = useI18n();
  const m = media.films[name];
  const box = useRef(null);
  const video = useRef(null);
  const [near, setNear] = useState(false);
  const [still, setStill] = useState(true); // the prerender and first render show no film
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setStill(reduced() || lowPower());
    // Near for SETTLE_MS, not just once: the layout can grow right after
    // hydration (a lazy scene swapping in), and a film that was near in the
    // first frame may end up far down the page.
    let timer = 0;
    const io = new IntersectionObserver(([e]) => {
      clearTimeout(timer);
      if (e.isIntersecting) timer = setTimeout(() => { setNear(true); io.disconnect(); }, SETTLE_MS);
    }, { rootMargin: NEAR });
    io.observe(box.current);
    return () => { clearTimeout(timer); io.disconnect(); };
  }, []);

  // Play only while visible: on screen and in a visible tab, and not paused by the reader.
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    let onScreen = false;
    // Default: play only on screen, in a visible tab, unless the reader paused it; a blocked autoplay keeps the poster.
    const sync = () => {
      if (onScreen && !document.hidden && !paused) v.play().catch(() => {});
      else v.pause();
    };
    const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; sync(); });
    io.observe(v);
    document.addEventListener("visibilitychange", sync);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", sync); };
  }, [near, still, paused]);

  const poster = `${BASE}${name}-poster.avif`;
  return (
    <div ref={box} aria-hidden={still ? "true" : undefined} className={`relative overflow-hidden ${className}`} style={{ background: GROUND, aspectRatio: ratio ?? `${m.w} / ${m.h}` }}>
      {near && (still
        ? <img src={poster} alt="" width={m.w} height={m.h} decoding="async" className="block w-full h-full object-cover" />
        : <>
            <video ref={video} muted loop playsInline preload="metadata" poster={poster} aria-hidden="true" tabIndex={-1}
              className="block w-full h-full object-cover" src={`${BASE}${name}.mp4`} />
            <button type="button" onClick={() => setPaused((p) => !p)} aria-label={t(paused ? "site.imagery.play" : "site.imagery.pause")}
              className="absolute bottom-3 end-3 inline-flex items-center justify-center w-11 h-11 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ background: "rgba(27,24,20,.6)", color: "#F4F1EA", outlineColor: "#F4F1EA" }}>
              {paused ? <IconPlay size={18} /> : <IconPause size={18} />}
            </button>
          </>)}
    </div>
  );
}
