import React, { useEffect, useRef } from "react";
import { motionOn, reduced, lowPower } from "./env.js";

// Pointer-driven marks. Everything here is for a fine pointer only (a mouse or
// a trackpad): on touch, under reduced motion and on low power the markup is
// plain and nothing listens. All three move only `transform` / `translate` and
// are written once a frame, never through React state.

const cx = (...a) => a.filter(Boolean).join(" ");

/** A fine pointer, the layer on, the reader fine with motion. Read at use. */
export function pointerMotion() {
  return typeof window !== "undefined" && motionOn() && !reduced() && !lowPower() && matchMedia("(pointer: fine)").matches;
}

/**
 * Soft resin light behind the content of its parent (which must be
 * `position: relative`). `plain` leaves the look to the caller (only the pointer variables are written). It drifts a few dozen px toward the pointer, and the
 * stylesheet fades and lifts it with scroll. Decorative.
 */
export function Light({ className, plain = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    const host = el?.parentElement;
    if (!host || !pointerMotion()) return undefined;
    let raf = 0;
    let x = 0;
    let y = 0;
    const paint = () => {
      raf = 0;
      el.style.setProperty("--lx", x.toFixed(3));
      el.style.setProperty("--ly", y.toFixed(3));
    };
    const move = (e) => {
      const r = host.getBoundingClientRect();
      x = (e.clientX - r.left) / r.width * 2 - 1;
      y = (e.clientY - r.top) / r.height * 2 - 1;
      raf = raf || requestAnimationFrame(paint);
    };
    const leave = () => { x = 0; y = 0; raf = raf || requestAnimationFrame(paint); };
    host.addEventListener("pointermove", move, { passive: true });
    host.addEventListener("pointerleave", leave);
    return () => { cancelAnimationFrame(raf); host.removeEventListener("pointermove", move); host.removeEventListener("pointerleave", leave); };
  }, []);
  return <span ref={ref} aria-hidden="true" className={plain ? className : cx("mo-light", className)} />;
}

/**
 * Leans toward the pointer: up to `pull` px (6 by default) when the pointer is
 * within `reach` px of the element. Eased back on leave. For buttons and links.
 */
export const Magnetic = React.forwardRef(function Magnetic({ as: Tag = "a", pull = 6, reach = 36, className, style, children, ...rest }, fwd) {
  const own = useRef(null);
  const ref = fwd || own;
  useEffect(() => {
    const el = ref.current;
    if (!el || !pointerMotion()) return undefined;
    let raf = 0;
    let t = "0px 0px";
    const paint = () => { raf = 0; el.style.translate = t; };
    const move = (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const near = Math.abs(dx) < r.width / 2 + reach && Math.abs(dy) < r.height / 2 + reach;
      const k = near ? pull / Math.max(r.width, r.height) * 2 : 0;
      t = `${(dx * k).toFixed(2)}px ${(dy * k).toFixed(2)}px`;
      raf = raf || requestAnimationFrame(paint);
    };
    const leave = () => { t = "0px 0px"; raf = raf || requestAnimationFrame(paint); };
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("pointermove", move); document.removeEventListener("pointerleave", leave); el.style.translate = ""; };
  }, [pull, reach, ref]);
  return <Tag ref={ref} className={cx("mo-magnetic", className)} style={style} {...rest}>{children}</Tag>;
});

/**
 * Tilts up to `max` degrees toward the pointer, with a light perspective. For
 * cards; keep real content flat (no text smaller than the card's own).
 */
export function Tilt({ as: Tag = "div", max = 3, className, style, children, ...rest }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !pointerMotion()) return undefined;
    let raf = 0;
    let rx = 0;
    let ry = 0;
    const paint = () => { raf = 0; el.style.transform = rx || ry ? `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)` : ""; };
    const move = (e) => {
      const r = el.getBoundingClientRect();
      // Follows the pointer in screen space, so it is the same in both directions.
      ry = ((e.clientX - r.left) / r.width - 0.5) * 2 * max;
      rx = -((e.clientY - r.top) / r.height - 0.5) * 2 * max;
      raf = raf || requestAnimationFrame(paint);
    };
    const leave = () => { rx = 0; ry = 0; raf = raf || requestAnimationFrame(paint); };
    el.addEventListener("pointermove", move, { passive: true });
    el.addEventListener("pointerleave", leave);
    return () => { cancelAnimationFrame(raf); el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); el.style.transform = ""; };
  }, [max]);
  return <Tag ref={ref} className={cx("mo-tilt", className)} style={style} {...rest}>{children}</Tag>;
}
