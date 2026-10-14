import React, { useState } from "react";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { OCCASIONS, TEMP_BANDS } from "../../lib/wardrobe/framework";
import { bySeason, byOccasion, costPerWear, mostLeast, runningLow, wearCounts } from "../../lib/wardrobe/stats";
import { SelectField, money } from "./ui";

// A row of labelled counts drawn as bars (width = share of the largest).
function Bars({ rows, label }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <ul aria-label={label} className="grid gap-2">
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[8rem_1fr_2.5rem] items-center gap-3 text-sm" style={{ color: COLORS.ink }}>
          <span className="truncate">{r.label}</span>
          <span aria-hidden="true" className="h-2" style={{ background: COLORS.line }}>
            <span className="block h-2" style={{ width: `${(r.n / max) * 100}%`, background: COLORS.resin }} />
          </span>
          <span className="font-mono tabular-nums text-end" dir="ltr">{r.n}</span>
        </li>
      ))}
    </ul>
  );
}

function Block({ title, children }) {
  return (
    <section className="p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.line}` }}>
      <h3 className="font-serif italic text-lg mb-3" style={{ color: COLORS.ink }}>{title}</h3>
      {children}
    </section>
  );
}

export default function Stats({ bottles, wear }) {
  const { t } = useI18n();
  const [hemisphere, setHemisphere] = useState("north");
  const owned = bottles.filter((b) => b.status === "owned");
  const { most, least } = mostLeast(bottles, wear, 3);
  const seasons = bySeason(wear, hemisphere);
  const occasions = byOccasion(wear);
  const low = runningLow(bottles);
  const counts = wearCounts(wear);
  const costs = owned.map((b) => ({ b, per: costPerWear(b, counts.get(b.id) ?? 0) })).filter((x) => x.per != null).sort((a, b) => a.per - b.per);
  const list = (rows) => (
    <ol className="grid gap-1 text-sm" style={{ color: COLORS.ink }}>
      {rows.map((x) => (
        <li key={x.bottle.id} className="flex justify-between gap-3">
          <span>{x.bottle.name}</span>
          <span className="font-mono tabular-nums" dir="ltr" style={{ color: COLORS.inkSoft }}>{x.wears === 0 ? t("wardrobe.stats.never") : t("wardrobe.stats.times", { n: x.wears })}</span>
        </li>
      ))}
    </ol>
  );

  if (wear.length === 0) {
    return (
      <section aria-labelledby="stats-h">
        <h2 id="stats-h" className="font-serif italic text-2xl mb-4" style={{ color: COLORS.ink }}>{t("wardrobe.stats.title")}</h2>
        <p className="p-6 text-sm text-center" style={{ background: COLORS.card, border: `1px dashed ${COLORS.line}`, color: COLORS.inkSoft }}>{t("wardrobe.stats.empty")}</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="stats-h">
      <h2 id="stats-h" className="font-serif italic text-2xl mb-1" style={{ color: COLORS.ink }}>{t("wardrobe.stats.title")}</h2>
      <p className="text-sm mb-5 font-mono tabular-nums" style={{ color: COLORS.inkSoft }}>{t("wardrobe.stats.total", { wearings: wear.length, bottles: counts.size })}</p>
      <div className="grid gap-4 md:grid-cols-2">
        <Block title={t("wardrobe.stats.most")}>{most.length ? list(most) : <p className="text-sm" style={{ color: COLORS.inkSoft }}>{t("wardrobe.stats.never")}</p>}</Block>
        <Block title={t("wardrobe.stats.least")}>{list(least)}</Block>
        <Block title={t("wardrobe.stats.season")}>
          <div className="max-w-xs mb-3">
            <SelectField label={t("wardrobe.stats.hemisphere")} value={hemisphere} onChange={setHemisphere}
              options={[{ value: "north", label: t("wardrobe.stats.north") }, { value: "south", label: t("wardrobe.stats.south") }]} />
          </div>
          <Bars label={t("wardrobe.stats.season")} rows={["spring", "summer", "autumn", "winter"].map((s) => ({ key: s, label: t(`wardrobe.stats.seasons.${s}`), n: seasons.seasons[s] }))} />
        </Block>
        <Block title={t("wardrobe.stats.temp")}>
          <Bars label={t("wardrobe.stats.temp")} rows={TEMP_BANDS.map((b) => ({ key: b, label: t(`wardrobe.bands.${b}`), n: seasons.bands[b] }))} />
        </Block>
        <Block title={t("wardrobe.stats.occasion")}>
          <Bars label={t("wardrobe.stats.occasion")} rows={OCCASIONS.map((o) => ({ key: o.id, label: t(`wardrobe.occasions.${o.id}`), n: occasions[o.id] ?? 0 }))} />
        </Block>
        <Block title={t("wardrobe.stats.low")}>
          {low.length === 0 ? <p className="text-sm" style={{ color: COLORS.inkSoft }}>{t("wardrobe.stats.lowNone")}</p> : (
            <ul className="grid gap-1 text-sm" style={{ color: COLORS.ink }}>
              {low.map((b) => <li key={b.id} className="flex justify-between gap-3"><span>{b.name}</span><span className="font-mono tabular-nums" dir="ltr">{t("wardrobe.collection.fillShown", { pct: Number(b.fill_pct) })}</span></li>)}
            </ul>
          )}
        </Block>
        <Block title={t("wardrobe.stats.cost")}>
          {costs.length === 0 ? <p className="text-sm" style={{ color: COLORS.inkSoft }}>{t("wardrobe.stats.costNone")}</p> : (
            <ul className="grid gap-1 text-sm" style={{ color: COLORS.ink }}>
              {costs.map(({ b, per }) => <li key={b.id} className="flex justify-between gap-3"><span>{b.name}</span><span className="font-mono tabular-nums" dir="ltr">{money(per, b.currency)}</span></li>)}
            </ul>
          )}
          <p className="text-xs mt-3" style={{ color: COLORS.dim }}>{t("wardrobe.stats.costNote")}</p>
        </Block>
      </div>
    </section>
  );
}
