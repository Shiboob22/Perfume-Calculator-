import React from "react";
import { Link, useParams } from "react-router-dom";
import { COLORS } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import { guideBySlug } from "../content/guides";
import { localePath } from "./meta";

const CALLOUT = {
  caution: { border: COLORS.danger, label: COLORS.danger },
  important: { border: COLORS.amberDeep, label: COLORS.amber },
  rule: { border: COLORS.line, label: COLORS.amberDeep },
};

function Block({ block }) {
  if (block.h2) {
    return (
      <h2 id={block.id} className="font-serif italic text-3xl mt-12 mb-4 scroll-mt-6" style={{ color: COLORS.forestDeep }}>
        <a href={`#${block.id}`} className="hover:underline underline-offset-4">{block.h2}</a>
      </h2>
    );
  }
  if (block.p) return <p className="leading-relaxed my-4 text-[17px]" style={{ color: COLORS.ink }}>{block.p}</p>;
  if (block.quote) {
    return (
      <blockquote className="my-8 ps-5 font-serif italic text-2xl leading-snug" style={{ borderInlineStart: `2px solid ${COLORS.amberDeep}`, color: COLORS.forestDeep }}>
        “{block.quote}”
      </blockquote>
    );
  }
  if (block.list) {
    return (
      <ul className="my-4 space-y-2 ps-5 list-disc" style={{ color: COLORS.ink }}>
        {block.list.map((item) => <li key={item} className="leading-relaxed">{item}</li>)}
      </ul>
    );
  }
  if (block.steps) {
    return (
      <ol className="my-6 space-y-4">
        {block.steps.map((s, i) => (
          <li key={s.title} id={s.id} className="flex gap-4 scroll-mt-6">
            <span className="shrink-0 w-8 h-8 rounded-full grid place-items-center font-mono text-sm"
              style={{ border: `1px solid ${COLORS.amberDeep}`, color: COLORS.amber }}>{i + 1}</span>
            <span>
              <span className="block font-semibold" style={{ color: COLORS.forestDeep }}>{s.title}</span>
              <span className="block mt-1 leading-relaxed" style={{ color: COLORS.ink }}>{s.text}</span>
            </span>
          </li>
        ))}
      </ol>
    );
  }
  if (block.formula) {
    return (
      <pre dir="ltr" className="my-6 p-5 rounded-xl font-mono text-sm leading-7 overflow-x-auto text-left"
        style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, color: COLORS.ink }}>
        {block.formula.join("\n")}
      </pre>
    );
  }
  if (block.table) {
    const { head, rows } = block.table;
    return (
      <table className="stack-table my-6 w-full text-sm" style={{ color: COLORS.ink }}>
        <thead>
          <tr>{head.map((h, i) => <th key={i} className="text-start py-2 pe-4 font-mono text-[11px] uppercase tracking-wider" style={{ color: COLORS.amberDeep, borderBottom: `1px solid ${COLORS.line}` }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td key={c} data-label={head[c]} className="py-2 pe-4" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
                  {/g$|g\/ml$|غ$|غ\/مل$|×/.test(cell) ? <span dir="ltr">{cell}</span> : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  if (block.callout) {
    const c = block.callout;
    const style = CALLOUT[c.kind] || CALLOUT.rule;
    return (
      <aside className="my-6 p-5 rounded-xl" style={{ background: COLORS.card, border: `1px solid ${style.border}` }}>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] mb-2" style={{ color: style.label }}>{c.title}</p>
        <p className="leading-relaxed" style={{ color: COLORS.ink }}>{c.text}</p>
      </aside>
    );
  }
  return null;
}

export default function GuidePage() {
  const { slug } = useParams();
  const { t, locale } = useI18n();
  const guide = guideBySlug(slug);
  const to = (p) => localePath(locale, p);

  if (!guide) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-10">
        <p style={{ color: COLORS.inkSoft }}>{t("site.guides.notFound")}</p>
        <Link to={to("/guides")} className="underline" style={{ color: COLORS.amber }}>{t("site.guides.all")}</Link>
      </div>
    );
  }

  const g = guide[locale];
  const sections = g.body.filter((b) => b.h2);
  const calc = guide.calculator;
  const calcHref = calc ? `/app/calculator?${new URLSearchParams({ size: calc.size, unit: calc.unit, conc: calc.conc })}` : null;

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-8 pt-8">
      <Link to={to("/guides")} className="font-mono text-xs uppercase tracking-wider hover:underline" style={{ color: COLORS.amberDeep }}>
        <span aria-hidden="true" className="inline-block rtl:-scale-x-100">←</span> {t("site.guides.all")}
      </Link>
      <h1 className="font-serif italic text-5xl leading-tight mt-4" style={{ color: COLORS.forestDeep }}>{g.title}</h1>
      <p className="mt-4 text-lg leading-relaxed" style={{ color: COLORS.inkSoft }}>{g.summary}</p>
      <p className="mt-4 text-sm" style={{ color: COLORS.inkSoft }}>
        {t("site.guides.by")} · {t("site.guides.from", { volume: guide.source.volume, book: guide.source.book, sections: guide.source.sections.join(", ") })}
      </p>
      {g.needsReview && (
        <p className="mt-4 p-3 rounded-lg text-sm" style={{ border: `1px dashed ${COLORS.amberDeep}`, color: COLORS.amber }}>{t("site.guides.reviewNote")}</p>
      )}

      {sections.length > 2 && (
        <nav aria-label={t("site.guides.toc")} className="mt-8 p-5 rounded-xl" style={{ background: COLORS.card, border: `1px solid ${COLORS.line}` }}>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] mb-3" style={{ color: COLORS.amberDeep }}>{t("site.guides.toc")}</p>
          <ol className="space-y-1.5 text-sm">
            {sections.map((s) => <li key={s.id}><a href={`#${s.id}`} className="hover:underline" style={{ color: COLORS.ink }}>{s.h2}</a></li>)}
          </ol>
        </nav>
      )}

      <div className="mt-6">{g.body.map((b, i) => <Block key={i} block={b} />)}</div>

      {calcHref && (
        <a href={calcHref} className="inline-block mt-10 px-5 py-3 rounded-xl font-semibold"
          style={{ background: `linear-gradient(180deg,${COLORS.amber},${COLORS.amberDeep})`, color: COLORS.onAmber }}>
          {t("site.guides.openCalc")}
        </a>
      )}
    </article>
  );
}
