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
