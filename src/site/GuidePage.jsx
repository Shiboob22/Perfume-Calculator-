import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Link } from "../motion";
import { COLORS, TYPE } from "../lib/theme";
import { ChapterMark, Folio } from "./editorial";
import { useI18n } from "../i18n/I18nProvider";
import { guideBySlug, GUIDES } from "../content/guides";
import { readingMinutes } from "../content/search";
import { GLOSSARY_ENTRIES, glossaryTerm, markTerms } from "../content/glossary";
import { localePath } from "./meta";
import { IconArrow, IconBalance, IconBook, IconCrosshair, IconDiamondAlert, IconFlameTriangle, IconTile } from "../components/icons";

const ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii"];

// Badge colours for the handbook's evidence labels. The label text is always
// the handbook's own; the tone grouping is a proposal pending the author.
const TONE = {
  scientific: COLORS.verdigrisText,
  plausible: COLORS.actionText,
  anecdotal: COLORS.inkSoft,
  myth: COLORS.danger,
  practice: COLORS.dim,
};

const CALLOUT = {
  caution: { border: COLORS.danger, label: COLORS.danger },
  important: { border: COLORS.ink, label: COLORS.ink },
  rule: { border: COLORS.ink, label: COLORS.forest },
};

// A paragraph with its glossary terms marked: each links to the definition
// at the foot of the page (plain anchors, so the prerendered page works
// without script).
function Marked({ parts }) {
  return parts.map((x, i) => (typeof x === "string" ? x : (
    <a key={i} href={`#term-${x.term}`} className="underline decoration-1 underline-offset-4" style={{ color: "inherit", textDecorationColor: COLORS.actionText }}>{x.match}</a>
  )));
}

