import React, { useState } from "react";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { addBottle, deleteBottle, updateBottle } from "../../lib/wardrobeApi";
import { costPerWear, wearCounts } from "../../lib/wardrobe/stats";
import Button from "../kx/Button";
import BottleForm from "./BottleForm";
import { catalogueNumber } from "../kx/Card";
import { Chip, money } from "./ui";

// A fill-level slider that commits when you let go (pointer, key or blur),
// not on every tick.
function Fill({ bottle, onCommit }) {
  const { t } = useI18n();
  const [value, setValue] = useState(Number(bottle.fill_pct ?? 100));
  const commit = () => { if (value !== Number(bottle.fill_pct ?? 100)) onCommit(value); };
  return (
    <label className="flex items-center gap-3 text-xs" style={{ color: COLORS.inkSoft }}>
      <span className="sr-only">{t("wardrobe.collection.fillOf", { name: bottle.name })}</span>
      <input type="range" min="0" max="100" step="5" value={value} onChange={(e) => setValue(Number(e.target.value))}
        onPointerUp={commit} onKeyUp={commit} onBlur={commit} className="flex-1 min-h-[44px]" />
      <span className="font-mono tabular-nums w-24 text-end" dir="ltr" aria-hidden="true">{t("wardrobe.collection.fillShown", { pct: value })}</span>
    </label>
  );
}

// The owned bottles and decants as a catalogue: one numbered card each, in
// the order they were added, two to a row on wider screens. Fill level, wear
// count, cost per wear; add, edit, delete (with a second tap).
export default function Collection({ bottles, wear, today, setBottles, onGone }) {
  const { t } = useI18n();
  const [mode, setMode] = useState(null); // null | "add" | bottle id being edited
  const [confirming, setConfirming] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const counts = wearCounts(wear);
  const owned = bottles.filter((b) => b.status === "owned");

  async function save(row, id) {
    const saved = id ? await updateBottle(id, row) : await addBottle({ ...row, status: "owned" });
    setBottles((list) => (id ? list.map((b) => (b.id === id ? saved : b)) : [...list, saved]));
    setStatus(t("wardrobe.collection.saved", { name: saved.name }));
    setMode(null);
  }

  async function setFill(b, pct) {
    try {
      const saved = await updateBottle(b.id, { fill_pct: pct });
      setBottles((list) => list.map((x) => (x.id === b.id ? saved : x)));
    } catch { setError(t("wardrobe.collection.saveFailed")); }
  }

  async function remove(b) {
    try {
      await deleteBottle(b.id);
      setBottles((list) => list.filter((x) => x.id !== b.id));
      onGone(b.id);
    } catch { setError(t("wardrobe.collection.deleteFailed")); }
  }

  return (
    <section aria-labelledby="coll-h">
      <h2 id="coll-h" className="font-serif italic text-2xl mb-4" style={{ color: COLORS.ink }}>{t("wardrobe.collection.title")}</h2>
      {mode === "add" ? (
        <BottleForm today={today} onSave={(row) => save(row)} onCancel={() => setMode(null)} />
      ) : (
        <Button onClick={() => { setMode("add"); setStatus(""); setError(""); }}>{t("wardrobe.collection.add")}</Button>
      )}
      <p role="status" className="text-sm mt-3" style={{ color: COLORS.verdigrisText }}>{status}</p>
      {error && <p role="alert" className="text-sm mt-2" style={{ color: COLORS.danger }}>{error}</p>}

      {owned.length === 0 && mode !== "add" && (
        <p className="mt-6 p-6 text-sm text-center" style={{ background: COLORS.card, border: `1px dashed ${COLORS.line}`, color: COLORS.inkSoft }}>{t("wardrobe.collection.empty")}</p>
      )}
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {owned.map((b, i) => {
          const wears = counts.get(b.id) ?? 0;
          const per = costPerWear(b, wears);
          return (
            <li key={b.id} className={`p-5 flex flex-col ${mode === b.id ? "sm:col-span-2" : ""}`} style={{ background: COLORS.card, border: `1px solid ${COLORS.line}` }}>
              {mode === b.id ? (
                <BottleForm initial={b} today={today} onSave={(row) => save(row, b.id)} onCancel={() => setMode(null)} />
              ) : (
                <>
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-serif text-xl" style={{ color: COLORS.ink }}>{b.name}</h3>
                    <span className="font-mono tabular-nums text-xs shrink-0" dir="ltr" style={{ color: COLORS.dim }}>{catalogueNumber(i + 1)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Chip>{t(`wardrobe.collection.kinds.${b.kind}`)}</Chip>
                    {b.family && <Chip>{t(`families.${b.family}.label`)}</Chip>}
                    {b.size_ml != null && <Chip><span className="font-mono tabular-nums" dir="ltr">{Number(b.size_ml)} mL</span></Chip>}
                  </div>
                  <ul className="text-sm mt-3 font-mono tabular-nums list-none p-0" style={{ color: COLORS.inkSoft }}>
                    <li>{wears === 0 ? t("wardrobe.collection.neverWorn") : wears === 1 ? t("wardrobe.collection.wearsOne") : t("wardrobe.collection.wears", { n: wears })}</li>
                    {per != null && <li>{t("wardrobe.collection.perWear", { amount: money(per, b.currency) })}</li>}
                  </ul>
                  <div className="mt-2"><Fill bottle={b} onCommit={(pct) => setFill(b, pct)} /></div>
                  {b.note && <p className="text-sm mt-1" style={{ color: COLORS.inkSoft }}>{b.note}</p>}
                  <div className="flex flex-wrap gap-3 mt-auto pt-3">
                    <Button variant="secondary" onClick={() => { setMode(b.id); setStatus(""); }} aria-label={t("wardrobe.collection.edit", { name: b.name })}>{t("wardrobe.collection.editShort")}</Button>
                    {confirming === b.id ? (
                      <Button variant="danger" autoFocus onClick={() => { setConfirming(null); remove(b); }} onBlur={() => setConfirming(null)}>{t("wardrobe.collection.confirmRemove")}</Button>
                    ) : (
                      <Button variant="ghost" onClick={() => setConfirming(b.id)} aria-label={t("wardrobe.collection.remove", { name: b.name })} style={{ color: COLORS.danger }}>×</Button>
                    )}
                  </div>
                  {confirming === b.id && <p className="text-xs mt-1" style={{ color: COLORS.dim }}>{t("wardrobe.collection.removeNote")}</p>}
                </>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
