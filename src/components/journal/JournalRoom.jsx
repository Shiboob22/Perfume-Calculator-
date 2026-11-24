import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { Link, startNav, useFlip, useNavigate } from "../../motion";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { listBatches } from "../../lib/fragranceApi";
import { loadFailure, recall, remember } from "../../lib/lastLoaded";
import { toggleRemind } from "../../lib/benchApi";
import { saveNote, TAGS } from "../../lib/journalNotes";
import { useEntitlements } from "../../lib/useEntitlements";
import { can, journalOpen } from "../../lib/entitlements";
import { batchStartedAt } from "../../lib/batchTiming";
import { notesDue, todayFor, JOURNAL_CHANGED, READY_SEEN_KEY, readyMomentDue, markReadySeen } from "../../lib/journal";
import { makeAgainHref } from "../../lib/oilHistory";
import { useProfile } from "../../lib/useProfile";
import { flagOn } from "../../lib/flags";
import { useMinWidth } from "../../lib/useMinWidth";
import { listOrders } from "../../lib/ordersApi";
import { TIER_COLORS, TIERS } from "../../lib/tiers";
import { UNIT_LABELS } from "../../lib/calcPrefill";
import {
  MILESTONES, DOT_GLYPH, notesByMilestone, milestoneDots, milestoneIndex, restProgress, trackPosition, isFresh, tierFor,
  JOURNAL_SORTS, journalSort, journalSortKey, journalSortDir, needsNote, oilKey,
} from "../../lib/calc";
import { useStartTrial } from "../plan/Upgrade";
import { IconBell } from "../icons";
import Chip from "../kx/Chip";
import { useSceneCtx } from "../../motion/gsap/index.js";
import { noteSaved } from "./scene.js";
import ListSkeleton from "../kx/ListSkeleton";
import TodayStrip from "./TodayStrip";
import MaturationCurve from "./MaturationCurve";
import OilOverlay from "./OilOverlay";
import BatchCompare from "./BatchCompare";
import BatchRecord from "./BatchRecord";
import PushToggle from "./PushToggle";
import SaveState from "../kx/SaveState";
import RatingRow from "../kx/RatingRow";
import { play } from "../../lib/sound";

// The note editor's status, in the shared save-state language (kx/SaveState).
const SAVE_STATE = { saved: "saved", queued: "queued", error: "failed", empty: "failed" };
const SAVE_TEXT = { saved: "journal.page.saved", queued: "journal.page.savedOffline", error: "journal.page.saveFailed", empty: "journal.page.needSomething" };

// The Journal room (Bench SaaS Phase 5, prototype Journal.dc.html): every
// logged batch rests 90 days and is noted at five milestones. Built on the
// existing resting journal, not beside it: the batches and their notes are
// the same /api/batches rows and batch_checkins (a milestone note is a
// check-in for that milestone's day, with tags); lib/calc/restTracker.ts
// decides which note is which milestone's. Free sees its newest 3 batches
// (journal_window, the same rule the API applies to notes), Pro all of them.
// The batch records (edit, share, delete) stay at /bench/journal.

const DAY_MS = 24 * 60 * 60 * 1000;

const SORT_KEY = "kyphira.journalSort";
const DIR_KEY = "kyphira.journalSortDir";
const stored = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
const store = (key, v) => { try { if (v == null) localStorage.removeItem(key); else localStorage.setItem(key, v); } catch { /* private window */ } };

function SwapIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 4v16M3.5 16.5 7 20l3.5-3.5M17 20V4M13.5 7.5 17 4l3.5 3.5" />
    </svg>
  );
}

const noOf = (b) => String(b.batch_no ?? 0).padStart(3, "0");
const swatchOf = (b) => TIER_COLORS[b.tier] ?? COLORS.dim;

