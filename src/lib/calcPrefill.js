import { TIER_KEYS } from "./formulation";
import { cleanName } from "./cleanName.js";

export { cleanName };

export const UNIT_LABELS = { ml: "mL", floz: "fl oz", g: "g", oz: "oz" };

// Starting values from the URL (?size=100&unit=ml&conc=25&family=woody&name=…),
// e.g. a guide's "Open in calculator" link or a shared recipe's "Make this
// blend". Anything missing or out of range is ignored.
export function prefillFromQuery(params) {
  const size = Number(params.get("size"));
  const unit = params.get("unit");
  const conc = Number(params.get("conc"));
  const family = params.get("family");
  return {
    size: Number.isFinite(size) && size > 0 && size <= 100000 ? size : null,
    unit: Object.hasOwn(UNIT_LABELS, unit) ? unit : null,
    conc: Number.isFinite(conc) && conc >= 1 && conc <= 100 ? conc : null,
    family: TIER_KEYS.includes(family) ? family : null,
    name: cleanName(params.get("name")),
  };
}

// The public page that brought a new user (?ref=recipe|guide|home), as
// a short slug for profiles.signup_ref; null when absent or malformed.
export function refFrom(search) {
  const ref = new URLSearchParams(search).get("ref");
  return ref && /^[a-z0-9_-]{1,60}$/.test(ref) ? ref : null;
}

// Where onboarding sends someone who arrived on a calculator link: the
// link's values win, and the onboarding answers fill only the bottle the
// link left out. Without a link it is the answers' bottle, as before.
export function afterOnboardingPath(search, answers = {}) {
  const link = prefillFromQuery(new URLSearchParams(search));
  const linkBottle = link.size != null || link.unit != null;
  const size = linkBottle ? link.size : Number(answers.default_bottle);
  const unit = linkBottle ? link.unit : answers.default_unit;
  const q = new URLSearchParams();
  if (Number.isFinite(size) && size > 0 && size <= 100000) q.set("size", String(size));
  if (Object.hasOwn(UNIT_LABELS, unit ?? "")) q.set("unit", unit);
  if (link.conc != null) q.set("conc", String(link.conc));
  if (link.family) q.set("family", link.family);
  if (link.name) q.set("name", link.name);
  const query = q.toString();
  return query ? `/app/calculator?${query}` : "/app/calculator";
}

// Where the calculator opens: a link's size/unit wins; otherwise the
// user's saved usual bottle; otherwise 100 mL. A saved size is only used
// with its own saved unit — "50" means nothing without knowing 50 of what.
export function startingBottle(prefill, profile) {
  if (prefill.size != null || prefill.unit != null) {
    return { size: prefill.size ?? 100, unit: prefill.unit ?? "ml" };
  }
  const size = Number(profile?.default_bottle);
  const unit = profile?.default_unit;
  if (Number.isFinite(size) && size > 0 && Object.hasOwn(UNIT_LABELS, unit)) return { size, unit };
  return { size: 100, unit: Object.hasOwn(UNIT_LABELS, unit) ? unit : "ml" };
}
