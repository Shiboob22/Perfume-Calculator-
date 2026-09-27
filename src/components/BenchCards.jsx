import React from "react";
import { useSearchParams } from "react-router-dom";
import { COLORS } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import { useEntitlements } from "../lib/useEntitlements";
import { can } from "../lib/entitlements";
import { guideBySlug } from "../content/guides";
import ProLocked from "./ProLocked";

// Printable bench cards (Pro): the handbook's Quick Reference, Bench Workflow
// and QC Checklist, laid out for A4/A5 paper. "Print" hands the page to the
// browser, which saves a PDF with correctly shaped Arabic.
const CARDS = ["quick-reference", "workflow", "qc"];

function Card({ id }) {
  const { t, locale } = useI18n();
  if (id === "quick-reference") {
    const table = guideBySlug("the-calculation")[locale].body.find((b) => b.table && b.table.rows.length === 12).table;
    return (
      <>
        <h2>{t("cards.quickReference")}</h2>
        <table className="print-table">
          <thead><tr>{table.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>{table.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
        </table>
        <p className="print-note">{t("cards.densities")}</p>
      </>
    );
  }
  if (id === "workflow") {
    const steps = guideBySlug("at-the-bench")[locale].body.find((b, i, all) => b.steps && all[i - 1]?.id === "workflow").steps;
    return (
      <>
        <h2>{t("cards.workflow")}</h2>
        <ol className="print-steps">{steps.map((s) => <li key={s.title}><strong>{s.title}</strong> — {s.text}</li>)}</ol>
        <p className="print-note">{t("bench.prepare.cautionText")}</p>
      </>
    );
  }
  return (
    <>
      <h2>{t("cards.qc")}</h2>
      <ul className="print-checklist">{(t.raw("bench.qc.items") || []).map((x) => <li key={x}>☐ {x}</li>)}</ul>
      <p className="print-note">{t("bench.qc.unusual")}</p>
    </>
  );
}

export default function BenchCards() {
  const { t } = useI18n();
  const entitlements = useEntitlements();
  const [params, setParams] = useSearchParams();
  const card = CARDS.includes(params.get("card")) ? params.get("card") : CARDS[0];

  if (!entitlements.loaded) return null;
  if (!can(entitlements, "export.labels")) return <ProLocked feature="export.labels" />;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="no-print flex flex-wrap gap-2 mb-6 items-center">
        {CARDS.map((c) => (
          <button key={c} type="button" onClick={() => setParams({ card: c })} aria-pressed={c === card}
            className="px-3 py-1.5 text-xs rounded-lg border" style={{ borderColor: c === card ? COLORS.amber : COLORS.line, color: c === card ? COLORS.amber : COLORS.inkSoft }}>
            {t(`cards.tabs.${c}`)}
          </button>
        ))}
        <button type="button" onClick={() => window.print()} className="ms-auto px-4 py-2 rounded-lg font-semibold" style={{ background: COLORS.amber, color: COLORS.onAmber }}>
          {t("cards.print")}
        </button>
      </div>
      <article className="print-card">
        <p className="print-brand">The Scent Handbook · {t("cards.byline")}</p>
        <Card id={card} />
      </article>
    </div>
  );
}
