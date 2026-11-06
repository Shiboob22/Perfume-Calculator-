// The Bench's guided tour (Bench SaaS Phase 7, prototype startTour / goTour /
// measureTour / tourVals). Pure: which steps, where the card goes, what a
// key does, the cost preview's count-up and whether the tour was seen. The
// component (components/tour/BenchTour.jsx) only measures and draws.

/** The six stops, in order; each is a [data-tour] target on the page. */
export const TOUR_STEPS = Object.freeze(["sheet", "blend", "scale", "pour", "cost", "upgrade"]);

/** The cost step's count-up, ms (prototype revealCost). */
export const COUNT_UP_MS = 800;

/** Where "seen" lives when the server can't say (signed out, offline). */
export const TOUR_SEEN_KEY = "kyphira.benchTourSeen";

/** Ease-out cubic for the count-up: 0 → 1 over p = 0 → 1. */
export function countUp(p) {
  const x = Math.min(1, Math.max(0, Number(p) || 0));
  return 1 - (1 - x) ** 3;
}

/**
 * What a key does while the tour is open: Escape skips, the arrows step,
 * mirrored in RTL (the arrow pointing along the reading direction is
 * "next"). Keys typed into a field are the field's.
 */
export function tourKeyAction(key, rtl = false, inField = false) {
  if (key === "Escape") return "skip";
  if (inField) return null;
  if (key === "ArrowRight") return rtl ? "back" : "next";
  if (key === "ArrowLeft") return rtl ? "next" : "back";
  return null;
}

/** Seen on the server (signed in) or in this browser. */
export const tourSeen = (profile, local) => Boolean(profile?.bench_tour_at) || Boolean(local);

/**
 * The card's place on a wide screen, in viewport pixels: beside the target
 * (on the reading-end side first), else below, else above, else the corner.
 * `r` is the target's rect ({ top, left, width, height }) or null; `vw`/`vh`
 * the viewport; `cw`/`ch` the card. Phones put the card at the bottom and
 * don't call this.
 */
export function placeCard(r, { vw, vh, cw, ch, rtl = false, gap = 24, margin = 16 }) {
  const clampTop = (y) => Math.max(margin, Math.min(y, vh - ch - margin));
  const clampLeft = (x) => Math.max(margin, Math.min(x, vw - cw - margin));
  const corner = { top: Math.max(margin, vh - ch - margin), left: rtl ? gap : Math.max(margin, vw - cw - gap), side: "corner" };
  if (!r) return corner;
  const right = r.left + r.width + gap + cw <= vw - margin ? { top: clampTop(r.top), left: r.left + r.width + gap, side: "right" } : null;
  const left = r.left - gap - cw >= margin ? { top: clampTop(r.top), left: r.left - gap - cw, side: "left" } : null;
  const beside = rtl ? left || right : right || left;
  if (beside) return round(beside);
  if (r.top + r.height + margin + ch <= vh) return round({ top: r.top + r.height + margin, left: clampLeft(r.left), side: "below" });
  if (r.top - margin - ch >= 0) return round({ top: r.top - margin - ch, left: clampLeft(r.left), side: "above" });
  return round(corner);
}

const round = (p) => ({ ...p, top: Math.round(p.top), left: Math.round(p.left) });

/** The strength the first stop shows: a change, so the readout visibly moves. */
export const tourStrength = (pct) => (Number(pct) === 25 ? 20 : 25);
