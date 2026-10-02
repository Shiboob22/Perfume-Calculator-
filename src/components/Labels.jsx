import React, { useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { COLORS } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import { errorText } from "../i18n/errorText";
import { useEntitlements } from "../lib/useEntitlements";
import { can } from "../lib/entitlements";
import { listBatches } from "../lib/fragranceApi";
import { LABEL_SIZES, LABEL_LIMITS, MAX_COPIES, customSize, labelFields, perSheet, typeSizes } from "../lib/labels";
import ProLocked from "./ProLocked";

const inputStyle = { background: COLORS.cardHi, color: COLORS.ink, border: `1px solid ${COLORS.field}` };

// /app/labels?batch=<id> (Pro): printable bottle labels for one logged
// batch. Sizes are in millimetres so the printout matches label stock;
// "Print" hands the sheet to the browser (or its Save as PDF).
export default function Labels() {
  const { t, dir } = useI18n();
  const entitlements = useEntitlements();
  const { state } = useLocation();
  const [params] = useSearchParams();
  const id = params.get("batch");
  const [batch, setBatch] = useState(state?.batch?.id === id ? state.batch : null);
  const [error, setError] = useState(null);
  const [sizeKey, setSizeKey] = useState("medium");
  const [custom, setCustom] = useState({ w: "60", h: "35" });
  const [lot, setLot] = useState("");
  const [copies, setCopies] = useState(1);

  useEffect(() => {
    if (batch || !id) return;
    listBatches(100)
      .then((rows) => { const found = rows.find((b) => b.id === id); found ? setBatch(found) : setError(t("labels.notFound")); })
      .catch((e) => setError(errorText(t, e, "batches.loadFailed")));
  }, [batch, id, t]);

  if (!entitlements.loaded) return null;
  if (!can(entitlements, "export.labels")) return <ProLocked feature="export.labels" />;

  const size = sizeKey === "custom" ? customSize(custom.w, custom.h) : LABEL_SIZES[sizeKey];
  const sheet = size ? perSheet(size) : null;
  const count = Math.min(Math.max(1, Number(copies) || 1), MAX_COPIES);
  const label = batch ? labelFields(batch, { t, lot }) : null;
  // Type scaled so every line fits the label; mm keeps it true to the printout.
  const type = size && label ? typeSizes(size, label.fields.length) : { name: 5, line: 3 };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="no-print">
        <h2 className="font-serif italic text-3xl mb-4" style={{ color: COLORS.forestDeep }}>{t("labels.title")}</h2>
        {!id && <p style={{ color: COLORS.inkSoft }}>{t("labels.pick")}</p>}
        {error && <p role="alert" style={{ color: COLORS.danger }}>{error}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <fieldset>
            <legend className="text-sm mb-2" style={{ color: COLORS.ink }}>{t("labels.size")}</legend>
            <div className="flex flex-wrap gap-2">
              {[...Object.keys(LABEL_SIZES), "custom"].map((k) => (
                <button key={k} type="button" aria-pressed={sizeKey === k} onClick={() => setSizeKey(k)}
                  className="px-3 py-1.5 text-xs rounded-lg border min-h-[28px]"
                  style={{ borderColor: sizeKey === k ? COLORS.amber : COLORS.field, color: sizeKey === k ? COLORS.amber : COLORS.ink }}>
                  {k === "custom" ? t("labels.custom") : t("labels.mm", { w: LABEL_SIZES[k].w, h: LABEL_SIZES[k].h })}
                </button>
              ))}
            </div>
            {sizeKey === "custom" && (
              <div className="flex gap-2 mt-2 items-center text-sm" style={{ color: COLORS.inkSoft }}>
                <label className="flex items-center gap-1">{t("labels.width")}
                  <input type="number" inputMode="decimal" value={custom.w} onChange={(e) => setCustom((c) => ({ ...c, w: e.target.value }))} className="w-20 px-2 py-1 rounded font-mono" style={inputStyle} /></label>
                <label className="flex items-center gap-1">{t("labels.height")}
                  <input type="number" inputMode="decimal" value={custom.h} onChange={(e) => setCustom((c) => ({ ...c, h: e.target.value }))} className="w-20 px-2 py-1 rounded font-mono" style={inputStyle} /></label>
              </div>
            )}
            <p role="status" className="text-xs mt-2" style={{ color: size ? COLORS.inkSoft : COLORS.danger }}>
              {size ? t("labels.perSheet", { count: sheet.total }) : t("labels.badSize", { min: LABEL_LIMITS.min, maxW: LABEL_LIMITS.maxW, maxH: LABEL_LIMITS.maxH })}
            </p>
          </fieldset>
          <div className="grid gap-3 content-start">
            <label className="text-sm" style={{ color: COLORS.ink }}>{t("bench.label.lot")}
              <input value={lot} maxLength={40} onChange={(e) => setLot(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg font-mono" style={inputStyle} /></label>
            <label className="text-sm" style={{ color: COLORS.ink }}>{t("labels.copies")}
              <input type="number" min="1" max={MAX_COPIES} value={copies} onChange={(e) => setCopies(e.target.value)} className="mt-1 w-24 px-3 py-2 rounded-lg font-mono" style={inputStyle} /></label>
          </div>
        </div>
        <button type="button" disabled={!label || !size} onClick={() => window.print()}
          className="mb-6 px-5 py-2 rounded-lg font-semibold disabled:opacity-50" style={{ background: COLORS.amber, color: COLORS.onAmber }}>
          {t("cards.print")}
        </button>
      </div>

      {label && size && (
        <div className="label-sheet" dir={dir}>
          {Array.from({ length: count }, (_, i) => (
            <div key={i} className="print-label" style={{ width: `${size.w}mm`, height: `${size.h}mm` }}>
              <p className="print-label-name" style={{ fontSize: `${type.name}mm` }}>{label.name}</p>
              <dl style={{ fontSize: `${type.line}mm` }}>
                {label.fields.map(([k, v]) => (
                  <div key={k} className="print-label-row"><dt>{k}</dt><dd dir="ltr">{v}</dd></div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
