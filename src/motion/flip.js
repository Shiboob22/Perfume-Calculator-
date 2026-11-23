import { useLayoutEffect, useRef } from "react";
import { TOKENS } from "./config.js";
import { calm, motionOn } from "./env.js";

// Motion M3, hold: a list that changes order shows the change. FLIP: the
// rows' places are read before the change (First), after it (Last), and each
// row that moved starts at its old place and slides to its new one (Invert,
// Play), by transform only. The arithmetic is pure and tested (flip.test.js).

/**
 * The moves for rows present before and after: { key, dx, dy } for each row
 * whose place changed by at least `min` px. Only rows that are on screen
 * before or after (between `top` and `bottom`, page coordinates) are moved,
 * so a long list costs no more than a screenful; at most `max` rows move.
 * `before` and `after` are Maps of key → { x, y } (page coordinates).
 */
export function flipDeltas(before, after, { min = 1, top = -Infinity, bottom = Infinity, height = 0, max = 40 } = {}) {
  const out = [];
  for (const [key, b] of after) {
    const a = before.get(key);
    if (!a) continue;
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    if (Math.abs(dx) < min && Math.abs(dy) < min) continue;
    const seen = (y) => y + height > top && y < bottom;
    if (!seen(a.y) && !seen(b.y)) continue;
    out.push({ key, dx: Math.round(dx * 10) / 10, dy: Math.round(dy * 10) / 10 });
    if (out.length >= max) break;
  }
  return out;
}

/** The keys that are new in `after` (they arrive; they are not moved). */
export function flipEntered(before, after) {
  return [...after.keys()].filter((k) => !before.has(k));
}

const place = (el) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + window.scrollX, y: r.top + window.scrollY, h: r.height };
};

/**
 * Slides the children of `ref` (each marked data-flip="<key>") to their new
 * places when `order` (a string that changes with the order, e.g. the keys
 * joined) changes. New rows settle in. Nothing moves with the layer off, under
 * reduced motion, or on the first render.
 */
export function useFlip(ref, order) {
  const last = useRef(null); // the order whose places are in `places`
  const places = useRef(new Map());
  // Read the places before the DOM changes: during render, the DOM still shows the last commit.
  if (typeof window !== "undefined" && ref.current && last.current !== null && last.current !== order && places.current.size === 0) {
    for (const el of ref.current.querySelectorAll("[data-flip]")) places.current.set(el.getAttribute("data-flip"), place(el));
  }
  useLayoutEffect(() => {
    const root = ref.current;
    const before = places.current;
    places.current = new Map();
    const first = last.current === null;
    last.current = order;
    if (first || !root || !before.size || !motionOn() || calm() || !root.animate) return;
    const els = new Map([...root.querySelectorAll("[data-flip]")].map((el) => [el.getAttribute("data-flip"), el]));
    const after = new Map([...els].map(([k, el]) => [k, place(el)]));
    const h = [...after.values()][0]?.h ?? 0;
    const moves = flipDeltas(before, after, { top: window.scrollY, bottom: window.scrollY + window.innerHeight, height: h });
    for (const { key, dx, dy } of moves) {
      els.get(key).animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
        { duration: TOKENS.duration.base, easing: TOKENS.ease.inOut },
      );
    }
    for (const key of flipEntered(before, after)) {
      els.get(key).animate(
        // As kx-settle: a 4 px rise, the words whole by 60 % of the base step (so within the fast one).
        [{ opacity: 0, transform: `translateY(${TOKENS.distance.xs}px)` }, { opacity: 1, offset: 0.6 }, { opacity: 1, transform: "none" }],
        { duration: TOKENS.duration.base, easing: TOKENS.ease.out },
      );
    }
  }, [order]); // eslint-disable-line react-hooks/exhaustive-deps
}