function Lock({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={COLORS.actionText} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="10.5" width="14" height="10" rx="1.5" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

// The Pro card: older batches on Free, or the reminder asked for on Free.
function ProCard({ title, body, t }) {
  const { start, busy, message } = useStartTrial();
  const entitlements = useEntitlements();
  const used = entitlements.trial?.used;
  return (
    <div data-pro-card className="mt-5 p-4 rounded flex flex-col gap-2" style={{ border: `1px solid ${COLORS.amber}`, background: COLORS.card }}>
      <p className="flex items-center gap-2 font-medium"><Lock />{title}</p>
      <p className="text-sm" style={{ color: COLORS.inkSoft }}>{body}</p>
      <button type="button" onClick={start} disabled={busy || used}
        className="self-start min-h-[44px] px-4 text-sm font-medium rounded disabled:opacity-60" style={{ background: COLORS.amber, color: COLORS.onAmber }}>
        {used ? t("plan.trial.used") : busy ? t("upgrade.starting") : t("plan.trial.start")}
      </button>
      <p role="status" className="text-xs empty:hidden" style={{ color: COLORS.inkSoft }}>{message}</p>
    </div>
  );
}

export default function JournalRoom() {
  const { t, locale } = useI18n();
  const entitlements = useEntitlements();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [batches, setBatches] = useState(null); // null = loading
  // A failed load says why ("offline" | "failed"); with a list from earlier in
  // this visit the page shows that one and says it is not fresh (audit M5).
  const [loadError, setLoadError] = useState(null);
  const [stale, setStale] = useState(null);
  const [now] = useState(() => new Date());
  const listRef = useRef(null);

  const load = useCallback(() => {
    setLoadError(null);
    listBatches(100)
      .then((list) => { setBatches(list); setStale(null); })
      .catch(() => {
        const why = loadFailure();
        const earlier = recall("journal");
        if (earlier) { setBatches((cur) => cur ?? earlier); setStale(why); } else setLoadError(why);
      });
  }, []);
  useEffect(load, [load]);
  useEffect(() => { if (batches) remember("journal", batches); }, [batches]);
  // Back online: try again by itself.
  useEffect(() => {
    if (!loadError && !stale) return undefined;
    window.addEventListener("online", load);
    return () => window.removeEventListener("online", load);
  }, [loadError, stale, load]);

  const pro = can(entitlements, "fullJournal");

  // Sellers (Pro, the orders flag): bottles promised to buyers per batch, from the order queue.
  const { profile } = useProfile();
  const sellerLine = flagOn("orders") && Boolean(profile?.sells) && entitlements.loaded && can(entitlements, "orders");
  const [promised, setPromised] = useState(() => new Map());
  useEffect(() => {
    if (!sellerLine) return undefined;
    let live = true;
    listOrders().then((rows) => {
      if (!live) return;
      const m = new Map();
      for (const o of rows) if (o.batch_id && ["resting", "ready", "bottled"].includes(o.status)) m.set(o.batch_id, (m.get(o.batch_id) ?? 0) + 1);
      setPromised(m);
    }).catch(() => {});
    return () => { live = false; };
  }, [sellerLine]);
  const all = useMemo(() => [...(batches ?? [])].sort((a, b) => (Number(b.batch_no) || 0) - (Number(a.batch_no) || 0)
    || String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""))), [batches]);
  const open = useMemo(() => journalOpen(entitlements, all), [entitlements, all]);
  const visible = useMemo(() => all.filter((b) => open.has(b.id)), [all, open]);
  const lockedN = all.length - visible.length;

  // One list in the chosen order (URL, then this device, then "needs a note").
  // Each sort but "needs a note" runs either way (?dir=asc|desc); a new
  // sort starts in its own default direction.
  const sort = journalSortKey(params.get("sort") ?? stored(SORT_KEY));
  const dir = journalSortDir(sort, params.get("dir") ?? stored(DIR_KEY));
  const sorted = useMemo(() => journalSort(visible.map((x) => ({
    b: x, day: todayFor(x, now), no: Number(x.batch_no) || 0, ml: Number(x.total_ml),
    start: batchStartedAt(x)?.getTime() ?? NaN, checkins: x.batch_checkins,
  })), sort, dir).map((r) => r.b), [visible, sort, dir, now]);
  useFlip(listRef, sorted.map((x) => x.id).join(","));
  const pickSort = (k) => {
    store(SORT_KEY, k);
    store(DIR_KEY, null);
    setParams((p) => { const q = new URLSearchParams(p); q.set("sort", k); q.delete("dir"); return q; }, { replace: true });
  };
  const flipDir = () => {
    const next = dir === "asc" ? "desc" : "asc";
    store(SORT_KEY, sort);
    store(DIR_KEY, next);
    setParams((p) => { const q = new URLSearchParams(p); q.set("sort", sort); q.set("dir", next); return q; }, { replace: true });
  };

  // The header's "due" badge follows the notes made here.
  useEffect(() => {
    if (!batches) return;
    window.dispatchEvent(new CustomEvent(JOURNAL_CHANGED, { detail: { due: notesDue(visible) } }));
  }, [batches, visible]);

  const selId = params.get("batch");
  const chosen = visible.find((x) => x.id === selId) ?? null;
  const b = chosen ?? sorted[0] ?? null;
  // Phones (below lg) show the list, or one batch's record on its own screen
  // when a row was picked; wide screens keep both side by side.
  const phoneList = chosen ? "hidden lg:block" : "";
  const phoneRecord = chosen ? "" : "hidden lg:block";
  // Picking a batch carries its name from the row into the detail (motion M2) when both are on screen.
  // From the list it is a new history entry, so the phone's back gesture returns to the list.
  const pick = (id, from) => startNav(() => setParams((p) => { const q = new URLSearchParams(p); q.set("batch", id); return q; },
    chosen ? { replace: true, state: location.state } : { state: { fromList: true } }),
  { share: `batch-${id}`, from });
  const backToList = () => {
    if (location.state?.fromList) navigate(-1);
    else setParams((p) => { const q = new URLSearchParams(p); q.delete("batch"); return q; }, { replace: true });
  };
  // A record opened on a phone starts at its top.
  useEffect(() => {
    if (chosen && typeof window.matchMedia === "function" && !window.matchMedia("(min-width: 1024px)").matches) window.scrollTo(0, 0);
  }, [chosen?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const removeBatch = (id) => {
    setBatches((list) => list.filter((x) => x.id !== id));
    setParams((p) => { const q = new URLSearchParams(p); q.delete("batch"); return q; }, { replace: true });
  };
  const replaceBatch = (next) => setBatches((list) => list.map((x) => (x.id === next.id ? { ...x, ...next } : x)));

  // The room's header, the same whether or not the list loaded (audit M5, M16).
  // A batch open on a phone hides it but keeps the page's h1 for screen readers;
  // `contents` so the hidden header takes no gap in the column.
  const header = (
    <div className={chosen ? "max-lg:contents" : ""}>
      <p className={`${phoneList} flex items-center gap-3 text-[12px] uppercase tracking-[0.18em] rtl:tracking-normal`} style={{ color: COLORS.actionText }}>
        <span dir="ltr" className="tabular-nums">II</span><span>{t("journal.page.room")}</span>
      </p>
      <h1 className={`${chosen ? "max-lg:sr-only " : ""}mt-2 font-serif text-[clamp(2.25rem,7vw,3.5rem)] leading-[1.05]`}>{t("journal.page.title")}</h1>
      <p className={`${phoneList} mt-2 max-w-[52ch]`} style={{ color: COLORS.inkSoft }}>{t("journal.page.lead")}</p>
      {!loadError && can(entitlements, "reminders") && <div className={`${phoneList} mt-3`}><PushToggle t={t} /></div>}
    </div>
  );
  const retry = <button type="button" onClick={load} className="min-h-[44px] underline" style={{ color: COLORS.actionText }}>{t("journal.page.retry")}</button>;

  if (loadError) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-6 sm:pt-10 flex flex-col gap-6 sm:gap-9 min-h-[100svh]">
        {header}
        <div data-load-error={loadError}>
          <p role="alert">{loadError === "offline" ? t("app.load.offline") : t("journal.page.loadFailed")}</p>
          <div className="mt-2">{retry}</div>
        </div>
      </div>
    );
  }

  const dayOf = (x) => todayFor(x, now);
  const dateAt = (x, days) => {
    const start = batchStartedAt(x);
    if (!start) return "";
    return new Date(start.getTime() + days * DAY_MS).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric", numberingSystem: "latn" });
  };
  // Batches logged before the typed size was kept (No. 1–36) fall back to their volume in mL.
  const unitOf = (u) => (UNIT_LABELS[u] ? t(`units.${u}`) : t("units.ml"));
  const sizeOf = (x) => (x.amount != null ? { size: x.amount, unit: unitOf(x.unit) } : { size: x.total_ml ?? "", unit: unitOf("ml") });
  const metaOf = (x) => t("journal.page.meta", { ...sizeOf(x), pct: x.concentration_pct, tier: tierFor(Number(x.concentration_pct)).name });
  const oilBatches = all.map((x) => ({
    id: x.id, no: Number(x.batch_no) || 0, oil: oilKey(x), pct: Number(x.concentration_pct), checkins: x.batch_checkins, again: makeAgainHref(x),
    name: x.fragrance_name, size: sizeOf(x).size !== "" ? `${sizeOf(x).size} ${sizeOf(x).unit}` : "", poured: dateAt(x, 0), day: dayOf(x),
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-6 sm:pt-10 flex flex-col gap-6 sm:gap-9 min-h-[100svh]">
      {header}
      {stale && (
        <p role="status" data-stale={stale} className={`${phoneList} flex flex-wrap items-center gap-x-3 text-sm`} style={{ color: COLORS.inkSoft }}>
          <span>{stale === "offline" ? t("app.load.staleOffline") : t("app.load.staleFailed")}</span>{retry}
        </p>
      )}

      {batches === null && <ListSkeleton label={t("app.loading")} rows={5} bar className="max-w-[300px] w-full" />}

      {batches && !visible.length && (
        <div className="kx-settle p-6 rounded" style={{ border: `1px solid ${COLORS.line}` }}>
          <p>{t("journal.page.empty")}</p>
          <Link to="/bench" className="mt-3 inline-flex min-h-[44px] items-center underline" style={{ color: COLORS.actionText }}>{t("journal.page.emptyAction")}</Link>
        </div>
      )}

      {batches && visible.length > 0 && (
        <div className={phoneList}><TodayStrip items={visible.map((x) => ({
          b: x, day: dayOf(x), no: Number(x.batch_no) || 0, start: batchStartedAt(x)?.getTime() ?? NaN, checkins: x.batch_checkins,
        }))} onSaved={(batch, checkin) => setBatches((list) => list.map((x) => (x.id === batch.id
          ? { ...x, batch_checkins: [...(x.batch_checkins ?? []).filter((c) => c.id !== checkin.id), checkin] } : x)))}
        onUndo={(batch, checkinId) => setBatches((list) => list.map((x) => (x.id === batch.id
          ? { ...x, batch_checkins: (x.batch_checkins ?? []).filter((c) => c.id !== checkinId) } : x)))}
        onOpen={pick} noOf={noOf} locale={locale} t={t} /></div>
      )}

      {b && (
        <>
          <div className="flex flex-wrap gap-6 sm:gap-8 items-start">
            <aside className={`flex-[1_1_100%] lg:flex-[0_0_300px] min-w-0 ${phoneList}`}>
              <h2 id="journal-batches" className="font-serif text-2xl">{t("journal.page.batches")}</h2>
              <div role="group" aria-label={t("journal.page.sort.label")} className="mt-3 flex flex-wrap gap-2">
                {JOURNAL_SORTS.map((k) => (
                  <Chip key={k} pressed={sort === k} onToggle={() => pickSort(k)} className="whitespace-nowrap">{t(`journal.page.sort.${k}`)}</Chip>
                ))}
              </div>
              {dir && (
                <button type="button" data-sort-dir={dir} onClick={flipDir}
                  className="mt-2 inline-flex items-center gap-2 min-h-[44px] px-3 text-sm rounded border"
                  style={{ borderColor: COLORS.field, color: COLORS.ink }}>
                  <SwapIcon />{t(`journal.page.dir.${sort}.${dir}`)}
                </button>
              )}
              <ul ref={listRef} aria-labelledby="journal-batches" className="mt-3" style={{ borderTop: `1px solid ${COLORS.line}` }}>
                {sorted.map((x) => {
                  const on = x.id === b.id;
                  const day = dayOf(x);
                  const dots = milestoneDots(x.batch_checkins, day);
                  const p = restProgress(day);
                  const due = sort === "note" ? needsNote(x.batch_checkins, day) : null;
                  return (
                    <li key={x.id} data-flip={x.id}>
                      <button type="button" onClick={(e) => pick(x.id, e.currentTarget)} aria-pressed={on} data-batch={x.id}
                        className="w-full flex items-center gap-3 px-2 py-3 text-start" style={{ borderBottom: `1px solid ${COLORS.line}`, background: on ? COLORS.sand : "transparent" }}>
                        <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full flex-none" style={{ background: swatchOf(x) }} />
                        {/* The batch line wraps instead of cutting off "EDP Inten…" in the narrow desktop column (audit L10). */}
                        <span className="flex-1 min-w-0 flex flex-col">
                          <span className="flex items-center gap-2 min-w-0">
                            <span data-mo-share={`batch-${x.id}`} className="truncate font-medium">{x.fragrance_name}</span>
                            {isFresh(x.created_at, x.batch_checkins, now) && (
                              <span className="flex-none px-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] rtl:tracking-normal" style={{ background: COLORS.amber, color: COLORS.onAmber }}>{t("journal.page.newBadge")}</span>
                            )}
                          </span>
                          <span className="text-xs break-words" style={{ color: COLORS.dim }} data-row-line>
                            {t("journal.page.rowLine", { no: noOf(x), ...sizeOf(x), pct: x.concentration_pct })}
                          </span>
                          <span aria-hidden="true" className="relative block h-1.5 mt-2" style={{ background: COLORS.line }}>
                            <span className="absolute inset-y-0 start-0" style={{ width: `${p.fraction * 100}%`, background: p.ready ? COLORS.verdigris : COLORS.amber }} />
                          </span>
                          <span className="mt-1 flex items-baseline justify-between gap-2 text-xs">
                            <span data-ready className="font-medium" style={{ color: p.ready ? (COLORS.verdigrisText ?? COLORS.verdigris) : COLORS.ink }}>
                              {p.ready ? t("journal.page.ready") : t("journal.page.readyIn", { count: p.left })}
                            </span>
                            <span className="tabular-nums" style={{ color: COLORS.dim }}>{t("journal.page.progress", { n: p.day })}</span>
                          </span>
                          {due && (
                            <span data-due className="mt-1 text-xs font-medium" style={{ color: COLORS.actionText }}>
                              {t("journal.page.noteDue", { milestone: t(`journal.page.milestones.${due.k}`) })}
                            </span>
                          )}
                        </span>
                        <span dir="ltr" role="img" className="flex-none text-[11px] tracking-[0.05em]" style={{ color: COLORS.actionText }}
                          aria-label={t("journal.page.dotsLabel", { list: MILESTONES.map((m, i) => `${t(`journal.page.milestones.${m.k}`)} ${t(`journal.page.dots.${dots[i]}`)}`).join(", ") })}>
                          <span aria-hidden="true">{dots.map((d) => DOT_GLYPH[d]).join(" ")}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {lockedN > 0 && <ProCard title={t("journal.page.locked", { count: lockedN })} body={t("journal.page.lockedBody")} t={t} />}
              <Link to="/bench/journal" className="mt-4 inline-flex min-h-[44px] items-center text-sm underline underline-offset-4" style={{ color: COLORS.actionText }}>
                {t("journal.page.records")}
              </Link>
            </aside>
            <div className={`flex-[1_1_100%] lg:flex-1 min-w-0 ${phoneRecord}`} data-journal-record>
              <button type="button" onClick={backToList} data-journal-back
                className="lg:hidden mb-2 inline-flex items-center gap-2 min-h-[44px] text-sm underline underline-offset-4" style={{ color: COLORS.actionText }}>
                <span aria-hidden="true" className="rtl:-scale-x-100">←</span>{t("journal.page.backToList")}
              </button>
            <BatchDetail key={b.id} b={b} day={dayOf(b)} pro={pro} canRemind={can(entitlements, "reminders")}
              oilBatches={oilBatches} canCompare={can(entitlements, "journal.insights")} onDeleted={removeBatch} promised={promised.get(b.id) ?? 0}
              dateAt={dateAt} metaOf={metaOf} onChange={replaceBatch} t={t} locale={locale} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function BatchDetail({ b, day, pro, canRemind, oilBatches, canCompare, promised, dateAt, metaOf, onChange, onDeleted, t }) {
  const notes = notesByMilestone(b.batch_checkins);
  const fold = !useMinWidth(1024);
  const reachedAt = MILESTONES[milestoneIndex(day)].k;
  const [ms, setMs] = useState(reachedAt);
  const m = MILESTONES.find((x) => x.k === ms) ?? MILESTONES[0];
  const p = restProgress(day);
  const pos = trackPosition(day);
  const [askPro, setAskPro] = useState(false);
  const [remindBusy, setRemindBusy] = useState(false);
  const [remindMsg, setRemindMsg] = useState("");
  const remindOn = Boolean(b.remind) && canRemind;
  // Ready day (motion M4): the first time this batch is opened after its rest
  // is done, the track completes in verdigris and the line turns to "Ready".
  // Once per batch on this device; the words are the same either way.
  const [readyMoment] = useState(() => {
    try { return readyMomentDue(JSON.parse(localStorage.getItem(READY_SEEN_KEY) ?? "[]"), b.id, p.ready); } catch { return false; }
  });
  useEffect(() => { if (readyMoment) play("ready"); }, [readyMoment]);
  useEffect(() => {
    if (!p.ready) return;
    try { localStorage.setItem(READY_SEEN_KEY, JSON.stringify(markReadySeen(JSON.parse(localStorage.getItem(READY_SEEN_KEY) ?? "[]"), b.id))); } catch { /* storage off */ }
  }, [b.id, p.ready]);
  const family = TIERS[b.tier] ? t(`families.${b.tier}.label`) : b.tier;
  const withNotes = MILESTONES.filter((x) => notes[x.k]);
  const [compareOn, setCompareOn] = useState(false);
  const rootRef = useRef(null);
  const scene = useSceneCtx(rootRef);

  async function remind() {
    if (!canRemind) { setAskPro(true); return; }
    setRemindBusy(true); setRemindMsg("");
    try {
      const next = await toggleRemind(b.id, !b.remind);
      onChange({ id: b.id, remind: next?.remind ?? !b.remind });
      if (!b.remind) setRemindMsg(t("journal.page.remindNote"));
    } catch {
      setRemindMsg(t("journal.page.remindFailed"));
    } finally {
      setRemindBusy(false);
    }
  }

  function saved(checkin) {
    const list = (b.batch_checkins ?? []).filter((c) => c.id !== checkin.id);
    onChange({ id: b.id, batch_checkins: [...list, checkin] });
    const dot = rootRef.current?.querySelector(`[data-node="${m.k}"]`);
    scene?.add(() => noteSaved(scene, dot));
  }

  // The bell: in the header on wide screens; on phones after the note, which is the page's job (audit H5).
  const reminder = (
    <button type="button" onClick={remind} aria-pressed={remindOn} disabled={remindBusy}
      className="min-h-[44px] px-3.5 inline-flex items-center gap-2 text-sm rounded"
      style={{ border: `1px solid ${remindOn ? COLORS.verdigris : COLORS.ink}`, background: remindOn ? COLORS.verdigris : "transparent", color: remindOn ? COLORS.paper : COLORS.ink }}>
      <IconBell size={16} />
      {!canRemind && <><Lock size={12} /><span className="sr-only">{t("plan.names.pro")}</span></>}
      <span>{remindOn ? t("journal.page.reminded") : t("journal.page.remind")}</span>
    </button>
  );
  const reminderNote = (
    <>
      <p role="status" className="mt-2 text-xs empty:hidden" style={{ color: COLORS.inkSoft }}>{remindMsg}</p>
      {askPro && !canRemind && <ProCard title={t("journal.page.remindPro")} body={t("journal.page.remindBody")} t={t} />}
    </>
  );

  return (
    <section ref={rootRef} aria-labelledby="journal-batch" className="min-w-0 p-[18px] sm:p-7 rounded" style={{ background: COLORS.card, border: `1px solid ${COLORS.ink}` }}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[12px] uppercase tracking-[0.15em] rtl:tracking-normal" style={{ color: COLORS.actionText }}>
            <span dir="ltr">{t("journal.page.no", { no: noOf(b) })}</span> · {family}
          </p>
          <h2 id="journal-batch" data-mo-share-to={`batch-${b.id}`} className="mt-1 font-serif text-[32px] leading-tight break-words">{b.fragrance_name}</h2>
          <p className="mt-1 text-sm" style={{ color: COLORS.inkSoft }}>{metaOf(b)}</p>
          <p className="mt-1 text-sm" style={{ color: COLORS.inkSoft }}>
            {t("journal.page.poured", { date: dateAt(b, 0) })} ·{" "}
            {p.ready
              ? <span data-ready-moment={readyMoment ? "" : undefined} className={readyMoment ? "kx-ready-word inline-block" : undefined} style={{ color: COLORS.verdigrisText ?? COLORS.verdigris }}>{t("journal.page.ready")}</span>
              : t("journal.page.readyOn", { date: dateAt(b, 90) })}
          </p>
        </div>
        {!fold && reminder}
      </div>
      {!fold && reminderNote}

      {/* The rest timeline: five milestones, filled up to today. */}
      <div className="mt-5 lg:mt-7" role="group" aria-label={t("journal.page.timeline")}>
        <p className="sr-only">{t("journal.page.today", { n: day })}</p>
        <div className="relative">
          <div aria-hidden="true" className="absolute top-[18px] h-[3px]" style={{ insetInlineStart: "10%", insetInlineEnd: "10%", background: COLORS.line }}>
            <div data-track-fill className="kx-track-fill absolute inset-y-0 start-0" style={{ width: `${pos * 100}%`, background: COLORS.amber }} />
            {p.ready && <div data-ready-fill className={`absolute inset-0${readyMoment ? " kx-ready-fill" : ""}`} style={{ background: COLORS.verdigris }} />}
          </div>
          {pos < 1 && (
            <span aria-hidden="true" data-today className="absolute top-[8px] w-[2px] h-[23px]" style={{ insetInlineStart: `calc(10% + ${pos * 80}% - 1px)`, background: COLORS.ink }} />
          )}
          <ol className="relative grid grid-cols-5">
            {MILESTONES.map((x) => {
              const has = Boolean(notes[x.k]);
              const past = x.days <= day;
              const on = x.k === m.k;
              const state = t(`journal.page.dots.${has ? "note" : past ? "reached" : "future"}`);
              const name = t(`journal.page.milestones.${x.k}`);
              return (
                <li key={x.k} className="flex flex-col items-center gap-1.5 text-center min-w-0">
                  <button type="button" onClick={() => setMs(x.k)} aria-pressed={on} data-node={x.k}
                    aria-label={t("journal.page.nodeLabel", { name, date: dateAt(b, x.days), state })}
                    className="w-9 h-9 rounded-full inline-flex items-center justify-center text-xs"
                    style={{
                      color: COLORS.onAmber, background: has ? COLORS.amber : COLORS.card,
                      border: `1.5px ${past ? "solid" : "dashed"} ${has ? COLORS.amber : past ? COLORS.ink : COLORS.field}`,
                      boxShadow: on ? `0 0 0 3px ${COLORS.card}, 0 0 0 4.5px ${COLORS.ink}` : "none",
                    }}>
                    <span aria-hidden="true">{has ? "●" : ""}</span>
                  </button>
                  <span aria-hidden="true" className="text-[13px] leading-tight" style={{ fontWeight: on ? 600 : 400, color: past ? COLORS.ink : COLORS.dim }}>{name}</span>
                  <span aria-hidden="true" className="text-[11px] leading-tight hidden sm:block" style={{ color: COLORS.dim }}>{dateAt(b, x.days)}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* The milestone's note first: the reminder, the badge and Smell today all send people here to write it (audit H5). */}
      <div data-note-block className="mt-5 pt-4 lg:mt-7 lg:pt-5" style={{ borderTop: `1px solid ${COLORS.line}` }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-xl">{t(`journal.page.milestones.${m.k}`)} · {dateAt(b, m.days)}</h3>
          <button type="button" onClick={() => setCompareOn((v) => !v)} aria-expanded={compareOn}
            className="min-h-[40px] px-3 text-sm rounded" style={{ border: `1px solid ${COLORS.ink}` }}>
            {compareOn ? t("journal.page.compareOff") : t("journal.page.compare")}
          </button>
        </div>
        {m.days > day
          ? <p className="mt-3 text-sm" style={{ color: COLORS.inkSoft }}>{t("journal.page.future", { date: dateAt(b, m.days) })}</p>
          : <NoteEditor key={`${b.id}:${m.k}`} b={b} m={m} day={day} note={notes[m.k]} onSaved={saved} pro={pro} compact={fold} t={t} />}
        {compareOn && (
          <Compare notes={notes} withNotes={withNotes} b={b} dateAt={dateAt} t={t} />
        )}
      </div>
      {fold && <div data-reminder className="mt-5">{reminder}{reminderNote}</div>}

      {/* On phones the rest folds away under its titles. */}
      <MaturationCurve checkins={b.batch_checkins} fold={fold} t={t} />
      <OilOverlay batches={oilBatches} selectedId={b.id} locked={!canCompare} fold={fold} t={t}
        lockedCard={<ProCard title={t("journal.page.oil.proTitle")} body={t("journal.page.oil.proBody")} t={t} />} />
      <BatchCompare batches={oilBatches} selectedId={b.id} locked={!canCompare} fold={fold} t={t}
        lockedCard={<ProCard title={t("journal.page.cmp.proTitle")} body={t("journal.page.cmp.proBody")} t={t} />} />
      <BatchRecord b={b} onChange={onChange} onDeleted={onDeleted} promised={promised} readyOn={dateAt(b, 90)} fold={fold} />
    </section>
  );
}

function NoteEditor({ b, m, day, note, onSaved, compact = false, t }) {
  const [text, setText] = useState(note?.note ?? "");
  const [rating, setRating] = useState(note?.rating ?? 0);
  const [tags, setTags] = useState(() => [...(note?.tags ?? [])]);
  const [status, setStatus] = useState(null); // null | saving | saved | error | empty
  const chip = (on) => ({ border: `1px solid ${on ? COLORS.ink : COLORS.line}`, background: on ? COLORS.ink : "transparent", color: on ? COLORS.paper : COLORS.inkSoft });

  async function save() {
    if (!text.trim() && !rating) { setStatus("empty"); return; }
    setStatus("saving");
    try {
      const { checkin, queued } = await saveNote({
        id: note?.id ?? crypto.randomUUID(), batch_id: b.id, day, scheduled_day: note ? note.scheduled_day ?? null : m.days,
        note: text.trim() || null, rating: rating || null, tags: TAGS.filter((x) => tags.includes(x)),
      });
      onSaved(checkin);
      setStatus(queued ? "queued" : "saved");
      play("note");
    } catch {
      setStatus("error");
      play("fail");
    }
  }

  const id = `journal-note-${m.k}`;
  return (
    <div className={`flex flex-col ${compact ? "mt-3 gap-2" : "mt-4 gap-4"}`}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-sm" style={{ color: COLORS.inkSoft }}>{t("journal.page.note")}</label>
        <textarea dir="auto" id={id} rows={compact ? 2 : 3} maxLength={280} value={text} onChange={(e) => { setText(e.target.value); setStatus(null); }}
          placeholder={t("journal.page.notePh")} className="px-3 py-2 rounded border text-base" style={{ borderColor: COLORS.field, background: COLORS.cardHi, color: COLORS.ink, resize: "vertical" }} />
      </div>
      <RatingRow value={rating} onChange={(n) => { setRating(n); setStatus(null); }} label={t("journal.page.rating")} itemLabel={(n) => t("journal.page.ratingN", { count: n })} size="sm" lead={t("journal.page.rating")} />
      <div role="group" aria-label={t("journal.page.tags")} className="flex flex-wrap gap-2">
        {TAGS.map((g) => {
          const on = tags.includes(g);
          return (
            <button key={g} type="button" aria-pressed={on} onClick={() => { setTags(on ? tags.filter((x) => x !== g) : [...tags, g]); setStatus(null); }}
              className="min-h-[36px] px-3 text-[13px] rounded" style={chip(on)}>{t(`journal.page.tag.${g}`)}</button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={status === "saving"}
          className="min-h-[48px] px-5 text-[15px] font-medium rounded disabled:opacity-60" style={{ background: COLORS.amber, color: COLORS.onAmber }}>
          {status === "saving" ? t("journal.page.saving") : t("journal.page.save")}
        </button>
        <SaveState state={SAVE_STATE[status]}>{SAVE_TEXT[status] && t(SAVE_TEXT[status])}</SaveState>
      </div>
    </div>
  );
}

function Compare({ notes, withNotes, b, dateAt, t }) {
  const [a, setA] = useState(withNotes[0]?.k ?? "");
  const [z, setZ] = useState(withNotes[withNotes.length - 1]?.k ?? "");
  if (withNotes.length < 2) return <p className="mt-4 text-sm" style={{ color: COLORS.inkSoft }}>{t("journal.page.compareNone")}</p>;
  const select = (id, label, value, set) => (
    <label htmlFor={id} className="flex flex-col gap-1 text-sm min-w-[140px]" style={{ color: COLORS.inkSoft }}>
      {label}
      <select id={id} value={value} onChange={(e) => set(e.target.value)} className="min-h-[44px] px-2 rounded border" style={{ borderColor: COLORS.field, background: COLORS.cardHi, color: COLORS.ink }}>
        {withNotes.map((x) => <option key={x.k} value={x.k}>{t(`journal.page.milestones.${x.k}`)}</option>)}
      </select>
    </label>
  );
  const card = (k) => {
    const n = notes[k];
    const m = MILESTONES.find((x) => x.k === k);
    if (!n || !m) return null;
    const r = n.rating || 0;
    return (
      <article key={k} data-compare={k} className="p-4 rounded flex flex-col gap-2" style={{ border: `1px solid ${COLORS.line}`, background: COLORS.paper }}>
        <p className="flex justify-between gap-2 text-sm font-medium"><span>{t(`journal.page.milestones.${k}`)}</span><span style={{ color: COLORS.dim }}>{dateAt(b, m.days)}</span></p>
        {n.note && <p dir="auto">{n.note}</p>}
        {r > 0 && <p dir="ltr" className="text-start" role="img" aria-label={t("journal.page.ratingN", { count: r })} style={{ color: COLORS.actionText }}><span aria-hidden="true">{"●".repeat(r) + "○".repeat(5 - r)}</span></p>}
        {n.tags?.length > 0 && <p className="text-sm" style={{ color: COLORS.inkSoft }}>{n.tags.map((g) => t(`journal.page.tag.${g}`)).join(" · ")}</p>}
      </article>
    );
  };
  return (
    <section aria-label={t("journal.page.compareTitle")} className="mt-5 flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        {select("journal-compare-a", t("journal.page.a"), a, setA)}
        {select("journal-compare-b", t("journal.page.b"), z, setZ)}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{card(a)}{card(z)}</div>
    </section>
  );
}
