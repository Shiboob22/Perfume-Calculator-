import React, { useEffect, useState } from "react";
import { Link, Reveal } from "../../motion";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { listBatches } from "../../lib/fragranceApi";
import { JOURNAL_CHANGED, nextReady } from "../../lib/journal";
import { batchStartedAt } from "../../lib/batchTiming";
import { IconHourglass } from "../icons";

const DAY_MS = 86400000;
// Whether the card showed on this device last time (motion M6: the Bench held no
// place for it, so it pushed the formula down when the batches arrived).
const SHOWN_KEY = "kyphira.restingShown";
const wasShown = () => { try { return localStorage.getItem(SHOWN_KEY) === "1"; } catch { return false; } };
const remember = (on) => { try { if (on) localStorage.setItem(SHOWN_KEY, "1"); else localStorage.removeItem(SHOWN_KEY); } catch { /* private mode */ } };
const box = "block mb-6 p-4 sm:p-5 border rounded";

// The resting timer on the Bench (board: a quiet card that stays on screen):
// the batch that will be ready soonest, with the days left as a figure, a dial
// from the first day to the last, and the two dates. Static: the marker moves
// once a day, nothing animates. Links to the Journal. Nothing shows while
// nothing rests or the list can't be read (offline, signed out): it is a
// reminder, not a screen of its own.
export default function RestingLine() {
  const { t, locale } = useI18n();
  const [next, setNext] = useState(undefined); // undefined while loading, null when nothing rests

  useEffect(() => {
    let live = true;
    const load = () => listBatches(50).then((b) => {
      if (!live) return;
      const n = nextReady(b);
      remember(Boolean(n));
      setNext(n);
    }).catch(() => { if (live) setNext(null); });
    load();
    window.addEventListener(JOURNAL_CHANGED, load);
    return () => { live = false; window.removeEventListener(JOURNAL_CHANGED, load); };
  }, []);

  // While the list loads, hold the card's place if it showed last time, so nothing below moves when it arrives.
  if (next === undefined) return wasShown() ? <RestingPlaceholder /> : null;
  if (!next) return null;
  const started = batchStartedAt(next.batch);
  const fmt = (d) => new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : locale, { day: "numeric", month: "short" }).format(d);
  const pct = Math.max(0, Math.min(100, (next.day / next.target) * 100));
  const name = next.batch.fragrance_name || t("journal.unnamed");
  return (
    <Reveal eager>
    <Link to="/journal" aria-label={t("journal.nextReady", { count: next.left, name, day: next.day, target: next.target })}
      className={box} style={{ borderColor: COLORS.line, color: COLORS.ink }}>
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
    </Reveal>
  );
}

/** The card's shape with nothing in it: the same lines at the same sizes, hidden. */
function RestingPlaceholder() {
  return (
    <div aria-hidden="true" data-resting-placeholder className={box} style={{ borderColor: COLORS.line }}>
      <span className="invisible block text-sm">&nbsp;</span>
      <span className="invisible block mt-2 font-serif text-3xl">&nbsp;</span>
      <span className="block mt-3 h-4" />
      <span className="invisible mt-3 flex text-xs">&nbsp;</span>
    </div>
  );
}
