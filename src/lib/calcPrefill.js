export const UNIT_LABELS = { ml: "mL", floz: "fl oz", g: "g", oz: "oz" };

// Starting values from the URL (?size=100&unit=ml&conc=25), e.g. a guide's
// "Open in calculator" link. Anything missing or out of range is ignored.
export function prefillFromQuery(params) {
  const size = Number(params.get("size"));
  const unit = params.get("unit");
  const conc = Number(params.get("conc"));
  return {
    size: Number.isFinite(size) && size > 0 && size <= 100000 ? size : null,
    unit: Object.hasOwn(UNIT_LABELS, unit) ? unit : null,
    conc: Number.isFinite(conc) && conc >= 1 && conc <= 100 ? conc : null,
  };
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
