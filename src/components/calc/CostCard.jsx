import React, { useState } from "react";
import { COLORS } from "../../lib/theme";
import { costFor, fmt2 } from "../../lib/calc";
import { COST_BOTTLES, COST_DEFAULTS, COST_MARGINS } from "../../lib/plansConfig";

// Cost per bottle (Bench SaaS, Pro: calculator.advanced). Three prices, a
// bottle size and a margin give the batch cost, the cost of one bottle and a
// suggested retail price (lib/calc/cost.ts costFor). On Free the card is
// shown blurred behind an "Unlock with Pro" panel and takes no input. In a
// blend the oil price is the blend's weighted price and can't be typed.
export default function CostCard({ unlocked, onUnlock, oilG, ethMl, totMl, oilPrice, onOilPrice, oilReadOnly, ethPrice, onEthPrice, pack, onPack, currency, t }) {
  const [bottleMl, setBottleMl] = useState(COST_DEFAULTS.bottleMl);
  const [margin, setMargin] = useState(COST_DEFAULTS.margin);
  const c = costFor({ oilG, ethMl, totMl, bottleMl, oilPrice: Number(oilPrice) || 0, ethPrice: Number(ethPrice) || 0, pack: Number(pack) || 0, margin });

  const chip = (on) => ({ borderColor: on ? COLORS.actionText : COLORS.line, background: on ? COLORS.amber : COLORS.cardHi, color: on ? COLORS.onAmber : COLORS.ink });
  const price = (id, label, value, onChange, unit, readOnly, hint) => (
    <label htmlFor={id} className="flex flex-col gap-1.5 text-[13px]" style={{ color: COLORS.inkSoft }}>
      {label}
      <span className="flex items-center min-h-[48px] rounded border" style={{ borderColor: COLORS.field, background: readOnly ? COLORS.sand : COLORS.cardHi }}>
        <input id={id} type="number" inputMode="decimal" min="0" step="0.01" dir="ltr" value={value} readOnly={readOnly} tabIndex={unlocked ? undefined : -1}
          onChange={(e) => onChange?.(e.target.value)} placeholder="0" title={hint}
          className="flex-1 min-w-0 px-3 text-lg bg-transparent tabular-nums outline-none" style={{ color: COLORS.ink }} />
        <span className="px-3 text-xs whitespace-nowrap" style={{ color: COLORS.dim }}>{unit}</span>
      </span>
      {hint && <span className="text-xs" style={{ color: COLORS.dim }}>{hint}</span>}
    </label>
  );
  const results = [
    ["batch", c.batch, false],
    ["perBottle", c.perBottle, false],
    ["retail", c.retail, true],
  ];

  return (
    <section aria-labelledby="calc-cost-title" className="relative mt-8 p-6 rounded overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.line}` }}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="calc-cost-title" className="font-serif text-[22px]">{t("calc.costCard.title")}</h2>
        <span className="px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] rtl:tracking-normal" style={{ border: `1px solid ${COLORS.amber}`, color: COLORS.actionText }}>{t("plan.names.pro")}</span>
        {unlocked && <span dir="ltr" className="ms-auto text-[13px]" style={{ color: COLORS.dim }}>{bottleMl} mL · {margin}%</span>}
      </div>
      <div data-cost-body inert={unlocked ? undefined : ""} aria-hidden={unlocked ? undefined : "true"}
        className="mt-5 flex flex-col gap-5" style={unlocked ? undefined : { filter: "blur(5px)", opacity: 0.55, pointerEvents: "none", userSelect: "none" }}>
        <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(170px,1fr))]">
          {price("cost-oil", t(oilReadOnly ? "calc.costCard.blendPrice" : "calc.costCard.oilPrice"), oilReadOnly ? fmt2(oilPrice) : oilPrice, onOilPrice, t("calc.costCard.perG", { cur: currency }), oilReadOnly, oilReadOnly ? t("calc.costCard.blendHint") : undefined)}
          {price("cost-eth", t("calc.costCard.ethPrice"), ethPrice, onEthPrice, t("calc.costCard.perL", { cur: currency }), false)}
          {price("cost-pack", t("calc.costCard.pack"), pack, onPack, t("calc.costCard.perBottleUnit", { cur: currency }), false)}
        </div>
        <div className="flex flex-wrap gap-6">
          <div role="group" aria-label={t("calc.costCard.bottle")}>
            <span aria-hidden="true" className="block mb-1.5 text-[13px]" style={{ color: COLORS.inkSoft }}>{t("calc.costCard.bottle")}</span>
            <div dir="ltr" className="flex flex-wrap gap-1.5">
              {COST_BOTTLES.map((ml) => (
                <button key={ml} type="button" aria-pressed={bottleMl === ml} onClick={() => setBottleMl(ml)} tabIndex={unlocked ? undefined : -1}
                  className="min-h-[44px] px-3 text-sm tabular-nums rounded border" style={chip(bottleMl === ml)}>{ml} mL</button>
              ))}
            </div>
          </div>
          <div role="group" aria-label={t("calc.costCard.margin")}>
            <span aria-hidden="true" className="block mb-1.5 text-[13px]" style={{ color: COLORS.inkSoft }}>{t("calc.costCard.margin")}</span>
            <div dir="ltr" className="flex flex-wrap gap-1.5">
              {COST_MARGINS.map((m) => (
                <button key={m} type="button" aria-pressed={margin === m} onClick={() => setMargin(m)} tabIndex={unlocked ? undefined : -1}
                  className="min-h-[44px] px-3 text-sm tabular-nums rounded border" style={chip(margin === m)}>{m}%</button>
              ))}
            </div>
          </div>
        </div>
        <dl className="grid grid-cols-3" style={{ border: `1px solid ${COLORS.ink}` }}>
          {results.map(([key, value, hi], i) => (
            <div key={key} data-cost={key} className="p-3.5 min-w-0" style={{ borderInlineStart: i ? `1px solid ${COLORS.line}` : 0, background: hi ? COLORS.amber : "transparent", color: hi ? COLORS.onAmber : COLORS.ink }}>
              <dt className="text-[11px] uppercase tracking-[0.15em] rtl:tracking-normal" style={{ color: hi ? COLORS.onAmber : COLORS.dim }}>{t(`calc.costCard.${key}`)}</dt>
              <dd className="mt-2 flex flex-wrap items-baseline gap-1.5">
                <span dir="ltr" className="tabular-nums" style={{ fontSize: hi ? 28 : 22, fontWeight: hi ? 600 : 400 }}>{fmt2(value)}</span>
                <span className="text-xs" style={{ opacity: 0.8 }}>{currency}</span>
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-sm" style={{ color: COLORS.inkSoft }}>
          {c.bottles > 0 ? t("calc.costCard.bottles", { count: c.bottles, size: bottleMl }) : t("calc.costCard.fewer", { size: bottleMl })}
        </p>
      </div>
      {!unlocked && (
        <div className="absolute inset-x-0 bottom-0 top-14 flex items-center justify-center p-6">
          <div className="max-w-[380px] p-6 text-center rounded flex flex-col items-center gap-2.5" style={{ background: COLORS.paper, border: `1px solid ${COLORS.ink}` }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={COLORS.actionText} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="1.5" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></svg>
            <p className="font-serif text-2xl leading-tight">{t("calc.costCard.lockTitle")}</p>
            <p className="text-sm" style={{ color: COLORS.inkSoft }}>{t("calc.costCard.lockBody")}</p>
            <button type="button" onClick={onUnlock} className="mt-1.5 min-h-[48px] px-6 text-[15px] font-medium rounded"
              style={{ background: COLORS.amber, color: COLORS.onAmber, border: `1px solid ${COLORS.amber}` }}>{t("calc.costCard.unlock")}</button>
          </div>
        </div>
      )}
    </section>
  );
}
