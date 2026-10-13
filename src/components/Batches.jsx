import React, { useEffect, useRef, useState } from "react";
import { COLORS } from "../lib/theme";
import { TIERS } from "../lib/tiers";
import { listBatches, deleteBatch } from "../lib/fragranceApi";
import { downloadBatchCard } from "../lib/batchCard";
import { actualStrength, fmt2, shownTotal } from "../lib/calc";
import { batchInsights } from "../lib/aiApi";
import { batchStartedAt, batchReadyAt, formatDay, formatExact, readyCountdown } from "../lib/batchTiming";
import { useI18n } from "../i18n/I18nProvider";
import { errorText } from "../i18n/errorText";
import { useEntitlements } from "../lib/useEntitlements";
import EmptyState from "./EmptyState";
import { refusedBatches, dismissRefused } from "../lib/outbox";
import { useNavigate } from "react-router-dom";
import { can } from "../lib/entitlements";
import { dueNow, JOURNAL_CHANGED, restTimeline } from "../lib/journal";
import { IconHourglass, IconSeal, IconDrop, IconToday, IconPlus } from "./icons";
import JournalDue from "./journal/JournalDue";
import JournalPatterns from "./journal/JournalPatterns";
import BatchJournal from "./journal/BatchJournal";
import SharePanel from "./SharePanel";
import BatchEdit from "./BatchEdit";
import WaitlistButton from "./WaitlistButton";
import { makeAgainHref } from "../lib/oilHistory";

// The engine's rounding, so a stored batch reads as the calculator showed it.
function round2(n) {
  return Number.isFinite(n) ? fmt2(n) : "0.00";
}
const totalOf = (b) => fmt2(shownTotal(Number(b.oil_g), Number(b.ethanol_g)));

function BatchTiming({ batch }) {
  const { t, locale } = useI18n();
  const started = batchStartedAt(batch);
  const ready = batchReadyAt(batch);
  if (!started) return null;
  const isReady = ready && ready <= new Date();
  const countdown = readyCountdown(ready);
  return (
    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
      <div>
        <span style={{ color: COLORS.inkSoft }}>{t("batches.created")} </span>
        <span style={{ color: COLORS.ink }}>{formatExact(started, locale)}</span>
      </div>
      {ready && (
        <div>
          <span style={{ color: COLORS.inkSoft }}>{t("batches.bestFrom")} </span>
          <span style={{ color: COLORS.ink }}>{formatExact(ready, locale)}</span>
          {countdown && (
            <span className="ms-2" style={{ color: isReady ? COLORS.forest : COLORS.amberDeep }}>({t(`batches.countdown.${countdown.key}`, { count: countdown.count })})</span>
          )}
        </div>
      )}
    </div>
  );
}

