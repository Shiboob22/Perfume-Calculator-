import React, { useState } from "react";
import { Link } from "../../motion";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { errorText } from "../../i18n/errorText";
import { useEntitlements } from "../../lib/useEntitlements";
import { can } from "../../lib/entitlements";
import { deleteBatch } from "../../lib/fragranceApi";
import { downloadBatchCard } from "../../lib/batchCard";
import { batchEconomics, fmt2, shownTotal } from "../../lib/calc";
import { makeAgainHref } from "../../lib/oilHistory";
import { currencyLabel } from "../../lib/currencies";
import BatchEdit from "../BatchEdit";
import SharePanel from "../SharePanel";
import JournalSection from "./JournalSection";

// The batch's record inside the Journal room (J5), so the bottle has one
// home: what was poured, the notes written at the bench, and every action
// the batch records page has: edit, make again, batch card, label, share,
// delete. The components are the same ones that page uses.
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export default function BatchRecord({ b, onChange, onDeleted, promised = 0, readyOn = "", fold = false }) {
  const { t, locale } = useI18n();
  const entitlements = useEntitlements();
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const prefix = locale === "ar" ? "/ar" : "";
  const econ = batchEconomics(b);
  const money = (v) => `${fmt2(v)}${econ?.currency ? ` ${currencyLabel(econ.currency, locale)}` : ""}`;
  const g = t("units.g");
  const ml = t("units.ml");
  const rows = [
    [t("batches.oil"), `${r2(b.oil_g)} ${g}`, `${r2(b.oil_ml)} ${ml}`],
    [t("batches.ethanol"), `${r2(b.ethanol_g)} ${g}`, `${r2(b.ethanol_ml)} ${ml}`],
    [t("batches.total"), `${fmt2(shownTotal(Number(b.oil_g), Number(b.ethanol_g)))} ${g}`, null],
    econ ? [t("batches.costPerBottle"), money(econ.perBottle), null] : null,
    econ && econ.profit != null ? [t(econ.profit < 0 ? "batches.loss" : "batches.profit"), money(Math.abs(econ.profit)), `${fmt2(econ.marginPct)}%`] : null,
  ].filter(Boolean);
  const link = "text-sm underline underline-offset-4 min-h-[44px] inline-flex items-center";

  async function remove() {
    setConfirming(false);
    try {
      await deleteBatch(b.id);
      onDeleted(b.id);
    } catch (e) {
      setError(errorText(t, e, "batches.deleteFailed"));
    }
  }

  return (
    <JournalSection name="record" id="journal-record" title={t("journal.page.record.title")} fold={fold} className="mt-7 pt-5" style={{ borderTop: `1px solid ${COLORS.line}` }}>
      {promised > 0 && (
        <p data-promised className="mt-2 text-sm font-medium" style={{ color: COLORS.actionText }}>
          {t("journal.page.record.promised", { count: promised, date: readyOn })}
        </p>
      )}
      <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
        {rows.map(([label, value, sub]) => (
          <div key={label}>
            <dt className="text-xs" style={{ color: COLORS.inkSoft }}>{label}</dt>
            <dd dir="ltr" className="font-mono text-sm text-start rtl:text-end">
              {value}{sub && <span className="ms-1.5 text-xs" style={{ color: COLORS.inkSoft }}>{sub}</span>}
            </dd>
          </div>
        ))}
      </dl>
      {(b.lot || b.oil_type || b.blended_by) && (
        <p className="mt-2 text-xs font-mono" style={{ color: COLORS.inkSoft }}>
          {b.lot && <span className="me-4">{t("batches.lot", { lot: b.lot })}</span>}
          {b.oil_type && <span className="me-4">{b.oil_type}</span>}
          {b.blended_by && <span>{t("batches.by", { name: b.blended_by })}</span>}
        </p>
      )}
      {b.notes && <p dir="auto" className="mt-2 text-sm italic" style={{ color: COLORS.inkSoft }}>{b.notes}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1">
        <BatchEdit batch={b} onSaved={(id, row) => onChange({ id, ...row })} onStatus={setStatus} />
        <Link to={`${prefix}${makeAgainHref(b)}`} className={link} style={{ color: COLORS.actionText }}>{t("batches.again")}</Link>
        <button type="button" className={link} style={{ color: COLORS.actionText }}
          onClick={() => downloadBatchCard(b, { t, locale }).catch((e) => setError(t("batchCard.failed", { error: errorText(t, e) })))}>
          {t("batches.exportCard")}
        </button>
        {can(entitlements, "export.labels") && (
          <Link to={`${prefix}/app/labels?batch=${b.id}`} state={{ batch: b }} className={link} style={{ color: COLORS.actionText }}>{t("labels.open")}</Link>
        )}
        {confirming ? (
          <span className="inline-flex items-center gap-3 text-sm">
            <span>{t("batches.confirmDelete")}</span>
            <button type="button" autoFocus onClick={remove} className={link} style={{ color: COLORS.danger }}>{t("batches.delete")}</button>
            <button type="button" onClick={() => setConfirming(false)} className={link} style={{ color: COLORS.inkSoft }}>{t("batches.keep")}</button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className={link} style={{ color: COLORS.inkSoft }}>{t("batches.delete")}</button>
        )}
      </div>
      <div className="mt-2">
        <SharePanel batch={b} onShared={(id, share) => onChange({ id, shared_recipes: share })} onStatus={setStatus} />
      </div>
      <p role="status" className="mt-2 text-sm empty:hidden" style={{ color: COLORS.actionText }}>{status}</p>
      {error && <p role="alert" className="mt-2 text-sm" style={{ color: COLORS.danger }}>{error}</p>}
    </JournalSection>
  );
}
