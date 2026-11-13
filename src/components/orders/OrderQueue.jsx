import React, { useCallback, useEffect, useMemo, useState } from "react";
import { COLORS, SHAPE } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { errorText } from "../../i18n/errorText";
import { useProfile } from "../../lib/useProfile";
import RoomHeader from "../kx/RoomHeader";
import Card from "../kx/Card";
import Sheet from "../kx/Sheet";
import Chip from "../kx/Chip";
import Button from "../kx/Button";
import { fmt2, planMixes, restWindow, bottlingGroups, orderCost, shortMix, profitTotals, MIX_ALLOWANCE_PCT, STRENGTH_TIERS } from "../../lib/calc";
import { Link } from "../../motion";
import { listRecipes, listInventory } from "../../lib/fragranceApi";
import { listOrders, addOrder, editOrder, setOrderStatus, setGroupMode } from "../../lib/ordersApi";
import { scentOptions, toPlanOrder, stockMap, weighLink, toBottlingOrder } from "../../lib/orders";
import { CURRENCIES } from "../../lib/currencies";

// The order queue (Phases A and B, docs/order-queue/Kyphira-Order-Queue_Brief_v2.md):
// buyers' orders, grouped into mixes by scent and strength, with the grams
// to weigh and the oil each scent needs against stock; then each weighed
// batch rests, is bottled and handed over. Pro (the App's Gate).
// All arithmetic is planMixes()/restWindow()/bottlingGroups(); this file only lays it out.

const SIZES = [10, 30, 50, 100];
const inputStyle = { background: COLORS.cardHi, color: COLORS.ink, border: `1px solid ${COLORS.field}` };
const inputClass = `w-full px-3 py-2 min-h-[48px] ${SHAPE.control}`;

