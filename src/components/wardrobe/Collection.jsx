import React, { useEffect, useMemo, useState } from "react";
import { COLORS } from "../../lib/theme";
import { roman, cat } from "../../lib/catalogue";
import { useI18n } from "../../i18n/I18nProvider";
import { addBottle, deleteBottle, logWear, updateBottle } from "../../lib/wardrobeApi";
import { getFragrance } from "../../lib/atlasApi";
import { pyramidBands } from "../../lib/atlas/pyramid";
import { ageParts, costPerWear, daysSince, lastWornOn, remainingMl, wearCounts } from "../../lib/wardrobe/stats";
import { wearRow } from "../../lib/wardrobe/validate";
import Button from "../kx/Button";
import Chip from "../kx/Chip";
import Stepper from "../kx/Stepper";
import BottleForm from "./BottleForm";
import { money } from "./ui";

// The owned bottles as plates (Design/boards/Wardrobe.dc.html): a family
// filter, a grid of numbered plates (name, size, a fill rule), and the
// selected bottle beside it with what is left, its notes, its wear history
// and a one-tap "Log a wear". Add, edit and delete keep their forms and the
// second tap to delete. Fill level is edited in the bottle's own form.
const LOW = 30; // percent: the fill rule turns to the warning colour at or below this

function Plate({ bottle, index, selected, onPick, t }) {
  const left = remainingMl(bottle);
  const pct = Number(bottle.fill_pct ?? 100);
  return (
    <button type="button" onClick={onPick} aria-pressed={selected}
      className="w-full h-full flex flex-col justify-between gap-7 min-h-[170px] sm:min-h-[200px] p-4 text-start rounded-sm hover:bg-[color:var(--c-card-hi)]"
      style={{ background: selected ? COLORS.cardHi : COLORS.card, border: `1px solid ${selected ? COLORS.amber : COLORS.line}`, color: COLORS.ink }}>
      <span className="flex items-baseline justify-between gap-2">
        <span dir="ltr" className="font-serif text-base" style={{ color: COLORS.actionText }}>{roman(index + 1)}</span>
        <span className="text-xs" style={{ color: COLORS.dim }}>{bottle.family ? t(`families.${bottle.family}.label`) : t(`wardrobe.collection.kinds.${bottle.kind}`)}</span>
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="font-serif text-[23px] leading-[1.2] rtl:leading-[1.5]" dir="auto">{bottle.name}</span>
      </span>
      <span className="flex flex-col gap-1.5">
        <span dir="ltr" className="flex justify-between text-[13px]">
          <span>{left != null ? `${left.toFixed(1)} ml` : `${pct}%`}</span>
          {bottle.size_ml != null && <span style={{ color: COLORS.dim }}>/ {Number(bottle.size_ml)} ml</span>}
        </span>
        <span aria-hidden="true" className="block h-0.5" style={{ background: COLORS.line }}>
          <span className="block h-0.5" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: pct <= LOW ? COLORS.ember : COLORS.amber }} />
        </span>
      </span>
    </button>
  );
}