// The journal's list: one row per batch, resting (hourglass) or ready
// (forest seal), today's rest day against the family's full rest.
function BatchList({ batches, selectedId, onSelect }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  return (
    <nav aria-label={t("journal.listTitle")} style={{ border: `1px solid ${COLORS.ink}`, background: COLORS.card }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${COLORS.ink}` }}>
        <span className="text-[11px] uppercase tracking-[0.15em] rtl:tracking-normal" style={{ color: COLORS.dim }}>{t("journal.listTitle")}</span>
        <span dir="ltr" className="font-mono text-xs" style={{ color: COLORS.dim }}>{batches.length}</span>
      </div>
      <ul>
        {batches.map((b) => {
          const tl = restTimeline(b);
          const on = b.id === selectedId;
          return (
            <li key={b.id} style={{ borderBottom: `1px solid ${COLORS.line}` }}>
              <button type="button" onClick={() => onSelect(b.id)} aria-current={on ? "true" : undefined}
                className="w-full grid grid-cols-[36px_minmax(0,1fr)_auto] gap-3 items-center px-4 py-3 text-start min-h-[60px]"
                style={{ background: on ? COLORS.sand : "transparent", borderInlineStart: `3px solid ${on ? COLORS.forest : "transparent"}` }}>
                <span className="inline-flex items-center justify-center w-9 h-9" style={{ border: `1px solid ${COLORS.ink}`, background: COLORS.card }}>
                  {tl?.ready ? <IconSeal size={22} accent={COLORS.forest} /> : <IconHourglass size={22} />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{b.fragrance_name}</span>
                  <span dir="ltr" className="block font-mono text-xs text-start rtl:text-end" style={{ color: COLORS.dim }}>
                    {Number(b.concentration_pct)}% · {totalOf(b)} g
                  </span>
                </span>
                <span className="text-end">
                  {tl && <span dir="ltr" className="block font-mono text-xs">{tl.target ? t("journal.dayOf", { day: tl.day, target: tl.target }) : t("journal.dayOnly", { day: tl.day })}</span>}
                  <span className="block text-[11px] uppercase tracking-[0.15em] rtl:tracking-normal" style={{ color: tl?.ready ? COLORS.forest : COLORS.dim }}>
                    {t(tl?.ready ? "journal.ready" : "journal.resting")}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <button type="button" onClick={() => navigate("/app/calculator")} className="w-full inline-flex items-center gap-2 px-4 min-h-[52px] text-sm font-medium" style={{ color: COLORS.forest }}>
        <IconPlus size={18} /> {t("journal.newBatch")}
      </button>
    </nav>
  );
}

// The selected batch's rest: day against target, and a bar per day —
// oil for days rested, forest for today, a rule for days to come — with a
// drop over each check-in.
function RestPanel({ batch }) {
  const { t } = useI18n();
  const tl = restTimeline(batch);
  return (
    <div className="p-5 sm:p-6" style={{ border: `1px solid ${COLORS.ink}`, background: COLORS.card }}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-2xl font-medium tracking-[-0.03em] rtl:tracking-normal">{batch.fragrance_name}</h3>
          <p dir="ltr" className="mt-1 font-mono text-sm text-start rtl:text-end" style={{ color: COLORS.inkSoft }}>
            {Number(batch.concentration_pct)}% · {round2(batch.oil_g)} g + {round2(batch.ethanol_g)} g
          </p>
        </div>
        {tl && (
          <p dir="ltr" className="font-mono leading-none tracking-[-0.03em] text-5xl">
            {tl.day}<span className="text-2xl" style={{ color: COLORS.dim }}>{tl.target ? ` / ${tl.target} d` : " d"}</span>
          </p>
        )}
      </div>
      {tl && (
        <figure className="mt-6">
          <figcaption className="sr-only">{t("journal.timeline")}</figcaption>
          <div dir="ltr" className="flex items-end gap-[2px] h-28" aria-hidden="true">
            {tl.bars.map((bar) => (
              <div key={bar.day} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                {bar.state === "today" ? <IconToday size={14} /> : bar.checkIn ? <IconDrop size={14} /> : null}
                <span className="fill-anim block w-full" style={{
                  height: `${Math.max(6, bar.height * 80)}%`,
                  background: bar.state === "past" ? COLORS.oil : bar.state === "today" ? COLORS.forest : COLORS.line,
                }} />
              </div>
            ))}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs" style={{ color: COLORS.dim }}>
            {[["oil", "legendPast"], ["forest", "legendToday"], ["line", "legendFuture"]].map(([c, k]) => (
              <li key={k} className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5" style={{ background: COLORS[c] }} />{t(`journal.${k}`)}</li>
            ))}
            <li className="inline-flex items-center gap-1.5"><IconDrop size={14} />{t("journal.legendCheckIn")}</li>
          </ul>
        </figure>
      )}
    </div>
  );
}

export default function Batches() {
  const { t, locale } = useI18n();
  const entitlements = useEntitlements();
  const capped = entitlements.loaded && !entitlements.features?.includes("batches.unlimited") && entitlements.batchCap != null;
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [insights, setInsights] = useState("");
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState("");
  const [confirming, setConfirming] = useState(null); // id awaiting "Delete for good?"
  const [status, setStatus] = useState("");
  const [refused, setRefused] = useState(() => refusedBatches());
  const [patternsVersion, setPatternsVersion] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const headingRef = useRef(null);
  const navigate = useNavigate();
  const due = loading || error ? [] : dueNow(batches);

  // The app header shows how many check-ins are due; keep it in step.
  useEffect(() => {
    if (!loading && !error) window.dispatchEvent(new CustomEvent(JOURNAL_CHANGED, { detail: { due: due.length } }));
  }, [due.length, loading, error]);

  // A check-in saved (or queued offline) on one batch: show it straight
  // away, replacing an earlier answer to the same point.
  function handleCheckIn(batchId, checkin, { queued }) {
    setBatches((prev) => prev.map((b) => {
      if (b.id !== batchId) return b;
      const rest = (b.batch_checkins || []).filter((c) => c.id !== checkin.id &&
        !(checkin.scheduled_day != null && c.scheduled_day === checkin.scheduled_day));
      return { ...b, batch_checkins: [...rest, checkin] };
    }));
    setStatus(queued ? t("journal.queued") : checkin.skipped ? t("journal.skipped") : t("journal.saved"));
    if (checkin.rating && !queued) setPatternsVersion((v) => v + 1);
  }

  // An edit answers with the batch row alone: keep its journal and share.
  function handleEdited(batchId, row) {
    setBatches((prev) => prev.map((b) => b.id === batchId ? { ...b, ...row, batch_checkins: b.batch_checkins, shared_recipes: b.shared_recipes } : b));
  }

  function handleShared(batchId, share) {
    setBatches((prev) => prev.map((b) => b.id === batchId ? { ...b, shared_recipes: share } : b));
  }

  function handleCheckInRemoved(batchId, id) {
    setBatches((prev) => prev.map((b) => b.id === batchId ? { ...b, batch_checkins: (b.batch_checkins || []).filter((c) => c.id !== id) } : b));
    setStatus(t("journal.removed"));
    setPatternsVersion((v) => v + 1);
  }

  async function handleInsights() {
    setInsightsLoading(true); setInsightsError("");
    try {
      setInsights(await batchInsights());
    } catch (e) {
      setInsightsError(errorText(t, e, "chat.unreachable"));
    } finally {
      setInsightsLoading(false);
    }
  }

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await listBatches(100);
      setBatches(data);
    } catch (e) {
      setError(errorText(t, e, "batches.loadFailed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    const update = () => setRefused(refusedBatches());
    window.addEventListener("sh-outbox-refused", update);
    return () => window.removeEventListener("sh-outbox-refused", update);
  }, []);

  // Deleting is permanent (the batch is the record of what was poured), so
  // it takes a second tap. Focus then goes to the list heading, not <body>.
  async function handleDelete(id) {
    setConfirming(null);
    try {
      await deleteBatch(id);
      setBatches((prev) => prev.filter((b) => b.id !== id));
      setStatus(t("batches.deleted"));
      headingRef.current?.focus();
    } catch (e) {
      setError(errorText(t, e, "batches.deleteFailed"));
    }
  }

  const totalOilCost = batches.reduce((sum, b) => sum + (b.oil_cost || 0), 0);

  const selected = batches.find((b) => b.id === selectedId) ?? batches[0];
  const card = (b) => (
          <div key={b.id} className="p-4 border" style={{ borderColor: COLORS.line, backgroundColor: COLORS.card }}>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div>
                <div className="text-sm font-serif font-semibold" style={{ color: COLORS.forestDeep }}>{b.fragrance_name}</div>
                <div className="text-xs mt-0.5" style={{ color: COLORS.inkSoft }}>
                  {t("batches.meta", { family: TIERS[b.tier] ? t(`families.${b.tier}.label`) : b.tier, pct: b.concentration_pct, date: formatDay(b.blend_date, locale) })}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 shrink-0 sm:ms-3">
                <BatchEdit batch={b} onSaved={handleEdited} onStatus={setStatus} />
                <button type="button" onClick={() => navigate(makeAgainHref(b))}
                  className="text-xs font-mono underline min-h-[24px]" style={{ color: COLORS.forest }}>
                  {t("batches.again")}
                </button>
                <button
                  type="button"
                  onClick={() => downloadBatchCard(b, { t, locale }).catch((e) => setError(t("batchCard.failed", { error: errorText(t, e) })))}
                  className="text-xs font-mono underline"
                  style={{ color: COLORS.forest }}
                >
                  {t("batches.exportCard")}
                </button>
                {can(entitlements, "export.labels") && (
                  <button type="button" onClick={() => navigate(`/app/labels?batch=${b.id}`, { state: { batch: b } })}
                    className="text-xs font-mono underline min-h-[24px]" style={{ color: COLORS.forest }}>
                    {t("labels.open")}
                  </button>
                )}
                {confirming === b.id ? (
                  <span className="flex items-center gap-2 text-xs font-mono">
                    <span style={{ color: COLORS.ink }}>{t("batches.confirmDelete")}</span>
                    <button type="button" autoFocus onClick={() => handleDelete(b.id)} className="underline min-h-[24px]" style={{ color: COLORS.danger }}>
                      {t("batches.delete")}
                    </button>
                    <button type="button" onClick={() => setConfirming(null)} className="underline min-h-[24px]" style={{ color: COLORS.inkSoft }}>
                      {t("batches.keep")}
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirming(b.id)}
                    className="text-xs font-mono underline min-h-[24px]"
                    style={{ color: COLORS.inkSoft }}
                  >
                    {t("batches.delete")}
                  </button>
                )}
              </div>
            </div>
            {/* The weights are the record: a labelled grid, numbers in mono. */}
            <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
              {[
                [t("batches.oil"), `${round2(b.oil_g)} g`, `${round2(b.oil_ml)} mL`],
                [t("batches.ethanol"), `${round2(b.ethanol_g)} g`, `${round2(b.ethanol_ml)} mL`],
                [t("batches.total"), `${totalOf(b)} g`, null],
                b.oil_cost ? [t("batches.cost"), round2(b.oil_cost), b.price_per_gram ? `${round2(Number(b.price_per_gram))}${t("batches.perGram")}` : null] : null,
              ].filter(Boolean).map(([label, value, sub]) => (
                <div key={label}>
                  <dt className="text-xs" style={{ color: COLORS.inkSoft }}>{label}</dt>
                  <dd dir="ltr" className="font-mono text-sm text-start rtl:text-end" style={{ color: COLORS.ink }}>
                    {value}{sub && <span className="ms-1.5 text-xs" style={{ color: COLORS.inkSoft }}>{sub}</span>}
                  </dd>
                </div>
              ))}
            </dl>
            {actualStrength(b) !== null && (
              <div className="text-xs font-mono mt-1" style={{ color: COLORS.ink }}>
                {t(`batches.actualPour.${actualStrength(b).basisKnown ? actualStrength(b).basis : "assumed"}`, { oil: round2(Number(b.actual_oil_g)), ethanol: round2(Number(b.actual_ethanol_g)), pct: round2(actualStrength(b).pct), target: b.concentration_pct })}
              </div>
            )}
            <BatchTiming batch={b} />
            {(b.oil_type || b.blended_by || b.lot) && (
              <div className="text-xs font-mono mt-1" style={{ color: COLORS.inkSoft }}>
                {b.lot && <span className="me-4">{t("batches.lot", { lot: b.lot })}</span>}
                {b.oil_type && <span className="me-4">{b.oil_type}</span>}
                {b.blended_by && <span>{t("batches.by", { name: b.blended_by })}</span>}
              </div>
            )}
            {b.notes && (
              <div className="text-sm italic mt-2" style={{ color: COLORS.inkSoft }}>{b.notes}</div>
            )}
            <BatchJournal batch={b} canAdd={can(entitlements, "journal.checkins")} onDone={handleCheckIn} onRemoved={handleCheckInRemoved} />
            <div className="mt-2">
              <SharePanel batch={b} onShared={handleShared} onStatus={setStatus} />
            </div>
          </div>
  );

  return (
    <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-8 lg:px-14 py-8" style={{ backgroundColor: COLORS.paper, color: COLORS.ink }}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 mb-6">
        <h2 ref={headingRef} tabIndex={-1} className="font-serif italic text-3xl" style={{ color: COLORS.forestDeep }}>{t("batches.title")}</h2>
        {batches.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: COLORS.inkSoft }}>
              {t("batches.summary", { count: batches.length, cost: round2(totalOilCost) })}
            </span>
            {entitlements.features?.includes("ai.ask") && <button
              type="button"
              onClick={handleInsights}
              disabled={insightsLoading}
              className="px-3 py-1.5 text-sm border rounded-none disabled:opacity-50"
              style={{ borderColor: COLORS.amberDeep, color: COLORS.amber }}
            >
              {insightsLoading ? t("batches.thinking") : t("batches.insights")}
            </button>}
          </div>
        )}
      </div>

      {capped && (
        <p className="text-xs font-mono mb-4" style={{ color: batches.length >= entitlements.batchCap ? COLORS.danger : COLORS.inkSoft }}>
          {t("plan.usage", { used: batches.length, cap: entitlements.batchCap })}
          {batches.length >= entitlements.batchCap ? ` ${t("plan.batchCap", { plan: t(`plan.names.${entitlements.plan}`), cap: entitlements.batchCap })}` : ""}
        </p>
      )}
      {capped && batches.length >= entitlements.batchCap && <WaitlistButton source="batch_cap" />}

      {insightsError && <p className="text-sm font-mono mb-4" style={{ color: COLORS.danger }}>{insightsError}</p>}
      {insights && (
        <div className="mb-6 p-4 border rounded-none whitespace-pre-wrap text-sm" style={{ borderColor: COLORS.amberDeep, backgroundColor: COLORS.card, color: COLORS.ink }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold" style={{ color: COLORS.amberDeep }}>{t("batches.insightsLabel")}</span>
            <button type="button" onClick={() => setInsights("")} className="text-xs font-mono underline" style={{ color: COLORS.inkSoft }}>
              {t("batches.hide")}
            </button>
          </div>
          {insights}
        </div>
      )}

      <p role="status" className="sr-only">{status}</p>

      {refused.length > 0 && (
        <div role="alert" className="mb-6 p-4 border rounded-none text-sm" style={{ borderColor: COLORS.danger, backgroundColor: COLORS.dangerBg, color: COLORS.ink }}>
          <p className="font-semibold mb-2">{t("batches.refused.title", { count: refused.length })}</p>
          <ul className="space-y-2">
            {refused.map((item) => (
              <li key={item.batch?.id} className="flex items-start justify-between gap-3 font-mono text-xs">
                <span>{t("batches.refused.item", {
                  name: item.batch?.fragrance_name || t("bench.untitled"),
                  oil: round2(Number(item.batch?.actual_oil_g ?? item.batch?.oil_g)),
                  ethanol: round2(Number(item.batch?.actual_ethanol_g ?? item.batch?.ethanol_g)),
                  error: errorText(t, { code: item.code, message: item.error }),
                })}</span>
                <button type="button" onClick={() => setRefused(dismissRefused(item.batch?.id))} className="underline shrink-0 min-h-[24px]" style={{ color: COLORS.inkSoft }}>
                  {t("batches.refused.dismiss")}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {can(entitlements, "journal.checkins") && <JournalDue due={due} onDone={handleCheckIn} />}
      {!loading && batches.length > 0 && <JournalPatterns version={patternsVersion} />}

      {loading && <p className="text-sm font-mono" style={{ color: COLORS.inkSoft }}>{t("app.loading")}</p>}
      {error && <p className="text-sm font-mono" style={{ color: COLORS.danger }}>{error}</p>}
      {!loading && !error && batches.length === 0 && (
        <EmptyState text={t("batches.empty")} action={t("batches.emptyAction")} to="/app/calculator" />
      )}

      {batches.length > 0 && selected && (
        <div className="grid grid-cols-1 lg:grid-cols-[22rem_minmax(0,1fr)] gap-8 items-start">
          <BatchList batches={batches} selectedId={selected.id} onSelect={setSelectedId} />
          <section aria-label={selected.fragrance_name} className="grid gap-4">
            <RestPanel batch={selected} />
            {card(selected)}
          </section>
        </div>
      )}
    </div>
  );
}