/** Today as YYYY-MM-DD in the seller's own time zone. */
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function useDate(locale) {
  return useCallback((iso) => (iso ? new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${iso.slice(0, 10)}T00:00:00Z`)) : ""), [locale]);
}

const newId = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : undefined);

export default function OrderQueue() {
  const { t, locale } = useI18n();
  const date = useDate(locale);
  const { profile } = useProfile();
  const [rows, setRows] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // null = closed, {} = new, row = edit
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listOrders().then(setRows).catch((e) => { setRows([]); setError(errorText(t, e)); });
    listRecipes().then(setRecipes).catch(() => {});
    listInventory().then(setInventory).catch(() => {});
  }, [t]);

  const options = useMemo(() => scentOptions(recipes, inventory), [recipes, inventory]);
  const plan = useMemo(() => planMixes((rows || []).map((r) => toPlanOrder(r, { recipes })), stockMap(inventory)), [rows, recipes, inventory]);
  const byId = useMemo(() => new Map((rows || []).map((r) => [r.id, r])), [rows]);
  const cancelled = (rows || []).filter((r) => r.status === "cancelled");
  const handed = (rows || []).filter((r) => r.status === "handed_over");
  const bottling = useMemo(() => bottlingGroups((rows || []).map(toBottlingOrder), today()), [rows]);
  const [early, setEarly] = useState(null); // an order asked to bottle before its ready-from date
  const costOf = (r) => orderCost(r?.batches, Number(r?.size_ml), r?.price == null ? null : Number(r.price));
  const profit = useMemo(() => profitTotals(handed.map(costOf)), [handed]); // eslint-disable-line react-hooks/exhaustive-deps
  // An order copied into a new one ("Order again"): same buyer, scent, size, strength and price.
  const again = (r) => setEditing({
    buyer_name: r.buyer_name, buyer_contact: r.buyer_contact, scent_text: r.scent_text, family: r.family,
    size_ml: r.size_ml, strength_pct: r.strength_pct, price: r.price, note: r.note,
  });
  const open = plan.groups.reduce((n, g) => n + g.orders.length, 0) + plan.unplanned.length;

  const merge = (changed) => setRows((prev) => {
    const list = [...(prev || [])];
    for (const c of [].concat(changed)) {
      const i = list.findIndex((r) => r.id === c.id);
      // A write answers without the batch join: keep the one we had while the batch is the same.
      if (i >= 0) list[i] = { ...c, batches: c.batches ?? (c.batch_id && c.batch_id === list[i].batch_id ? list[i].batches : null) };
      else list.unshift(c);
    }
    return list;
  });

  async function run(fn) {
    setBusy(true);
    setError(null);
    try { merge(await fn()); return true; } catch (e) { setError(errorText(t, e)); return false; } finally { setBusy(false); }
  }

  async function save(form) {
    const ok = await run(() => (form.id && byId.has(form.id) ? editOrder(form.id, form.edit) : addOrder({ ...form.edit, id: form.id })));
    if (ok) setEditing(null);
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-8 py-6">
      <RoomHeader numeral="VII" name={t("orders.title")} headline={rows === null ? t("orders.loading") : t("orders.headline", { count: open })}>
        <p className="max-w-[60ch] mt-2" style={{ color: COLORS.inkSoft }}>{t("orders.lead")}</p>
      </RoomHeader>

      <div className="flex flex-wrap gap-3 mb-6">
        <Button onClick={() => setEditing({})} disabled={rows === null}>{t("orders.add")}</Button>
      </div>
      {error && <p role="alert" className="mb-4 text-sm" style={{ color: COLORS.danger }}>{error}</p>}

      {(bottling.groups.length > 0 || bottling.orphaned.length > 0) && (
        <section aria-labelledby="orders-bottle" className="mb-8">
          <h2 id="orders-bottle" className="font-serif italic text-2xl mb-3" style={{ color: COLORS.ink }}>{t("orders.bottle.title")}</h2>
          <div className="grid gap-4">
            {bottling.groups.map((g) => (
              <Card key={g.batchId} as="article" title={g.batchNo
                ? t("orders.bottle.batchNo", { no: String(g.batchNo).padStart(3, "0"), scent: g.scentName, pct: g.strengthPct })
                : t("orders.mix.group", { scent: g.scentName, pct: g.strengthPct })}>
                <p className="text-sm mb-3" style={{ color: g.ready ? COLORS.verdigrisText : COLORS.inkSoft }}>
                  {g.ready
                    ? (today() < g.rest.fullyRested ? t("orders.bottle.readyUntil", { rested: date(g.rest.fullyRested) }) : t("orders.bottle.ready"))
                    : t("orders.bottle.resting", { ready: date(g.rest.readyFrom), rested: date(g.rest.fullyRested) })}
                </p>
                {(() => {
                  const mine = (rows || []).filter((r) => r.batch_id === g.batchId && r.status !== "cancelled");
                  const batch = mine.find((r) => r.batches)?.batches;
                  const s = batch ? shortMix(batch, mine.map((r) => Number(r.size_ml))) : null;
                  return s && s.shortMl > 0 ? (
                    <p role="note" className="text-sm mb-3" style={{ color: COLORS.danger }}>
                      {t("orders.bottle.short", { short: fmt2(s.shortMl), needed: fmt2(s.neededMl), made: fmt2(s.madeMl) })}
                    </p>
                  ) : null;
                })()}
                <ul>
                  {g.orders.map((o) => {
                    const row = byId.get(o.id);
                    if (!row) return null;
                    const name = row.buyer_name;
                    return (
                      <li key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2 border-t" style={{ borderColor: COLORS.line }}>
                        <span className="me-auto">
                          <span className="block" style={{ color: COLORS.ink }}>{t("orders.bottle.fill", { ml: Number(row.size_ml), name })}</span>
                          <span className="block text-sm" style={{ color: COLORS.inkSoft }}>{o.status === "bottled" ? t("orders.bottle.bottled") : t("orders.bottle.notYet")}</span>
                          <CostLine c={costOf(row)} t={t} />
                        </span>
                        <Link to={`/app/labels?${new URLSearchParams({ batch: g.batchId, ml: String(Number(row.size_ml)), for: name })}`}
                          className="min-h-[44px] px-2 text-sm underline underline-offset-4 inline-flex items-center" style={{ color: COLORS.ink }}
                          aria-label={t("orders.bottle.labelFor", { name })}>{t("orders.bottle.label")}</Link>
                        {o.status === "resting" && early !== o.id && (
                          <Button variant="secondary" disabled={busy} aria-label={t("orders.bottle.markFor", { name })}
                            onClick={() => (g.ready ? run(() => setOrderStatus(o.id, "bottled")) : setEarly(o.id))}>{t("orders.bottle.mark")}</Button>
                        )}
                        {o.status === "resting" && early === o.id && (
                          <span className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                            <span role="alert" className="text-sm" style={{ color: COLORS.ink }}>{t("orders.bottle.early", { ready: date(g.rest.readyFrom) })}</span>
                            <Button variant="secondary" disabled={busy} onClick={() => { setEarly(null); run(() => setOrderStatus(o.id, "bottled")); }}>{t("orders.bottle.anyway")}</Button>
                            <Button variant="ghost" onClick={() => setEarly(null)}>{t("orders.bottle.wait")}</Button>
                          </span>
                        )}
                        {o.status === "bottled" && (
                          <>
                            <Button disabled={busy} aria-label={t("orders.bottle.handFor", { name })} onClick={() => run(() => setOrderStatus(o.id, "handed_over"))}>{t("orders.bottle.hand")}</Button>
                            <button type="button" disabled={busy} onClick={() => run(() => setOrderStatus(o.id, "resting"))} className="min-h-[44px] px-2 text-sm underline underline-offset-4"
                              style={{ color: COLORS.ink }} aria-label={t("orders.bottle.undoFor", { name })}>{t("orders.bottle.undo")}</button>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Card>
            ))}
            {bottling.orphaned.map((o) => {
              const row = byId.get(o.id);
              return row && (
                <Card key={o.id} as="article" tone="inset">
                  <p style={{ color: COLORS.ink }}>{t("orders.bottle.lost", { name: row.buyer_name, scent: row.scent_text })}</p>
                  <button type="button" disabled={busy} onClick={() => run(() => setOrderStatus(o.id, "queued"))} className="mt-2 min-h-[44px] text-sm underline underline-offset-4" style={{ color: COLORS.ink }}>
                    {t("orders.bottle.requeue")}
                  </button>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {rows !== null && open === 0 && bottling.groups.length === 0 && bottling.orphaned.length === 0 && (
        <Card className="mb-6"><p style={{ color: COLORS.inkSoft }}>{t("orders.empty")}</p></Card>
      )}

      {plan.oil.length > 0 && (
        <section aria-labelledby="orders-oil" className="mb-8">
          <h2 id="orders-oil" className="font-serif italic text-2xl mb-3" style={{ color: COLORS.ink }}>{t("orders.oil.title")}</h2>
          <ul className="border-t" style={{ borderColor: COLORS.line }}>
            {plan.oil.map((n) => (
              <li key={n.key} className="flex flex-wrap items-baseline justify-between gap-2 py-3 border-b" style={{ borderColor: COLORS.line }}>
                <span style={{ color: COLORS.ink }}>{n.scentName}</span>
                <span className="text-sm tabular-nums" style={{ color: n.shortG > 0 ? COLORS.danger : COLORS.inkSoft }}>
                  {n.haveG === null ? t("orders.oil.unknown", { need: fmt2(n.needG) })
                    : n.shortG > 0 ? t("orders.oil.short", { need: fmt2(n.needG), have: fmt2(n.haveG), short: fmt2(n.shortG) })
                      : t("orders.oil.enough", { need: fmt2(n.needG), have: fmt2(n.haveG) })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {plan.groups.length > 0 && (
        <section aria-labelledby="orders-mix" className="mb-8">
          <h2 id="orders-mix" className="font-serif italic text-2xl mb-3" style={{ color: COLORS.ink }}>{t("orders.mix.title")}</h2>
          <div className="grid gap-4">
            {plan.groups.map((g) => {
              const rest = restWindow(g.family, today());
              return (
                <Card key={g.key} as="article" title={t("orders.mix.group", { scent: g.scentName, pct: g.strengthPct })}>
                  {g.orders.length > 1 && (
                    <div role="group" aria-label={t("orders.mix.modeLabel")} className="flex flex-wrap gap-2 mb-4">
                      {["mix", "separate"].map((m) => (
                        <Chip key={m} pressed={g.mode === m} onToggle={() => g.mode !== m && !busy && run(() => setGroupMode(g.orders.map((o) => o.id), m))}>
                          {t(`orders.mix.mode.${m}`)}
                        </Chip>
                      ))}
                    </div>
                  )}
                  {g.mixes.map((m, i) => (
                    <div key={i} className="mb-4 last:mb-0">
                      <p className="text-sm mb-2" style={{ color: COLORS.inkSoft }}>
                        {m.allowancePct > 0
                          ? t("orders.mix.volumeExtra", { mix: fmt2(m.mixMl), ordered: fmt2(m.orderedMl), pct: m.allowancePct })
                          : t("orders.mix.volume", { mix: fmt2(m.mixMl) })}
                      </p>
                      <dl className="grid grid-cols-3 gap-2 text-center">
                        {[["oil", m.oilG], ["alcohol", m.ethanolG], ["total", m.totalG]].map(([k, v]) => (
                          <div key={k} className="p-2" style={{ background: COLORS.sand }}>
                            <dt className="text-xs" style={{ color: COLORS.inkSoft }}>{t(`orders.mix.${k}`)}</dt>
                            <dd className="text-xl tabular-nums" style={{ color: COLORS.ink }}>{t("orders.grams", { g: fmt2(v) })}</dd>
                          </div>
                        ))}
                      </dl>
                      <Button as={Link} to={weighLink(g, m)} variant="secondary" className="mt-3 w-full sm:w-auto"
                        aria-label={t("orders.weigh.labelFor", { mix: fmt2(m.mixMl), scent: g.scentName })}>
                        {g.mode === "mix" ? t("orders.weigh.mix") : t("orders.weigh.bottle")}
                      </Button>
                      <ul className="mt-3">
                        {m.orderIds.map((id) => <OrderRow key={id} row={byId.get(id)} date={date} t={t} busy={busy}
                          onEdit={() => setEditing(byId.get(id))} onCancel={() => run(() => setOrderStatus(id, "cancelled"))} />)}
                      </ul>
                    </div>
                  ))}
                  <p className="text-sm mt-3" style={{ color: COLORS.inkSoft }}>
                    {rest.minDays === rest.maxDays
                      ? t("orders.mix.restOne", { ready: date(rest.readyFrom) })
                      : t("orders.mix.rest", { ready: date(rest.readyFrom), rested: date(rest.fullyRested) })}
                  </p>
                </Card>
              );
            })}
          </div>
          <p className="text-xs mt-3" style={{ color: COLORS.dim }}>{t("orders.mix.note", { pct: MIX_ALLOWANCE_PCT })}</p>
        </section>
      )}

      {plan.unplanned.length > 0 && (
        <section aria-labelledby="orders-waiting" className="mb-8">
          <h2 id="orders-waiting" className="font-serif italic text-2xl mb-3" style={{ color: COLORS.ink }}>{t("orders.unplanned")}</h2>
          <ul>{plan.unplanned.map((o) => <OrderRow key={o.id} row={byId.get(o.id)} date={date} t={t} busy={busy}
            onEdit={() => setEditing(byId.get(o.id))} onCancel={() => run(() => setOrderStatus(o.id, "cancelled"))} />)}</ul>
        </section>
      )}

      {cancelled.length > 0 && (
        <details className="mb-8">
          <summary className="cursor-pointer min-h-[44px] flex items-center" style={{ color: COLORS.inkSoft }}>{t("orders.cancelled", { count: cancelled.length })}</summary>
          <ul>{cancelled.map((r) => <OrderRow key={r.id} row={r} date={date} t={t} busy={busy} onRestore={() => run(() => setOrderStatus(r.id, "queued"))} />)}</ul>
        </details>
      )}

      {handed.length > 0 && (
        <details className="mb-8">
          <summary className="cursor-pointer min-h-[44px] flex items-center" style={{ color: COLORS.inkSoft }}>{t("orders.history", { count: handed.length })}</summary>
          {profit.totals.length > 0 && (
            <p className="text-sm py-2" style={{ color: COLORS.ink }}>
              {profit.totals.map((x) => t("orders.cost.total", { count: x.count, profit: fmt2(x.profit), currency: x.currency })).join(" ")}
              {profit.missing > 0 && ` ${t("orders.cost.missing", { count: profit.missing })}`}
            </p>
          )}
          <ul>{handed.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 border-t" style={{ borderColor: COLORS.line }}>
              <span className="me-auto">
                <span className="block" style={{ color: COLORS.ink }}>{t("orders.row.who", { name: r.buyer_name, scent: r.scent_text })}</span>
                <CostLine c={costOf(r)} t={t} />
              </span>
              <button type="button" disabled={busy} onClick={() => again(r)} className="min-h-[44px] px-2 text-sm underline underline-offset-4"
                style={{ color: COLORS.ink }} aria-label={t("orders.row.againFor", { name: r.buyer_name })}>{t("orders.row.again")}</button>
              <button type="button" disabled={busy} onClick={() => run(() => setOrderStatus(r.id, "bottled"))} className="min-h-[44px] px-2 text-sm underline underline-offset-4"
                style={{ color: COLORS.ink }} aria-label={t("orders.bottle.undoHandFor", { name: r.buyer_name })}>{t("orders.bottle.undo")}</button>
            </li>
          ))}</ul>
        </details>
      )}

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing?.id ? t("orders.form.editTitle") : t("orders.form.title")} closeLabel={t("orders.form.close")}>
        {editing !== null && <OrderForm row={editing} options={options} currency={profile?.currency} busy={busy} error={error} onSave={save} t={t} />}
      </Sheet>
    </div>
  );
}

/** One order's cost and profit from its batch (P1a); says so when the batch has no prices. */
function CostLine({ c, t }) {
  return (
    <span className="block text-sm" style={{ color: COLORS.inkSoft }}>
      {!c ? t("orders.cost.none")
        : c.profit === null ? t("orders.cost.only", { cost: fmt2(c.cost), currency: c.currency })
          : t("orders.cost.line", { cost: fmt2(c.cost), profit: fmt2(c.profit), margin: fmt2(c.marginPct), currency: c.currency })}
    </span>
  );
}

function OrderRow({ row, date, t, busy, onEdit, onCancel, onRestore }) {
  if (!row) return null;
  const details = [
    t("orders.row.size", { ml: Number(row.size_ml), pct: Number(row.strength_pct) }),
    row.wanted_by && t("orders.row.wanted", { date: date(row.wanted_by) }),
    row.price != null && t("orders.row.price", { price: fmt2(Number(row.price)), currency: row.currency ?? "" }),
  ].filter(Boolean);
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 border-t" style={{ borderColor: COLORS.line }}>
      <span className="me-auto">
        <span className="block" style={{ color: COLORS.ink }}>{onRestore ? t("orders.row.who", { name: row.buyer_name, scent: row.scent_text }) : row.buyer_name}</span>
        <span className="block text-sm" style={{ color: COLORS.inkSoft }}>{details.join(", ")}</span>
      </span>
      {onEdit && <button type="button" disabled={busy} onClick={onEdit} className="min-h-[44px] px-2 text-sm underline underline-offset-4" style={{ color: COLORS.ink }}
        aria-label={t("orders.row.editFor", { name: row.buyer_name })}>{t("orders.row.edit")}</button>}
      {onCancel && <button type="button" disabled={busy} onClick={onCancel} className="min-h-[44px] px-2 text-sm underline underline-offset-4" style={{ color: COLORS.danger }}
        aria-label={t("orders.row.cancelFor", { name: row.buyer_name })}>{t("orders.row.cancel")}</button>}
      {onRestore && <button type="button" disabled={busy} onClick={onRestore} className="min-h-[44px] px-2 text-sm underline underline-offset-4" style={{ color: COLORS.ink }}
        aria-label={t("orders.row.restoreFor", { name: row.buyer_name })}>{t("orders.row.restore")}</button>}
    </li>
  );
}

function OrderForm({ row, options, currency, busy, error, onSave, t }) {
  const [f, setF] = useState(() => ({
    buyer_name: row.buyer_name ?? "", buyer_contact: row.buyer_contact ?? "", scent_text: row.scent_text ?? "",
    size_ml: row.size_ml != null ? String(Number(row.size_ml)) : "50", strength_pct: row.strength_pct != null ? String(Number(row.strength_pct)) : "25",
    price: row.price != null ? String(Number(row.price)) : "", wanted_by: row.wanted_by ?? "", note: row.note ?? "",
  }));
  const [id] = useState(() => row.id ?? newId());
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const match = options.find((o) => o.label.trim().toLowerCase() === f.scent_text.trim().toLowerCase());

  function submit(e) {
    e.preventDefault();
    const edit = {
      buyer_name: f.buyer_name, buyer_contact: f.buyer_contact, scent_text: f.scent_text,
      recipe_version_id: match?.recipe_version_id ?? null, fragrance_id: match?.fragrance_id ?? null, family: match?.family ?? row.family ?? null,
      size_ml: Number(f.size_ml), strength_pct: Number(f.strength_pct),
      price: f.price === "" ? null : Number(f.price), currency: f.price === "" ? null : (CURRENCIES.includes(currency) ? currency : row.currency ?? null),
      wanted_by: f.wanted_by || null, note: f.note,
    };
    onSave({ id, edit });
  }

  const label = "block text-sm mb-1";
  return (
    <form onSubmit={submit} className="grid gap-4">
      <label><span className={label} style={{ color: COLORS.inkSoft }}>{t("orders.form.buyer")}</span>
        <input required maxLength={120} value={f.buyer_name} onChange={set("buyer_name")} className={inputClass} style={inputStyle} autoComplete="off" /></label>
      <label><span className={label} style={{ color: COLORS.inkSoft }}>{t("orders.form.scent")}</span>
        <input required maxLength={120} value={f.scent_text} onChange={set("scent_text")} list="order-scents" className={inputClass} style={inputStyle} autoComplete="off" />
        <datalist id="order-scents">{options.map((o) => <option key={o.key} value={o.label} />)}</datalist>
        <span className="block text-xs mt-1" style={{ color: COLORS.dim }}>{match ? t(`orders.form.linked.${match.kind}`) : t("orders.form.typed")}</span></label>
      <fieldset>
        <legend className={label} style={{ color: COLORS.inkSoft }}>{t("orders.form.size")}</legend>
        <div className="flex flex-wrap gap-2 mb-2">
          {SIZES.map((s) => <Chip key={s} pressed={Number(f.size_ml) === s} onToggle={() => setF((p) => ({ ...p, size_ml: String(s) }))}>{t("orders.form.ml", { ml: s })}</Chip>)}
        </div>
        <input type="number" inputMode="decimal" min="0.01" max="1000" step="any" required value={f.size_ml} onChange={set("size_ml")}
          aria-label={t("orders.form.sizeCustom")} className={`${inputClass} sm:w-40`} style={inputStyle} />
      </fieldset>
      <fieldset>
        <legend className={label} style={{ color: COLORS.inkSoft }}>{t("orders.form.strength")}</legend>
        <div className="flex flex-wrap gap-2 mb-2">
          {STRENGTH_TIERS.map((s) => <Chip key={s.pct} pressed={Number(f.strength_pct) === s.pct} onToggle={() => setF((p) => ({ ...p, strength_pct: String(s.pct) }))}>{`${s.name} ${s.pct}%`}</Chip>)}
        </div>
        <input type="number" inputMode="decimal" min="0.01" max="99.99" step="any" required value={f.strength_pct} onChange={set("strength_pct")}
          aria-label={t("orders.form.strengthCustom")} className={`${inputClass} sm:w-40`} style={inputStyle} />
      </fieldset>
      <div className="grid sm:grid-cols-2 gap-4">
        <label><span className={label} style={{ color: COLORS.inkSoft }}>{t("orders.form.price", { currency: CURRENCIES.includes(currency) ? currency : "" })}</span>
          <input type="number" inputMode="decimal" min="0" step="any" value={f.price} onChange={set("price")} className={inputClass} style={inputStyle} /></label>
        <label><span className={label} style={{ color: COLORS.inkSoft }}>{t("orders.form.wanted")}</span>
          <input type="date" value={f.wanted_by} onChange={set("wanted_by")} className={inputClass} style={inputStyle} /></label>
      </div>
      <label><span className={label} style={{ color: COLORS.inkSoft }}>{t("orders.form.contact")}</span>
        <input maxLength={120} value={f.buyer_contact} onChange={set("buyer_contact")} className={inputClass} style={inputStyle} autoComplete="off" /></label>
      <label><span className={label} style={{ color: COLORS.inkSoft }}>{t("orders.form.note")}</span>
        <textarea maxLength={500} rows={2} value={f.note} onChange={set("note")} className={`${inputClass} py-3`} style={inputStyle} /></label>
      <p className="text-xs" style={{ color: COLORS.dim }}>{t("orders.form.privacy")}</p>
      {error && <p role="alert" className="text-sm" style={{ color: COLORS.danger }}>{error}</p>}
      <Button type="submit" loading={busy}>{row.id ? t("orders.form.saveEdit") : t("orders.form.save")}</Button>
    </form>
  );
}
