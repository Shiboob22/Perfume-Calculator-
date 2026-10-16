import React, { useEffect, useState } from "react";
import { Link } from "../../motion";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { listBatches } from "../../lib/fragranceApi";
import { JOURNAL_CHANGED, nextReady } from "../../lib/journal";
import { batchStartedAt } from "../../lib/batchTiming";
import { IconHourglass } from "../icons";

const DAY_MS = 86400000;

// The resting timer on the Bench (board: a quiet card that stays on screen):
// the batch that will be ready soonest, with the days left as a figure, a dial
// from the first day to the last, and the two dates. Static: the marker moves
// once a day, nothing animates. Links to the Journal. Nothing shows while
// nothing rests or the list can't be read (offline, signed out): it is a
// reminder, not a screen of its own.
export default function RestingLine() {
  const { t, locale } = useI18n();
  const [next, setNext] = useState(null);

  useEffect(() => {
    let live = true;
    const load = () => listBatches(50).then((b) => { if (live) setNext(nextReady(b)); }).catch(() => {});
    load();
    window.addEventListener(JOURNAL_CHANGED, load);
    return () => { live = false; window.removeEventListener(JOURNAL_CHANGED, load); };
  }, []);

  if (!next) return null;
  const started = batchStartedAt(next.batch);
  const fmt = (d) => new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : locale, { day: "numeric", month: "short" }).format(d);
  const pct = Math.max(0, Math.min(100, (next.day / next.target) * 100));
  const name = next.batch.fragrance_name || t("journal.unnamed");
  return (
    <Link to="/bench/journal" aria-label={t("journal.nextReady", { count: next.left, name, day: next.day, target: next.target })}
      className="block mb-6 p-4 sm:p-5 border rounded" style={{ borderColor: COLORS.line, color: COLORS.ink }}>
      <span className="flex items-center justify-between gap-3 text-sm" style={{ color: COLORS.inkSoft }}>
        <span className="flex items-center gap-2 min-w-0"><IconHourglass size={18} /><span className="truncate">{name}</span></span>
        <span dir="ltr" className="tabular-nums shrink-0">{t("journal.rest.dial", { day: next.day, target: next.target })}</span>
      </span>
      <span className="block mt-2 font-serif text-3xl tabular-nums">{t("journal.rest.daysLeft", { count: next.left })}</span>
      <span aria-hidden="true" dir="ltr" className="block relative mt-3 h-4">
        <span className="absolute inset-x-0 top-[7px] h-[2px]" style={{ background: COLORS.line }} />
        <span className="absolute start-0 top-[7px] h-[2px]" style={{ width: `${pct}%`, background: COLORS.oil }} />
        <span className="absolute top-0 h-4 w-px" style={{ insetInlineStart: `${pct}%`, background: COLORS.ink }} />
      </span>
      {started && (
        <span className="mt-3 flex justify-between text-xs" style={{ color: COLORS.dim }}>
          <span>{t("journal.rest.started")} <span className="tabular-nums">{fmt(started)}</span></span>
          <span>{t("journal.rest.opens")} <span className="tabular-nums">{fmt(new Date(started.getTime() + next.target * DAY_MS))}</span></span>
        </span>
      )}
    </Link>
  );
}
