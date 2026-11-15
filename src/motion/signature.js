import { TOKENS } from "./config.js";
import { calm, lowPower, motionOn } from "./env.js";
import { onScreen } from "./carry.js";

// Motion M4, the product's signature: "a logged batch is filed into the
// Journal". When a batch is logged, the bottle is capped, its label written
// ("No. 072"), and it travels to the Journal tab, which takes it. About
// 900 ms (the slow step and two fast ones), never in the way: the page stays
// usable, any tap or key skips it, and it is decoration (aria-hidden) beside
// the words of record ("Logged as No. 072"). Reduced motion, the layer off or
// a low-power device: no travel, the words only. The path is pure and tested.

/** The whole moment, in ms: the slow step and two fast ones. */
export const SIGNATURE_MS = TOKENS.duration.slow + 2 * TOKENS.duration.fast;

/** Where each beat ends, as a share of SIGNATURE_MS. */
export const BEATS = Object.freeze({ cap: 0.2, label: 0.38, travel: 0.88, take: 1 });

const centre = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

/**
 * The bottle's keyframes, as translations from where it starts (the centre of
 * `from`) to the centre of `to`, both screen boxes. It is capped (a small
 * press), labelled, lifted on an arc above the straight line (by `lift`, at
 * least the distance's fifth), shrunk to `endScale` and taken (faded) in the
 * tab. Left and right are the boxes' own, so Arabic needs nothing more.
 */
export function filePath(from, to, { endScale = 0.35, lift } = {}) {
  const a = centre(from);
  const b = centre(to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const up = lift ?? Math.max(24, Math.hypot(dx, dy) / 5);
  const r = (n) => Math.round(n * 10) / 10;
  // The travel is a quadratic curve whose highest point, halfway, is `up` above the straight line.
  const arc = [0.25, 0.5, 0.75].map((u) => ({
    offset: BEATS.label + (BEATS.travel - BEATS.label) * u,
    x: r(dx * u),
    y: r(dy * u - 4 * up * u * (1 - u)),
    scale: r((1 + (endScale - 1) * u) * 100) / 100,
    opacity: 1,
  }));
  return [
    { offset: 0, x: 0, y: 0, scale: 1, opacity: 1 },
    { offset: BEATS.cap / 2, x: 0, y: 2, scale: 0.96, opacity: 1 }, // the cap pressed home
    { offset: BEATS.cap, x: 0, y: 0, scale: 1, opacity: 1 },
    { offset: BEATS.label, x: 0, y: 0, scale: 1, opacity: 1 }, // the label written
    ...arc,
    { offset: BEATS.travel, x: r(dx), y: r(dy), scale: endScale, opacity: 1 },
    { offset: BEATS.take, x: r(dx), y: r(dy), scale: endScale * 0.8, opacity: 0 }, // taken by the tab
  ];
}

/** CSS keyframes for the Web Animations API from filePath(). */
export const toKeyframes = (path) => path.map(({ offset, x, y, scale, opacity }) => ({
  offset, opacity, transform: `translate(${x}px, ${y}px) scale(${scale})`,
}));

/** Whether the signature can play now (else the words alone say it). */
export const canSign = () => motionOn() && !calm() && !lowPower();

const visible = (el) => Boolean(el?.isConnected) && onScreen(el.getBoundingClientRect(), window.innerWidth, window.innerHeight);

/**
 * Where the bottle goes: the Journal tab on screen (the phone bar, or the wide
 * tab row), else the way into the Journal the page offers after a log
 * ([data-journal-door], "Open the Journal"), since the wide tab row scrolls away.
 */
export function journalTab() {
  return [...document.querySelectorAll('[data-tab="journal"]')].find(visible)
    ?? [...document.querySelectorAll("[data-journal-door]")].find(visible) ?? null;
}

const SVG_NS = "http://www.w3.org/2000/svg";
function bottle() {
  // A small capped flacon in the theme's ink and oil (CSS custom properties, so it follows the theme).
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", "44");
  svg.setAttribute("height", "56");
  svg.setAttribute("viewBox", "0 0 44 56");
  svg.innerHTML = '<rect x="15" y="2" width="14" height="9" fill="var(--c-ink)"/>'
    + '<path d="M17 11h10v5l9 7v29H8V23l9-7z" fill="var(--c-card)" stroke="var(--c-ink)" stroke-width="1.5"/>'
    + '<path d="M9.5 34h25v16.5h-25z" fill="var(--c-amber)" opacity=".85"/>';
  return svg;
}

/**
 * Plays the signature from the box `from` (where the batch was made: the
 * flacon, else the Log button) to the Journal tab. Returns false when it does
 * not play. `label` is the label's words ("No. 072").
 */
export function fileBatch({ from, label, to }) {
  if (!canSign() || !from || !document.body.animate) return false;
  // Where it starts is read now (the Log button may give way to "Open the
  // Journal"); where it goes, once the page has drawn the result.
  const start = from.getBoundingClientRect ? from.getBoundingClientRect() : from;
  if (!onScreen(start, window.innerWidth, window.innerHeight)) return false;
  requestAnimationFrame(() => requestAnimationFrame(() => play(start, label, to ?? journalTab())));
  return true;
}

function play(start, label, to) {
  if (!to) return;
  const end = to.getBoundingClientRect();
  const ghost = document.createElement("div");
  ghost.setAttribute("aria-hidden", "true");
  ghost.setAttribute("data-mo-signature", "");
  const c = centre(start);
  Object.assign(ghost.style, {
    position: "fixed", left: `${c.x - 22}px`, top: `${c.y - 28}px`, width: "44px", height: "56px",
    pointerEvents: "none", zIndex: "60", transformOrigin: "50% 50%", willChange: "transform, opacity",
  });
  ghost.appendChild(bottle());
  const tag = document.createElement("span");
  tag.textContent = label ?? "";
  Object.assign(tag.style, {
    position: "absolute", top: "30px", insetInlineStart: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap",
    fontSize: "10px", fontWeight: "600", lineHeight: "1.2", padding: "1px 4px", background: "var(--c-paper)", color: "var(--c-ink)",
    border: "1px solid var(--c-ink)", opacity: "0", // the page's own direction: "رقم 072" reads right to left
  });
  ghost.appendChild(tag);
  document.body.appendChild(ghost);

  const move = ghost.animate(toKeyframes(filePath(start, end)), { duration: SIGNATURE_MS, easing: "linear", fill: "both" });
  // The label is written once the cap is on, and stays until the bottle is taken.
  const write = tag.animate(
    [{ opacity: 0, offset: 0 }, { opacity: 0, offset: BEATS.cap }, { opacity: 1, offset: BEATS.label }, { opacity: 1, offset: 1 }],
    { duration: SIGNATURE_MS, easing: TOKENS.ease.out, fill: "both" },
  );
  const skip = () => { move.finish(); write.finish(); };
  const opts = { capture: true, passive: true };
  window.addEventListener("pointerdown", skip, opts);
  window.addEventListener("keydown", skip, opts);
  const done = () => {
    window.removeEventListener("pointerdown", skip, opts);
    window.removeEventListener("keydown", skip, opts);
    ghost.remove();
    // The tab takes it: a short settle on the tab, no bounce.
    to.setAttribute("data-mo-took", "");
    to.animate?.([{ transform: `translateY(-${TOKENS.distance.xs}px)` }, { transform: "none" }], { duration: TOKENS.duration.base, easing: TOKENS.ease.out })
      ?.finished.finally(() => to.removeAttribute("data-mo-took"));
  };
  move.finished.then(done, done);
}
