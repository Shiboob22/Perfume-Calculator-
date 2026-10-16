import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { COLORS } from "../../lib/theme";
import { cat } from "../../lib/catalogue";
import { useI18n } from "../../i18n/I18nProvider";
import { listBatches } from "../../lib/fragranceApi";
import { JOURNAL_CHANGED, nextReady, restTimeline } from "../../lib/journal";
import { batchStartedAt } from "../../lib/batchTiming";

// The Bench's side column (Design/boards/Bench.dc.html): the batch that rests
// the longest still, as a number of days with its ruled timeline, and the
// latest batches with their state. Both come from the batches the Journal
// already reads (listBatches); nothing shows until there are batches, or if
// the list cannot be read (offline, signed out).
const fmtDate = (d, locale) => (d ? new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : "en", { day: "numeric", month: "short" }).format(d) : "");
const DAY = 86400000;

export default function BenchSide() {
  const { t, locale } = useI18n();
  const [batches, setBatches] = useState(null);
  useEffect(() => {
    let live = true;
    const load = () => listBatches(50).then((b) => { if (live) setBatches(b); }).catch(() => {});
    load();
    window.addEventListener(JOURNAL_CHANGED, load);
    return () => { live = false; window.removeEventListener(JOURNAL_CHANGED, load); };
  }, []);
  if (!batches?.length) return null;

  const next = nextReady(batches);
  const recent = batches.slice(0, 4);
  const start = next ? batchStartedAt(next.batch) : null;
  const opens = start && next ? new Date(start.getTime() + next.target * DAY) : null;
  const span = next ? Math.max(next.target, 7) : 0;
  const ticks = next ? [0, 1, 2, 3, 4, 5, 6].map((i) => Math.round((span * i) / 6)) : [];

  return (
    <>
      {next && (
        <section aria-labelledby="bench-resting" className="p-5 sm:p-6 border rounded-sm" style={{ background: COLORS.card, borderColor: COLORS.line }}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="bench-resting" className="font-serif text-2xl rtl:leading-[1.5]">{t("bench.resting")}</h2>
            <span dir="ltr" className="text-xs tracking-[0.06em]" style={{ color: COLORS.dim }}>{cat("B", batches.length - batches.indexOf(next.batch))}</span>
          </div>
          <p className="mt-5 flex items-baseline gap-3" dir="auto">
            <span className="font-serif font-light text-[56px] sm:text-[72px] leading-none" style={{ color: COLORS.ink }}>{next.left}</span>
            <span style={{ color: COLORS.inkSoft }}>{t("bench.daysLeft", { count: next.left })}</span>
          </p>
          <div className="relative h-4 mt-6" dir="ltr" role="progressbar" aria-label={t("bench.resting")} aria-valuemin={0} aria-valuemax={next.target} aria-valuenow={Math.min(next.day, next.target)}>
            <div aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px" style={{ background: COLORS.line }} />
            <div aria-hidden="true" className="absolute top-1/2 h-0.5 -mt-px start-0 fill-anim" style={{ width: `${Math.min(100, (next.day / span) * 100)}%`, background: COLORS.amber }} />
            <span aria-hidden="true" className="absolute top-1/2 w-2.5 h-2.5 rounded-full -translate-y-1/2 -translate-x-1/2" style={{ left: `${Math.min(100, (next.day / span) * 100)}%`, background: COLORS.amber }} />
          </div>
          <div className="flex justify-between mt-1.5 text-[11px]" dir="ltr" style={{ color: COLORS.dim }}>
            {ticks.map((n) => <span key={n}>{n}</span>)}
          </div>
          <dl className="grid grid-cols-2 mt-5 text-sm" style={{ border: `1px solid ${COLORS.line}` }}>
            <div className="p-3"><dt className="text-[13px]" style={{ color: COLORS.dim }}>{t("bench.started")}</dt><dd className="mt-1.5">{fmtDate(start, locale)}</dd></div>
            <div className="p-3" style={{ borderInlineStart: `1px solid ${COLORS.line}` }}><dt className="text-[13px]" style={{ color: COLORS.dim }}>{t("bench.opens")}</dt><dd className="mt-1.5" style={{ color: COLORS.actionText }}>{fmtDate(opens, locale)}</dd></div>
          </dl>
          <p className="mt-4 text-sm" dir="auto"><Link to="/bench/journal" className="underline underline-offset-4" style={{ color: COLORS.actionText }}>{next.batch.fragrance_name || t("journal.unnamed")}</Link></p>
        </section>
      )}

      <section aria-labelledby="bench-batches">
        <div className="flex items-baseline justify-between gap-3 pb-3.5" style={{ borderBottom: `1px solid ${COLORS.ink}` }}>
          <h2 id="bench-batches" className="font-serif text-2xl rtl:leading-[1.5]">{t("bench.batches")}</h2>
          <Link to="/bench/journal" className="text-sm min-h-[44px] inline-flex items-center" style={{ color: COLORS.actionText }}>{t("bench.allBatches")}</Link>
        </div>
        <ul>
          {recent.map((b, i) => {
            const tl = restTimeline(b);
            const ready = tl?.ready;
            const frac = tl && tl.target ? Math.min(1, tl.day / tl.target) : 0;
            return (
              <li key={b.id} className="py-3.5" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex items-baseline gap-3 min-w-0">
                    <span dir="ltr" className="text-xs tracking-[0.06em] shrink-0" style={{ color: COLORS.dim }}>{cat("B", batches.length - i)}</span>
                    <span className="font-serif text-xl truncate" dir="auto">{b.fragrance_name || t("journal.unnamed")}</span>
                  </span>
                  <span dir="ltr" className="shrink-0 font-medium">{Number(b.total_g ?? 0).toFixed(2).replace(/\.00$/, "")} g</span>
                </div>
                {tl && (
                  <>
                    <div className="flex justify-between mt-1.5 text-[13px]" style={{ color: ready ? COLORS.verdigrisText : COLORS.dim }}>
                      <span>{ready ? t("bench.ready") : t("bench.dayOf", { day: tl.day, total: tl.target ?? "?" })}</span>
                    </div>
                    <div className="h-0.5 mt-2" style={{ background: COLORS.line }}>
                      <div className="h-0.5" style={{ width: `${frac * 100}%`, background: ready ? COLORS.verdigris : COLORS.amber }} />
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
