// State of the "poured vs target" bar on the scale readout. Pure.
//   fraction  how full the bar is, 0..1 (an over-pour fills it)
//   state     "under" until the target is reached within `tolerance` (a
//             fraction of the target: 0.05 = within 5%), "ok" inside the
//             band, "over" past it. A target of 0 or less is never reached.
export function pourProgress(poured, target, tolerance = 0.05) {
  const p = Number(poured);
  const t = Number(target);
  if (!Number.isFinite(p) || !Number.isFinite(t) || t <= 0) return { fraction: 0, state: "under" };
  const fraction = Math.min(1, Math.max(0, p / t));
  const band = t * Math.max(0, tolerance);
  const state = p < t - band ? "under" : p <= t + band ? "ok" : "over";
  return { fraction, state };
}
