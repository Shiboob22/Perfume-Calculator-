import React, { useMemo } from "react";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { buildCurve, MIN_CURVE_NOTES } from "../../lib/calc";

// A batch's own ratings drawn against rest day (Journal J3). The geometry is
// buildCurve() in lib/calc/curve.ts; this draws it: ink line, a dot per rated
// note, the peak ringed, the five milestones along the foot. The line is
// drawn once on view (CSS, off under reduced motion). The drawing is
// aria-hidden: the words below it (a summary and one line per note) are the
// text of record. The curve only draws from three rated notes; before that a
// plain line says how many are still needed. Only the owner's own notes, worded
// as their history.
const BOX = { width: 600, height: 150, pad: { top: 14, right: 18, bottom: 26, left: 18 } };

export default function MaturationCurve({ checkins, t }) {
  const { locale } = useI18n();
  const rtl = locale === "ar";
  const curve = useMemo(() => buildCurve(checkins, { ...BOX, rtl }), [checkins, rtl]);
  const name = (k) => t(`journal.page.milestones.${k}`);
  const { points, peak, enough } = curve;
  // A milestone's name is written only when it clears the one before it; its tick always shows.
  const labelled = new Set();
  let lastX = -Infinity;
  curve.ticks.forEach((tk) => { if (tk.x - lastX >= 75) { labelled.add(tk.k); lastX = tk.x; } });
  if (!points.length) return null;

  return (
    <section data-curve aria-labelledby="journal-curve" className="mt-7">
      <h3 id="journal-curve" className="font-serif text-xl">{t("journal.page.curve.title")}</h3>
      <p className="mt-1 text-sm" style={{ color: COLORS.inkSoft }}>
        {!enough
          ? t("journal.page.curve.few", { have: points.length, need: MIN_CURVE_NOTES })
          : peak
            ? t("journal.page.curve.peak", { milestone: name(peak.k), rating: peak.rating })
            : t("journal.page.curve.drawn")}
      </p>
      {enough && (
        <svg data-curve-svg viewBox={`0 0 ${BOX.width} ${BOX.height}`} role="img" aria-hidden="true" focusable="false"
          className="mt-3 w-full h-auto" style={{ maxHeight: 190, overflow: "visible" }}>
          <line x1={BOX.pad.left} x2={BOX.width - BOX.pad.right} y1={BOX.height - BOX.pad.bottom} y2={BOX.height - BOX.pad.bottom} stroke={COLORS.line} strokeWidth="1" />
          {curve.ticks.map((tk, i) => (
            <g key={tk.k}>
              <line x1={tk.x} x2={tk.x} y1={BOX.height - BOX.pad.bottom} y2={BOX.height - BOX.pad.bottom + 4} stroke={COLORS.line} strokeWidth="1" />
              {labelled.has(tk.k) && <text x={tk.x} y={BOX.height - 6} textAnchor={i === 0 ? "start" : i === curve.ticks.length - 1 ? "end" : "middle"} fontSize="11" fill={COLORS.dim}>{name(tk.k)}</text>}
            </g>
          ))}
          <path className="kx-curve-line" d={curve.path} pathLength="1" fill="none" stroke={COLORS.ink} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
          {points.map((p) => (
            <g key={p.id}>
              {peak?.id === p.id && <circle cx={p.x} cy={p.y} r="9" fill="none" stroke={COLORS.amber} strokeWidth="1.5" />}
              <circle cx={p.x} cy={p.y} r="4" fill={COLORS.amber} stroke={COLORS.ink} strokeWidth="1" />
            </g>
          ))}
        </svg>
      )}
      <ul className="mt-3 flex flex-col gap-1 text-sm">
        {points.map((p) => (
          <li key={p.id} data-curve-note={p.day} className="flex flex-wrap gap-x-2" style={{ color: COLORS.inkSoft }}>
            <span className="font-medium" style={{ color: COLORS.ink }}>{t("journal.page.curve.point", { day: p.day, rating: p.rating })}</span>
            {p.tags.length > 0 && <span>{p.tags.map((g) => t(`journal.page.tag.${g}`)).join(", ")}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
