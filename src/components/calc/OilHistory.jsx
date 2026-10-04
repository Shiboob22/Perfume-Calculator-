import React, { useEffect, useState } from "react";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { listBatches } from "../../lib/fragranceApi";
import { oilHistory } from "../../lib/oilHistory";
import { formatDay } from "../../lib/batchTiming";
import { UNIT_LABELS } from "../../lib/calcPrefill";

// "Your batches of this oil": the last five, each with the settings it was
// made with and a button to use them again. Hidden when there are none.
export default function OilHistory({ fragranceId, name, onUse }) {
  const { t, locale } = useI18n();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let cancelled = false;
    if (!fragranceId && !name.trim()) { setRows([]); return undefined; }
    // By catalog id, and by name for batches logged without one.
    Promise.all([
      fragranceId ? listBatches(20, { fragrance_id: fragranceId }) : [],
      name.trim() ? listBatches(20, { name: name.trim() }) : [],
    ])
      .then(([byId, byName]) => {
        if (cancelled) return;
        const seen = new Map([...byId, ...byName].map((b) => [b.id, b]));
        setRows(oilHistory([...seen.values()], { fragranceId, name }));
      })
      .catch(() => { if (!cancelled) setRows([]); }); // a convenience: the calculator works without it
    return () => { cancelled = true; };
  }, [fragranceId, name]);

  if (!rows.length) return null;
  return (
    <section aria-labelledby="calc-history-title" className="mt-3 p-3 border" style={{ borderColor: COLORS.line, background: COLORS.card }}>
      <h3 id="calc-history-title" className="text-xs font-semibold" style={{ color: COLORS.amberDeep }}>{t("calc.history.title")}</h3>
      <ul className="mt-2 space-y-2">
        {rows.map((h) => (
          <li key={h.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: COLORS.ink }}>
            <span>{formatDay(h.date, locale)}</span>
            <span dir="ltr" className="font-mono">{h.settings.conc}% · {h.settings.size} {UNIT_LABELS[h.settings.unit]}</span>
            {h.poured != null && <span style={{ color: COLORS.inkSoft }}>{t("calc.history.poured", { pct: Math.round(h.poured * 10) / 10 })}</span>}
            {h.peak != null && <span style={{ color: COLORS.inkSoft }}>{t("calc.history.peak", { day: h.peak })}</span>}
            <button type="button" onClick={() => onUse(h.settings)} className="ms-auto underline min-h-[24px]" style={{ color: COLORS.forest }}>
              {t("calc.history.use")}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
