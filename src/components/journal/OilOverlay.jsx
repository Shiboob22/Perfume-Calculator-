import React, { useMemo } from "react";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { oilOverlay, bestOf, tierFor, STRENGTH_TIERS } from "../../lib/calc";

// "Your batches of this oil" (Journal J3, Pro): every batch of the same
// fragrance on one axis, a line per batch, told apart by colour and dash by
// strength tier, with the words below as the text of record. Only the
// owner's own notes; it says which batch rated best in their history and
// makes no claim about why.
const BOX = { width: 600, height: 170, pad: { top: 14, right: 18, bottom: 26, left: 18 } };
const LOOK = [
  { color: "verdigris", dash: undefined },
  { color: "amber", dash: "8 4" },
  { color: "ink", dash: undefined },
  { color: "danger", dash: "2 4" },
];
const lookOf = (pct) => LOOK[Math.max(0, STRENGTH_TIERS.findIndex((x) => x.name === tierFor(pct).name))];
const no = (b) => String(b.no).padStart(3, "0");

export default function OilOverlay({ batches, selectedId, locked, lockedCard, t }) {
  const { locale } = useI18n();
  const rtl = locale === "ar";
  const curves = useMemo(() => oilOverlay(batches, selectedId, { ...BOX, rtl }), [batches, selectedId, rtl]);
  if (!curves) return null;
  const name = (k) => t(`journal.page.milestones.${k}`);
  const best = bestOf(curves);
  const peakText = (c) => t("journal.page.oil.peak", { milestone: name(c.curve.peak.k), rating: c.curve.peak.rating });
  const label = (b) => t("journal.page.oil.who", { no: no(b), pct: b.pct, tier: tierFor(b.pct).name });

  return (
    <section data-oil aria-labelledby="journal-oil" className="mt-7">
      <h3 id="journal-oil" className="font-serif text-xl">{t("journal.page.oil.title")}</h3>
      {locked ? (
        lockedCard
      ) : (
        <>
          <p className="mt-1 text-sm" style={{ color: COLORS.inkSoft }}>
            {best
              ? t("journal.page.oil.best", { count: curves.length, who: label(best.batch), milestone: name(best.curve.peak.k), rating: best.curve.peak.rating })
              : t("journal.page.oil.none", { count: curves.length })}
          </p>
          <svg data-oil-svg viewBox={`0 0 ${BOX.width} ${BOX.height}`} aria-hidden="true" focusable="false"
            className="mt-3 w-full h-auto" style={{ maxHeight: 210, overflow: "visible" }}>
            <line x1={BOX.pad.left} x2={BOX.width - BOX.pad.right} y1={BOX.height - BOX.pad.bottom} y2={BOX.height - BOX.pad.bottom} stroke={COLORS.line} strokeWidth="1" />
            {curves[0].curve.ticks.map((tk, i, all) => (
              <text key={tk.k} x={tk.x} y={BOX.height - 6} textAnchor={i === 0 ? "start" : i === all.length - 1 ? "end" : "middle"} fontSize="11" fill={COLORS.dim}>
                {i === 1 ? "" : t(`journal.page.milestones.${tk.k}`)}
              </text>
            ))}
            {curves.map(({ batch, curve }) => {
              const look = lookOf(batch.pct);
              const on = batch.id === selectedId;
              return (
                <g key={batch.id} opacity={on ? 1 : 0.85}>
                  {curve.path && <path d={curve.path} fill="none" stroke={COLORS[look.color]} strokeWidth={on ? 2.5 : 1.5} strokeDasharray={look.dash} strokeLinejoin="round" strokeLinecap="round" />}
                  {curve.points.map((p) => <circle key={p.id} cx={p.x} cy={p.y} r={on ? 4 : 3} fill={COLORS[look.color]} stroke={COLORS.paper} strokeWidth="1" />)}
                </g>
              );
            })}
          </svg>
          <ul className="mt-3 flex flex-col gap-1 text-sm">
            {curves.map((c) => (
              <li key={c.batch.id} data-oil-row={c.batch.id} className="flex flex-wrap items-center gap-x-2" style={{ color: COLORS.inkSoft }}>
                <svg width="26" height="8" aria-hidden="true" focusable="false"><line x1="0" x2="26" y1="4" y2="4" stroke={COLORS[lookOf(c.batch.pct).color]} strokeWidth="2.5" strokeDasharray={lookOf(c.batch.pct).dash} /></svg>
                <span className="font-medium" style={{ color: COLORS.ink }}>{label(c.batch)}</span>
                <span>{c.curve.peak ? peakText(c) : t("journal.page.oil.few")}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
