import React, { useState } from "react";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { addBottle, deleteBottle, updateBottle } from "../../lib/wardrobeApi";
import Button from "../kx/Button";
import BottleForm from "./BottleForm";
import { Chip } from "./ui";

// The wish list and the tested list: what you want, and what you sampled.
export default function Lists({ bottles, today, setBottles }) {
  const { t } = useI18n();
  const [adding, setAdding] = useState(null); // "wishlist" | "tested" | null
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  async function save(row, list) {
    const saved = await addBottle({ ...row, status: list });
    setBottles((all) => [...all, saved]);
    setStatus(t("wardrobe.collection.saved", { name: saved.name }));
    setAdding(null);
  }
  async function own(b) {
    try {
      const saved = await updateBottle(b.id, { status: "owned" });
      setBottles((all) => all.map((x) => (x.id === b.id ? saved : x)));
    } catch { setError(t("wardrobe.lists.moveFailed")); }
  }
  async function remove(b) {
    try {
      await deleteBottle(b.id);
      setBottles((all) => all.filter((x) => x.id !== b.id));
    } catch { setError(t("wardrobe.collection.deleteFailed")); }
  }

  return (
    <section aria-labelledby="lists-h">
      <h2 id="lists-h" className="font-serif italic text-2xl mb-4" style={{ color: COLORS.ink }}>{t("wardrobe.lists.title")}</h2>
      <p role="status" className="text-sm mb-3" style={{ color: COLORS.verdigrisText }}>{status}</p>
      {error && <p role="alert" className="text-sm mb-3" style={{ color: COLORS.danger }}>{error}</p>}
      <div className="grid gap-8 md:grid-cols-2">
        {["wishlist", "tested"].map((list) => {
          const rows = bottles.filter((b) => b.status === list);
          return (
            <section key={list} aria-labelledby={`list-${list}`}>
              <h3 id={`list-${list}`} className="font-serif text-xl mb-3" style={{ color: COLORS.ink }}>{t(`wardrobe.lists.${list}`)}</h3>
              {adding === list ? (
                <BottleForm compact status={list} today={today} onSave={(row) => save(row, list)} onCancel={() => setAdding(null)} />
              ) : (
                <Button variant="secondary" onClick={() => { setAdding(list); setStatus(""); setError(""); }}>{t("wardrobe.lists.addTo", { list: t(`wardrobe.lists.${list}`) })}</Button>
              )}
              {rows.length === 0 && adding !== list && <p className="mt-4 text-sm" style={{ color: COLORS.inkSoft }}>{t(`wardrobe.lists.${list}Empty`)}</p>}
              <ul className="mt-4 grid gap-3">
                {rows.map((b) => (
                  <li key={b.id} className="p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.line}` }}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-serif text-lg" style={{ color: COLORS.ink }}>{b.name}</span>
                      {b.family && <Chip>{t(`families.${b.family}.label`)}</Chip>}
                    </div>
                    {b.note && <p className="text-sm mt-1" style={{ color: COLORS.inkSoft }}>{b.note}</p>}
                    <div className="flex flex-wrap gap-3 mt-3">
                      <Button variant="secondary" onClick={() => own(b)}>{t("wardrobe.lists.moveToOwned")}</Button>
                      <Button variant="ghost" onClick={() => remove(b)} aria-label={t("wardrobe.collection.remove", { name: b.name })} style={{ color: COLORS.danger }}>×</Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </section>
  );
}
