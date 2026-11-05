import React from "react";
import { COLORS, INGREDIENT_SWATCH } from "../../lib/theme";
import { INGREDIENT_KEYS, balanceShares, blendMix, ingredientAmounts, fmt2 } from "../../lib/calc";

// A blend: the concentrate made of several materials, each a share of the
// concentrate by weight (Bench SaaS). The arithmetic is in lib/calc/mixture;
// this only edits the list and formats.

let seq = 0;
export const newIngredient = (extra = {}) => ({ id: `i${Date.now().toString(36)}${(seq += 1)}`, name: "", type: "eo", pct: "", price: "", ...extra });

/** Total off 100 (more than a rounding hair away): shares are scaled to 100. */
export const isOffHundred = (rows) => {
  const { sum } = blendMix(rows);
  return sum > 0 && Math.abs(sum - 100) > 0.05;
};

const Lock = ({ label }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.actionText} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label={label}>
    <rect x="5" y="10.5" width="14" height="10" rx="1.5" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </svg>
);

export default function BlendEditor({ rows, onChange, concentrateG, canAdd, cap, onLocked, currency, t }) {
  const { sum } = blendMix(rows);
  const off = isOffHundred(rows);
  const grams = ingredientAmounts(concentrateG, rows);
  const set = (i, patch) => onChange(rows.map((r, n) => (n === i ? { ...r, ...patch } : r)));
  const move = (i, d) => {
    const next = rows.slice();
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  const totalText = t(off ? "calc.blend.off" : "calc.blend.total", { n: fmt2(sum) });
  const field = { borderColor: COLORS.field, color: COLORS.ink };

  return (
    <fieldset className="mb-5 min-w-0">
      <legend className="w-full mb-2">
        <span className="flex items-baseline justify-between gap-3 text-sm font-semibold" style={{ color: COLORS.ink }}>
          <span>{t("calc.blend.ingredients")}</span>
          <span data-off={off ? "true" : "false"} className="text-[13px] font-normal tabular-nums"
            style={{ color: off ? COLORS.actionText : COLORS.dim, fontWeight: off ? 600 : 400 }}>{totalText}</span>
        </span>
      </legend>
      <ol className="flex flex-col gap-2">
        {rows.map((r, i) => (
          <li key={r.id} className="p-2.5 rounded flex flex-col gap-2" style={{ border: `1px solid ${COLORS.line}`, background: COLORS.cardHi }}>
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="w-1.5 self-stretch shrink-0" style={{ background: INGREDIENT_SWATCH[r.type] ?? INGREDIENT_SWATCH.eo }} />
              <input type="text" value={r.name} onChange={(e) => set(i, { name: e.target.value })}
                aria-label={t("calc.blend.nameN", { n: i + 1 })} placeholder={t("calc.blend.namePh")} maxLength={80}
                className="flex-1 min-w-0 min-h-[44px] px-2.5 text-[15px] rounded border bg-transparent" style={field} />
              <span dir="ltr" className="flex items-center shrink-0 min-h-[44px] rounded border" style={field}>
                <input type="number" inputMode="decimal" min="0" max="100" step="0.1" value={r.pct}
                  onChange={(e) => set(i, { pct: e.target.value })} aria-label={t("calc.blend.shareN", { n: i + 1 })}
                  className="w-14 ps-2 pe-1 text-[15px] text-end bg-transparent tabular-nums outline-none" style={{ color: COLORS.ink }} />
                <span className="pe-2 text-[13px]" style={{ color: COLORS.dim }}>%</span>
              </span>
              <button type="button" onClick={() => onChange(rows.filter((_, n) => n !== i))} disabled={rows.length === 1}
                aria-label={t("calc.blend.removeN", { n: i + 1 })}
                className="w-11 h-11 shrink-0 inline-flex items-center justify-center disabled:opacity-40" style={{ color: COLORS.inkSoft }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
              </button>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap ps-3">
              <select value={r.type} onChange={(e) => set(i, { type: e.target.value })} aria-label={t("calc.blend.typeN", { n: i + 1 })}
                className="min-h-[44px] max-w-[8.5rem] px-1.5 text-[13px] rounded border" style={{ borderColor: COLORS.line, background: COLORS.cardHi, color: COLORS.ink }}>
                {INGREDIENT_KEYS.map((k) => <option key={k} value={k}>{t(`calc.blend.types.${k}`)}</option>)}
              </select>
              <span dir="ltr" className="flex items-center min-h-[44px] rounded border" style={{ borderColor: COLORS.line }}>
                <input type="number" inputMode="decimal" min="0" step="0.01" value={r.price} onChange={(e) => set(i, { price: e.target.value })}
                  aria-label={t("calc.blend.priceN", { n: i + 1 })} placeholder="0"
                  className="w-11 ps-1.5 pe-1 text-[13px] text-end bg-transparent tabular-nums outline-none" style={{ color: COLORS.ink }} />
                <span className="pe-1.5 text-[11px] whitespace-nowrap" style={{ color: COLORS.dim }}>{t("calc.blend.perG", { cur: currency })}</span>
              </span>
              <span dir="ltr" className="ms-auto text-[13px] tabular-nums" style={{ color: COLORS.inkSoft }}>{fmt2(grams[i]?.g ?? 0)} g</span>
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={t("calc.blend.upN", { n: i + 1 })}
                className="w-10 h-11 inline-flex items-center justify-center rounded border disabled:opacity-40" style={{ borderColor: COLORS.line, color: COLORS.ink }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 15 6-6 6 6" /></svg>
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label={t("calc.blend.downN", { n: i + 1 })}
                className="w-10 h-11 inline-flex items-center justify-center rounded border disabled:opacity-40" style={{ borderColor: COLORS.line, color: COLORS.ink }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
              </button>
            </div>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-3 mt-2.5">
        <button type="button" onClick={() => (canAdd ? onChange([...rows, newIngredient()]) : onLocked())}
          aria-describedby={canAdd ? undefined : "calc-blend-limit"}
          className="min-h-[44px] px-3.5 inline-flex items-center gap-2 text-sm rounded"
          style={{ border: `1px dashed ${COLORS.field}`, color: COLORS.ink }}>
          {!canAdd && <Lock label={t("plan.names.pro")} />}
          <span>+ {t("calc.blend.add")}</span>
        </button>
        {off && (
          <button type="button" onClick={() => onChange(balanceShares(rows))}
            className="min-h-[44px] text-sm underline underline-offset-4" style={{ color: COLORS.actionText }}>
            {t("calc.blend.balance")}
          </button>
        )}
      </div>
      {!canAdd && <p id="calc-blend-limit" className="mt-1 text-[13px]" style={{ color: COLORS.dim }}>{t("plan.limit.ingredients", { cap })}</p>}
    </fieldset>
  );
}

/** The readout's concentrate breakdown: grams and mL of each material. */
export function BlendBreakdown({ rows, concentrateG, t }) {
  const amounts = ingredientAmounts(concentrateG, rows);
  return (
    <div className="mt-3 px-3.5 py-3 rounded" style={{ border: `1px solid ${COLORS.line}` }}>
      <h3 className="mb-1 text-[11px] uppercase tracking-[0.15em] rtl:tracking-normal font-normal" style={{ color: COLORS.dim }}>{t("calc.blend.breakdown")}</h3>
      <ul>
        {rows.map((r, i) => (
          <li key={r.id} className="flex items-center gap-2.5 py-1.5 text-sm" style={{ borderTop: `1px solid ${COLORS.line}` }}>
            <span aria-hidden="true" className="w-2 h-2 shrink-0" style={{ background: INGREDIENT_SWATCH[r.type] ?? INGREDIENT_SWATCH.eo }} />
            <span className="flex-1 min-w-0 truncate">{r.name.trim() || t("calc.blend.unnamed", { n: i + 1 })}</span>
            <span dir="ltr" className="text-xs tabular-nums" style={{ color: COLORS.dim }}>{fmt2((amounts[i]?.share ?? 0) * 100)}%</span>
            <span dir="ltr" className="min-w-[7.5rem] text-end tabular-nums">{fmt2(amounts[i]?.g ?? 0)} g / {fmt2(amounts[i]?.ml ?? 0)} mL</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
