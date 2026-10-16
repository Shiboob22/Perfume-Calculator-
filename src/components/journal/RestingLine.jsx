import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { listBatches } from "../../lib/fragranceApi";
import { JOURNAL_CHANGED, nextReady } from "../../lib/journal";
import { IconHourglass } from "../icons";

// The resting timer on the Bench: one quiet line naming the batch that will
// be ready soonest, linking to the Journal. Nothing shows while nothing rests
// or the list can't be read (offline, signed out): it is a reminder, not a
// screen of its own.
export default function RestingLine() {
  const { t } = useI18n();
  const [next, setNext] = useState(null);

  useEffect(() => {
    let live = true;
    const load = () => listBatches(50).then((b) => { if (live) setNext(nextReady(b)); }).catch(() => {});
    load();
    window.addEventListener(JOURNAL_CHANGED, load);
    return () => { live = false; window.removeEventListener(JOURNAL_CHANGED, load); };
  }, []);

  if (!next) return null;
  return (
    <p className="mb-6 flex items-center gap-2 text-sm" style={{ color: COLORS.inkSoft }}>
      <IconHourglass size={18} />
      <Link to="/bench/journal" className="underline underline-offset-4 decoration-1" style={{ color: COLORS.inkSoft }}>
        {t("journal.nextReady", { count: next.left, name: next.batch.fragrance_name || t("journal.unnamed"), day: next.day, target: next.target })}
      </Link>
    </p>
  );
}
