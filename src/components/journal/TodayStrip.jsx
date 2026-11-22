import React, { useState } from "react";
import { COLORS } from "../../lib/theme";
import { dueToday, nextUp } from "../../lib/calc";
import { BADGE_WINDOW_DAYS } from "../../lib/journal";
import { saveNote, TAGS } from "../../lib/journalNotes";
import Sheet from "../kx/Sheet";
import SaveState from "../kx/SaveState";

// "Smell today": what is due, one card per batch, oldest window first, and a
// quick note in a sheet (rating, tags, one line, Save: three taps). The full
// editor stays in the batch detail. Quiet when nothing is due, and says what
// comes next.
//
// Saving is optimistic (motion M3): the note is in the Journal and the sheet
// closes at once, with "Saving…"; the server's answer turns it into saved (or
// saved on this phone, through the outbox). If the server refuses it, the note
// comes back out, the card returns and its draft is kept for the next try.
export default function TodayStrip({ items, onSaved, onUndo, onOpen, noOf, locale, t }) {
  const [target, setTarget] = useState(null); // { item, k }
  const [done, setDone] = useState(null); // { state, text }
  const [drafts, setDrafts] = useState({}); // `${batchId}:${k}` → a draft the server refused
  // Only milestones opened in the last week, like the nav badge; older ones stay in the list below.
  const due = dueToday(items, BADGE_WINDOW_DAYS);
  const next = due.length ? null : nextUp(items);
  const name = (k) => t(`journal.page.milestones.${k}`);
  const no = (item) => t("journal.page.no", { no: noOf(item.b) });

  return (
    <section aria-labelledby="journal-today" data-today-strip className="p-4 sm:p-5 rounded" style={{ border: `1px solid ${COLORS.line}`, background: COLORS.card }}>
      <h2 id="journal-today" className="font-serif text-2xl">{t("journal.page.todayStrip.title")}</h2>
      <SaveState state={done?.state} className="empty:hidden">{done?.text}</SaveState>
      {due.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-2">
          {due.map(({ item, k }) => (
            <li key={item.b.id} data-today-card={item.b.id} className="flex flex-wrap items-center gap-3 py-2" style={{ borderTop: `1px solid ${COLORS.line}` }}>
              <button type="button" onClick={() => onOpen(item.b.id)} className="flex-1 min-w-[10rem] min-h-[44px] text-start">
                <span className="block font-medium truncate">{item.b.fragrance_name}</span>
                <span className="block text-sm" style={{ color: COLORS.inkSoft }}>
                  {t("journal.page.todayStrip.card", { no: no(item), milestone: name(k) })}
                </span>
              </button>
              <button type="button" onClick={() => { setDone(null); setTarget({ item, k }); }}
                className="min-h-[44px] px-4 text-sm font-medium rounded" style={{ background: COLORS.amber, color: COLORS.onAmber }}>
                {t("journal.page.todayStrip.add")}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2" style={{ color: COLORS.inkSoft }}>
          {t("journal.page.todayStrip.none")}{" "}
          {next
            ? t("journal.page.todayStrip.next", {
                no: no(next.item),
                date: new Date(next.at).toLocaleDateString(locale, { day: "numeric", month: "short", numberingSystem: "latn" }),
              })
            : t("journal.page.todayStrip.allDone")}
        </p>
      )}
      <Sheet open={!!target} onClose={() => setTarget(null)} closeLabel={t("journal.page.todayStrip.close")}
        title={target ? t("journal.page.todayStrip.sheet", { no: no(target.item), milestone: name(target.k) }) : ""}>
        {target && (
          <QuickNote key={`${target.item.b.id}:${target.k}`} target={target} initial={drafts[`${target.item.b.id}:${target.k}`]} t={t}
            onSubmit={(draft, kept) => {
              const { item, k } = target;
              const words = { no: no(item), milestone: name(k) };
              const slot = `${item.b.id}:${k}`;
              onSaved(item.b, { ...draft, skipped: false, created_at: new Date().toISOString() });
              setDrafts((d) => { const n = { ...d }; delete n[slot]; return n; });
              setDone({ state: "working", text: t("journal.page.todayStrip.saving", words) });
              setTarget(null);
              saveNote(draft).then(({ checkin, queued }) => {
                onSaved(item.b, checkin);
                setDone({ state: queued ? "queued" : "saved", text: t(queued ? "journal.page.savedOffline" : "journal.page.todayStrip.saved", words) });
              }, () => {
                onUndo?.(item.b, draft.id);
                setDrafts((d) => ({ ...d, [slot]: kept }));
                setDone({ state: "failed", text: t("journal.page.todayStrip.failed", words) });
              });
            }} />
        )}
      </Sheet>
    </section>
  );
}

function QuickNote({ target, initial, onSubmit, t }) {
  const { item, k } = target;
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [tags, setTags] = useState(initial?.tags ?? []);
  const [text, setText] = useState(initial?.text ?? "");
  const [status, setStatus] = useState(null);
  const chip = (on) => ({ border: `1px solid ${on ? COLORS.ink : COLORS.line}`, background: on ? COLORS.ink : "transparent", color: on ? COLORS.paper : COLORS.inkSoft });
  const days = { d1: 0, w1: 7, w2: 14, m1: 30, m3: 90 }[k];

  function save() {
    if (!text.trim() && !rating) { setStatus("empty"); return; }
    onSubmit({
      id: crypto.randomUUID(), batch_id: item.b.id, day: item.day, scheduled_day: days,
      note: text.trim() || null, rating: rating || null, tags: TAGS.filter((x) => tags.includes(x)),
    }, { rating, tags, text });
  }

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label={t("journal.page.rating")} className="flex flex-wrap items-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" aria-pressed={rating >= n} aria-label={t("journal.page.ratingN", { count: n })}
            onClick={() => { setRating(rating === n ? 0 : n); setStatus(null); }}
            className="w-11 h-11 rounded-full text-[14px] tabular-nums"
            style={{ border: `1px solid ${rating >= n ? COLORS.amber : COLORS.line}`, background: rating >= n ? COLORS.amber : "transparent", color: rating >= n ? COLORS.onAmber : COLORS.inkSoft }}>
            {n}
          </button>
        ))}
      </div>
      <div role="group" aria-label={t("journal.page.tags")} className="flex flex-wrap gap-2">
        {TAGS.map((g) => {
          const on = tags.includes(g);
          return (
            <button key={g} type="button" aria-pressed={on} onClick={() => setTags(on ? tags.filter((x) => x !== g) : [...tags, g])}
              className="min-h-[44px] px-3 text-[14px] rounded" style={chip(on)}>{t(`journal.page.tag.${g}`)}</button>
          );
        })}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="quick-note" className="text-sm" style={{ color: COLORS.inkSoft }}>{t("journal.page.note")}</label>
        <input id="quick-note" type="text" dir="auto" maxLength={280} value={text} autoComplete="off" enterKeyHint="done"
          onChange={(e) => { setText(e.target.value); setStatus(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); save(); } }}
          placeholder={t("journal.page.notePh")} className="px-3 py-2 rounded border text-base min-h-[44px]"
          style={{ borderColor: COLORS.field, background: COLORS.cardHi, color: COLORS.ink }} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={save}
          className="min-h-[48px] px-5 text-[15px] font-medium rounded" style={{ background: COLORS.amber, color: COLORS.onAmber }}>
          {t("journal.page.save")}
        </button>
        <p role="status" className="text-sm empty:hidden" style={{ color: COLORS.danger }}>
          {status === "empty" && t("journal.page.needSomething")}
        </p>
      </div>
    </div>
  );
}