// The catalog's notes for a linked bottle, as three rows. Nothing shows for
// a bottle typed in by hand.
function Notes({ fragranceId }) {
  const { t } = useI18n();
  const [bands, setBands] = useState([]);
  useEffect(() => {
    setBands([]);
    if (!fragranceId) return undefined;
    let live = true;
    getFragrance(fragranceId).then((f) => { if (live && f) setBands(pyramidBands(f)); }).catch(() => {});
    return () => { live = false; };
  }, [fragranceId]);
  if (!bands.length) return null;
  return (
    <dl style={{ borderTop: `1px solid ${COLORS.line}` }}>
      {bands.map((b) => (
        <div key={b.layer} className="grid grid-cols-[72px_minmax(0,1fr)] items-baseline gap-3 py-3.5" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
          <dt className="text-xs uppercase tracking-[0.1em] rtl:tracking-normal rtl:normal-case" style={{ color: COLORS.dim }}>{t(`atlas.fragrance.layers.${b.layer}`)}</dt>
          <dd className="font-serif text-lg rtl:leading-[1.6]" dir="auto">{b.notes.join(", ")}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function Collection({ bottles, wear, today, setBottles, onGone, onLogged }) {
  const { t } = useI18n();
  const [mode, setMode] = useState(null); // null | "add" | bottle id being edited
  const [confirming, setConfirming] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [family, setFamily] = useState("");
  const [picked, setPicked] = useState(null);
  const [sprays, setSprays] = useState("4");
  const [busy, setBusy] = useState(false);
  const counts = wearCounts(wear);
  const owned = bottles.filter((b) => b.status === "owned");
  const families = useMemo(() => {
    const n = new Map();
    for (const b of owned) if (b.family) n.set(b.family, (n.get(b.family) ?? 0) + 1);
    return [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [owned]);
  const shown = owned.filter((b) => !family || b.family === family);
  const selected = owned.find((b) => b.id === picked) ?? shown[0] ?? null;
  const selectedIndex = selected ? owned.indexOf(selected) : -1;

  async function save(row, id) {
    const saved = id ? await updateBottle(id, row) : await addBottle({ ...row, status: "owned" });
    setBottles((list) => (id ? list.map((b) => (b.id === id ? saved : b)) : [...list, saved]));
    setStatus(t("wardrobe.collection.saved", { name: saved.name }));
    setPicked(saved.id);
    setMode(null);
  }

  async function remove(b) {
    try {
      await deleteBottle(b.id);
      setBottles((list) => list.filter((x) => x.id !== b.id));
      onGone(b.id);
      setPicked(null);
    } catch { setError(t("wardrobe.collection.deleteFailed")); }
  }

  async function logOne(b) {
    const checked = wearRow({ bottle_id: b.id, worn_on: today, sprays }, today);
    if (checked.errors) return setError(t("wardrobe.collection.checkFields", { fields: checked.errors.map((f) => t(`wardrobe.fields.${f}`)).join(", ") }));
    setError(""); setBusy(true);
    try {
      onLogged(await logWear(checked.row));
      setStatus(t("wardrobe.today.saved", { name: b.name }));
    } catch {
      setError(t("wardrobe.today.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  const age = (iso) => {
    const p = ageParts(daysSince(iso, today));
    return p ? t(`wardrobe.collection.age.${p.unit}`, { n: p.value }) : "—";
  };

  const detail = selected && (() => {
    const b = selected;
    const wears = counts.get(b.id) ?? 0;
    const per = costPerWear(b, wears);
    const left = remainingMl(b);
    const last = lastWornOn(wear, b.id);
    const pct = Number(b.fill_pct ?? 100);
    return (
      <aside aria-label={t("wardrobe.collection.detail")} className="flex flex-col gap-5 p-6 rounded-sm min-w-0" style={{ background: COLORS.card, border: `1px solid ${COLORS.line}` }}>
        <div className="flex items-baseline justify-between gap-3">
          <span dir="ltr" className="font-serif text-lg" style={{ color: COLORS.actionText }}>{roman(selectedIndex + 1)}</span>
          <span dir="ltr" className="text-xs tracking-[0.06em]" style={{ color: COLORS.dim }}>{cat("W", selectedIndex + 1)}</span>
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="font-serif font-light text-[34px] leading-[1.1] rtl:leading-[1.5]" dir="auto">{b.name}</h3>
          <p className="text-[15px]" style={{ color: COLORS.dim }}>
            {[b.family && t(`families.${b.family}.label`), t(`wardrobe.collection.kinds.${b.kind}`)].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div role="progressbar" aria-label={t("wardrobe.collection.fillOf", { name: b.name })} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[13px]" style={{ color: COLORS.dim }}>{t("wardrobe.collection.remaining")}</span>
            <span dir="ltr" className="flex items-baseline gap-1.5">
              <span className="text-[32px] font-medium leading-none">{left != null ? left.toFixed(1) : pct}</span>
              <span className="text-sm" style={{ color: COLORS.dim }}>{b.size_ml != null ? `/ ${Number(b.size_ml)} ml` : "%"}</span>
            </span>
          </div>
          <div className="relative h-4" dir="ltr">
            <div aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px" style={{ background: COLORS.line }} />
            <div aria-hidden="true" className="absolute top-1/2 h-0.5 -mt-px start-0 fill-anim" style={{ width: `${pct}%`, background: pct <= LOW ? COLORS.ember : COLORS.amber }} />
            {Array.from({ length: 11 }, (_, i) => (
              <span key={i} aria-hidden="true" className="absolute top-1/2 w-px -translate-y-1/2" style={{ left: `${i * 10}%`, height: i % 5 === 0 ? 16 : 8, background: i * 10 <= pct ? (pct <= LOW ? COLORS.ember : COLORS.amber) : COLORS.field }} />
            ))}
          </div>
        </div>
        <Notes fragranceId={b.fragrance_id} />
        <dl className="grid grid-cols-3 rounded-sm" style={{ border: `1px solid ${COLORS.line}` }}>
          {[[t("wardrobe.collection.wearsLabel"), String(wears)], [t("wardrobe.collection.lastWorn"), last ? t("wardrobe.collection.age.d", { n: daysSince(last, today) }) : "—"], [t("wardrobe.collection.opened"), age(b.purchase_date)]].map(([k, v], i) => (
            <div key={k} className="p-3 min-w-0" style={{ borderInlineStart: i ? `1px solid ${COLORS.line}` : "none" }}>
              <dt className="text-xs" style={{ color: COLORS.dim }}>{k}</dt>
              <dd dir="ltr" className="mt-1.5 text-2xl text-start rtl:text-end">{v}</dd>
            </div>
          ))}
        </dl>
        {per != null && <p className="text-sm -mt-2" style={{ color: COLORS.dim }}>{t("wardrobe.collection.perWear", { amount: money(per, b.currency) })}</p>}
        {b.note && <p className="text-sm" style={{ color: COLORS.inkSoft }}>{b.note}</p>}
        <div className="flex flex-col gap-2.5">
          <Stepper id="collection-sprays" label={t("wardrobe.today.sprays")} value={sprays} onChange={setSprays} step={1} min={1} max={50} size="md"
            decLabel={t("wardrobe.collection.spraysDec")} incLabel={t("wardrobe.collection.spraysInc")} className="max-w-[220px]" />
          <Button size="lg" loading={busy} onClick={() => logOne(b)} aria-label={t("wardrobe.today.wearOf", { name: b.name })} className="w-full on-resin">{t("wardrobe.collection.logWear")}</Button>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => { setMode(b.id); setStatus(""); }} aria-label={t("wardrobe.collection.edit", { name: b.name })}>{t("wardrobe.collection.editShort")}</Button>
          {confirming === b.id ? (
            <Button variant="danger" autoFocus onClick={() => { setConfirming(null); remove(b); }} onBlur={() => setConfirming(null)}>{t("wardrobe.collection.confirmRemove")}</Button>
          ) : (
            <Button variant="ghost" onClick={() => setConfirming(b.id)} aria-label={t("wardrobe.collection.remove", { name: b.name })} style={{ color: COLORS.danger }}>×</Button>
          )}
        </div>
        {confirming === b.id && <p className="text-xs -mt-2" style={{ color: COLORS.dim }}>{t("wardrobe.collection.removeNote")}</p>}
      </aside>
    );
  })();

  return (
    <section aria-labelledby="coll-h" className="flex flex-col gap-5">
      <h2 id="coll-h" className="sr-only">{t("wardrobe.collection.title")}</h2>
      <div>
        {mode === "add" ? null : (
          <Button variant="secondary" onClick={() => { setMode("add"); setStatus(""); setError(""); }}>{t("wardrobe.collection.add")}</Button>
        )}
      </div>
      <p role="status" className="text-sm" style={{ color: COLORS.verdigrisText }}>{status}</p>
      {error && <p role="alert" className="text-sm" style={{ color: COLORS.danger }}>{error}</p>}

      {mode === "add" && (
        <div className="p-6 rounded-sm" style={{ background: COLORS.card, border: `1px solid ${COLORS.line}` }}>
          <BottleForm today={today} onSave={(row) => save(row)} onCancel={() => setMode(null)} />
        </div>
      )}

      {owned.length === 0 && mode !== "add" && (
        <p className="p-6 text-sm text-center rounded-sm" style={{ background: COLORS.card, border: `1px dashed ${COLORS.line}`, color: COLORS.inkSoft }}>{t("wardrobe.collection.empty")}</p>
      )}

      {owned.length > 0 && (
        <div className="grid gap-8 min-[1100px]:grid-cols-[minmax(0,1fr)_420px] items-start">
          <div className="flex flex-col gap-5 min-w-0">
            {families.length > 1 && (
              <div role="group" aria-label={t("wardrobe.collection.filter")} className="flex flex-wrap gap-2">
                <Chip pressed={!family} count={owned.length} onClick={() => setFamily("")}>{t("wardrobe.collection.all")}</Chip>
                {families.map(([f, n]) => <Chip key={f} pressed={family === f} count={n} onClick={() => setFamily(f)}>{t(`families.${f}.label`)}</Chip>)}
              </div>
            )}
            <ul className="grid gap-3 grid-cols-1 min-[480px]:grid-cols-2 xl:grid-cols-3">
              {shown.map((b) => (
                <li key={b.id} className="min-w-0"><Plate bottle={b} index={owned.indexOf(b)} selected={selected?.id === b.id} onPick={() => { setPicked(b.id); setMode(null); setConfirming(null); }} t={t} /></li>
              ))}
            </ul>
          </div>
          {mode && mode !== "add" && selected && mode === selected.id ? (
            <div className="p-6 rounded-sm min-w-0" style={{ background: COLORS.card, border: `1px solid ${COLORS.line}` }}>
              <BottleForm initial={selected} today={today} onSave={(row) => save(row, selected.id)} onCancel={() => setMode(null)} />
            </div>
          ) : detail}
        </div>
      )}
    </section>
  );
}