function Block({ block, rule, marked }) {
  if (block.h2) {
    return (
      <h2 id={block.id} className="text-3xl font-medium tracking-[-0.03em] rtl:tracking-normal mt-14 mb-4 scroll-mt-24">
        <a href={`#${block.id}`} className="hover:underline underline-offset-4">{block.h2}</a>
      </h2>
    );
  }
  if (block.p) return <p className="font-serif text-[19px] leading-[1.7] my-5" style={{ color: COLORS.inkSoft }}>{marked ? <Marked parts={marked} /> : block.p}</p>;
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
            <span className="shrink-0 w-8 h-8 rounded grid place-items-center font-mono text-sm"
              style={{ border: `1px solid ${COLORS.amberDeep}`, color: COLORS.actionText }}>{i + 1}</span>
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
      <pre dir="ltr" className="my-8 py-5 font-mono text-[15px] leading-8 overflow-x-auto text-left"
        style={{ borderBlock: `1px solid ${COLORS.ink}`, color: COLORS.ink }}>
        {block.formula.join("\n")}
      </pre>
    );
  }
  if (block.table) {
    const { head, rows } = block.table;
    // An empty first header means the first column names each row: those
    // cells are row headers. Explicit roles keep table semantics when the
    // phone layout turns rows into cards (display changes drop them in Safari).
    const rowHeads = head[0] === "";
    // Latin figures with units ("25 ml × 0.95") keep left-to-right order
    // inside an Arabic page; cells with Arabic units ("25 مل × 0.95") are
    // already ordered correctly by the page direction.
    const show = (cell) => (!/[\u0600-\u06FF]/.test(cell) && /(^|\s)(g|g\/ml)$|× \d/.test(cell) ? <span dir="ltr">{cell}</span> : cell);
    return (
      <table role="table" className="stack-table my-6 w-full text-sm" style={{ color: COLORS.ink }}>
        <thead role="rowgroup">
          <tr role="row">{head.map((h, i) => (rowHeads && i === 0
            ? <td key={i} role="cell" style={{ borderBottom: `1px solid ${COLORS.line}` }} />
            : <th key={i} role="columnheader" scope="col" className="text-start py-2 pe-4 font-mono text-[11px] uppercase tracking-wider" style={{ color: COLORS.amberDeep, borderBottom: `1px solid ${COLORS.line}` }}>{h}</th>))}</tr>
        </thead>
        <tbody role="rowgroup">
          {rows.map((row, r) => (
            <tr key={r} role="row">
              {row.map((cell, c) => (rowHeads && c === 0
                ? <th key={c} role="rowheader" scope="row" className="text-start py-2 pe-4 font-semibold" style={{ borderBottom: `1px solid ${COLORS.line}` }}>{show(cell)}</th>
                : <td key={c} role="cell" data-label={head[c]} className="py-2 pe-4" style={{ borderBottom: `1px solid ${COLORS.line}` }}>{show(cell)}</td>))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  if (block.evidence) {
    const color = TONE[block.evidence.tone] || COLORS.inkSoft;
    return (
      <div className="my-4 p-4 rounded" style={{ background: COLORS.card, border: `1px solid ${COLORS.line}` }}>
        <span className="inline-block px-2 py-0.5 rounded font-mono text-[10px] uppercase tracking-[0.14em]" style={{ border: `1px solid ${color}`, color }}>
          {block.evidence.label}
        </span>
        {block.title && <p className="mt-2 font-semibold" style={{ color: COLORS.forestDeep }}>{block.title}</p>}
        <p className="mt-2 leading-relaxed" style={{ color: COLORS.ink }}>{block.text}</p>
      </div>
    );
  }
  if (block.callout) {
    const c = block.callout;
    const style = CALLOUT[c.kind] || CALLOUT.rule;
    if (c.kind === "rule") {
      return (
        <aside className="my-8 p-5 flex gap-5 items-start" style={{ background: COLORS.card, border: `1px solid ${COLORS.ink}` }}>
          <IconTile icon={IconCrosshair} size={56} border={COLORS.forest} />
          <div>
            <p className="text-[11px] uppercase tracking-[0.15em] rtl:tracking-normal mb-2" style={{ color: style.label }}>
              {c.title}{rule && rule.total > 1 && <span dir="ltr" className="font-mono ms-2">{rule.n} / {rule.total}</span>}
            </p>
            <p className="font-serif italic text-xl leading-relaxed">{c.text}</p>
          </div>
        </aside>
      );
    }
    return (
      <aside className="my-6 p-5" style={{ background: c.kind === "caution" ? COLORS.dangerBg : COLORS.card, border: `1px solid ${c.kind === "caution" ? COLORS.dangerLine : style.border}` }}>
        <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] rtl:tracking-normal mb-2" style={{ color: style.label }}>
          {c.kind === "caution" && <IconDiamondAlert size={18} />}{c.title}
        </p>
        <p className="leading-relaxed" style={{ color: COLORS.ink }}>{c.text}</p>
      </aside>
    );
  }
  return null;
}

// The contents rail: i–iv, with a forest bar on the section being read.
function Contents({ sections, label }) {
  const [active, setActive] = useState(sections[0]?.id);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver((entries) => {
      const seen = entries.filter((e) => e.isIntersecting).map((e) => e.target.id);
      if (seen.length) setActive(seen[0]);
    }, { rootMargin: "0px 0px -70% 0px" });
    sections.forEach((s) => { const el = document.getElementById(s.id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, [sections]);
  return (
    <nav aria-label={label}>
      <p className="text-[11px] uppercase tracking-[0.15em] rtl:tracking-normal mb-3" style={{ color: COLORS.dim }}>{label}</p>
      <ol className="text-sm">
        {sections.map((s, i) => (
          <li key={s.id}>
            <a href={`#${s.id}`} aria-current={active === s.id ? "location" : undefined}
              className="grid grid-cols-[2rem_minmax(0,1fr)] py-2 ps-3 min-h-[44px] items-baseline"
              style={{ borderInlineStart: `2px solid ${active === s.id ? COLORS.forest : COLORS.line}`, color: active === s.id ? COLORS.forest : COLORS.ink }}>
              <span className="font-serif italic" dir="ltr">{ROMAN[i] ?? i + 1}</span><span>{s.h2}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
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
        <Link to={to("/library")} className="underline" style={{ color: COLORS.actionText }}>{t("site.guides.all")}</Link>
      </div>
    );
  }

  const g = guide[locale];
  const inSection = GUIDES.filter((x) => x.section === guide.section);
  const at = inSection.findIndex((x) => x.slug === guide.slug);
  const prev = inSection[at - 1];
  const next = inSection[at + 1];
  const sections = g.body.filter((b) => b.h2);
  const calc = guide.calculator;
  const calcHref = calc ? `/bench?${new URLSearchParams({ size: calc.size, unit: calc.unit, conc: calc.conc, ref: "guide" })}` : null;

  const rules = g.body.filter((b) => b.callout?.kind === "rule");
  const ruleOf = (b) => (b.callout?.kind === "rule" ? { n: rules.indexOf(b) + 1, total: rules.length } : null);
  const bench = calcHref ?? "/bench?ref=guide";

  // Glossary terms: the first use of each in a paragraph, outside its own section.
  const seen = new Set();
  let here = null;
  const marks = g.body.map((b) => {
    if (b.h2) here = b.id;
    return b.p ? markTerms(b.p, locale, { seen, slug: guide.slug, section: here }) : null;
  });
  const terms = GLOSSARY_ENTRIES.filter((e) => seen.has(e.id)).map((e) => glossaryTerm(e, locale)).filter(Boolean);

  return (
    <article className="max-w-[1280px] mx-auto px-4 sm:px-8 lg:px-14 pt-10">
      <div aria-hidden="true" className="read-progress" />
      <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] rtl:tracking-normal" style={{ color: COLORS.dim }}>
        <IconBook size={18} />
        {t("site.guides.eyebrow", { n: ROMAN[at]?.toUpperCase() ?? at + 1, total: ROMAN[inSection.length - 1]?.toUpperCase() ?? inSection.length, minutes: readingMinutes(g) })}
      </p>
      <h1 className={`${TYPE.display} mt-5 max-w-[14ch]`} style={{ viewTransitionName: "guide-title" }}>{g.title}</h1>
      <p className={`mt-6 measure italic ${TYPE.lead}`} style={{ color: COLORS.inkSoft }}>{g.summary}</p>
      <p className="mt-4 text-sm" style={{ color: COLORS.dim }}>
        {t("site.guides.from", {
          volume: guide.source.volume,
          book: t(`site.guides.books.${guide.source.book}`),
          sections: new Intl.ListFormat(locale === "en" ? "en-GB" : locale, { type: "unit", style: "short" }).format(guide.source.sections),
        })}. {t("site.guides.by")}.
      </p>
      {g.needsReview && (
        <p className="mt-4 p-3 text-sm" style={{ border: `1px dashed ${COLORS.field}`, color: COLORS.inkSoft }}>{t("site.guides.reviewNote")}</p>
      )}

      <div className="mt-10 pt-8 grid grid-cols-1 lg:grid-cols-[15rem_minmax(0,1fr)] gap-10 lg:gap-16" style={{ borderTop: `1px solid ${COLORS.ink}` }}>
      <aside className="lg:sticky lg:top-6 self-start grid gap-6">
        {sections.length > 1 && <Contents sections={sections} label={t("site.guides.toc")} />}
        <a href={bench} className="inline-flex items-center gap-2 px-4 min-h-[48px] text-sm font-medium" style={{ background: COLORS.amber, color: COLORS.onAmber }}>
          <IconBalance size={18} /> {t("site.guides.tryBench")}
        </a>
      </aside>
      <div className="max-w-[37rem]">
      <div className="guide-body">{g.body.map((b, i) => <Block key={i} block={b} rule={ruleOf(b)} marked={marks[i]?.length > 1 ? marks[i] : null} />)}</div>

      {terms.length > 0 && (
        <section aria-labelledby="terms-h" className="mt-12 pt-6" style={{ borderTop: `1px solid ${COLORS.line}` }}>
          <h2 id="terms-h" className="text-xl font-medium">{t("site.guides.terms")}</h2>
          <dl className="mt-4 grid gap-5">
            {terms.map((x) => {
              const source = GUIDES.find((s) => s.slug === x.slug);
              return (
                <div key={x.id} id={`term-${x.id}`} className="scroll-mt-24">
                  <dt className="font-serif italic text-lg" style={{ color: COLORS.ink }}>{x.term}</dt>
                  <dd className="mt-1 font-serif leading-relaxed" style={{ color: COLORS.inkSoft }}>
                    {x.text}{" "}
                    <Link to={to(`/library/${x.slug}`) + `#${x.section}`} className="text-sm underline underline-offset-4 whitespace-nowrap font-sans" style={{ color: COLORS.actionText }}>
                      {t("site.guides.termFrom", { title: source?.[locale]?.title ?? x.slug })}
                    </Link>
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
      )}

      {/* The app's own safety notice, not handbook text: shown on every
          blending guide, styled apart from the author's callouts. */}
      {guide.section === "blending" && (
        <aside role="note" className="mt-10 p-5 flex gap-4 text-sm leading-relaxed" style={{ background: COLORS.dangerBg, border: `1px solid ${COLORS.dangerLine}`, color: COLORS.ink }}>
          <IconFlameTriangle size={32} />
          <div>
          <p className="text-[11px] uppercase tracking-[0.15em] rtl:tracking-normal mb-2" style={{ color: COLORS.danger }}>{t("site.safety.title")}</p>
          {t("site.safety.text")}{" "}
          <Link to={to("/terms") + "#safety"} className="underline" style={{ color: COLORS.danger }}>{t("site.safety.more")}</Link>
          </div>
        </aside>
      )}

      {guide.benchCta && (
        <p className="mt-10">
          <a href="/bench?ref=guide" className="inline-block px-5 py-3 rounded font-semibold"
            style={{ background: COLORS.amber, color: COLORS.onAmber }}>
            {t("site.guides.benchCta")}
          </a>
          <span className="block mt-2 text-sm" style={{ color: COLORS.inkSoft }}>{t("site.guides.benchCtaLead")}</span>
        </p>
      )}
      {calcHref && (
        <a href={calcHref} className="inline-block mt-10 px-5 py-3 rounded font-semibold"
          style={{ background: COLORS.amber, color: COLORS.onAmber }}>
          {t("site.guides.openCalc")}
        </a>
      )}
      <nav aria-label={t("site.guides.more")} className="mt-14 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ borderTop: `1px solid ${COLORS.line}` }}>
        {prev ? (
          <Link to={to(`/library/${prev.slug}`)} viewTransition className="block p-5 hover:bg-[color:var(--c-sand)]" style={{ border: `1px solid ${COLORS.ink}` }}>
            <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] rtl:tracking-normal" style={{ color: COLORS.dim }}><IconArrow size={18} className="-scale-x-100 rtl:scale-x-100" />{t("site.guides.previous")}</span>
            <span className="block mt-2 text-lg font-medium">{prev[locale].title}</span>
          </Link>
        ) : <span />}
        {next && (
          <Link to={to(`/library/${next.slug}`)} viewTransition className="block p-5 text-end hover:bg-[color:var(--c-sand)]" style={{ border: `1px solid ${COLORS.ink}` }}>
            <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] rtl:tracking-normal" style={{ color: COLORS.dim }}>{t("site.guides.next")}<IconArrow size={18} /></span>
            <span className="block mt-2 text-lg font-medium">{next[locale].title}</span>
          </Link>
        )}
      </nav>
      </div>
      </div>
      <Folio>
        <span><span dir="ltr">{guide.source.volume}</span> · {t(`site.guides.books.${guide.source.book}`)}</span>
        <span dir="ltr">{String(at + 1).padStart(2, "0")}</span>
      </Folio>
    </article>
  );
}
