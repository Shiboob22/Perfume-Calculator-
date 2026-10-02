// Development only: the Resting Journal components with made-up batches, so
// the due strip and a batch's journal can be checked without signing in.
// Saving fails quietly here (there is no session).
import React, { useState } from "react";
import { COLORS } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import { dueNow } from "../lib/journal";
import JournalDue from "../components/journal/JournalDue";
import BatchJournal from "../components/journal/BatchJournal";

const DAY = 86400000;
const ago = (days) => new Date(Date.now() - days * DAY - 3600000);
const iso = (d) => d.toISOString();
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function fixture() {
  const woody = ago(22);
  const fresh = ago(1);
  const amber = ago(30);
  return [
    { id: "dev-woody", fragrance_name: "Oud Nights", tier: "woody", created_at: iso(woody), blend_date: ymd(woody), concentration_pct: 25,
      batch_checkins: [{ id: "c1", day: 1, scheduled_day: 1, rating: 2, note: "Alcohol still sharp", created_at: iso(ago(21)) }] },
    { id: "dev-fresh", fragrance_name: "عود الليل", tier: "fresh", created_at: iso(fresh), blend_date: ymd(fresh), concentration_pct: 20, batch_checkins: [] },
    { id: "dev-amber", fragrance_name: "Amber Room", tier: "oriental", created_at: iso(amber), blend_date: ymd(amber), concentration_pct: 30,
      batch_checkins: [
        { id: "c2", day: 1, scheduled_day: 1, rating: 3, note: null, created_at: iso(ago(29)) },
        { id: "c3", day: 28, scheduled_day: 28, rating: 5, note: "Round and warm, the spice has settled", created_at: iso(ago(2)) },
      ] },
  ];
}

export default function DevJournal() {
  const { t } = useI18n();
  const [batches, setBatches] = useState(fixture);
  const onDone = (batchId, checkin) => setBatches((prev) => prev.map((b) => b.id === batchId ? { ...b, batch_checkins: [...b.batch_checkins, checkin] } : b));
  const onRemoved = (batchId, id) => setBatches((prev) => prev.map((b) => b.id === batchId ? { ...b, batch_checkins: b.batch_checkins.filter((c) => c.id !== id) } : b));
  return (
    <div className="w-full max-w-3xl mx-auto p-6 sm:p-8" style={{ color: COLORS.ink }}>
      <h2 className="text-lg font-serif font-semibold mb-6" style={{ color: COLORS.forestDeep }}>{t("batches.title")}</h2>
      <JournalDue due={dueNow(batches)} onDone={onDone} />
      <div className="space-y-3">
        {batches.map((b) => (
          <div key={b.id} className="p-4 border" style={{ borderColor: COLORS.line, backgroundColor: COLORS.card }}>
            <div className="text-sm font-serif font-semibold" style={{ color: COLORS.forestDeep }}><bdi>{b.fragrance_name}</bdi></div>
            <BatchJournal batch={b} onDone={onDone} onRemoved={onRemoved} />
          </div>
        ))}
      </div>
    </div>
  );
}
