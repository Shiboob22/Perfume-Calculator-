import React, { useCallback, useEffect, useMemo, useState } from "react";
import { COLORS } from "../../lib/theme";
import { TIERS, TIER_COLORS } from "../../lib/tiers";
import { tierFor } from "../../lib/calc";
import { limit, canAddFormula } from "../../lib/entitlements";
import { listFormulas, saveFormula, deleteFormula, LimitError } from "../../lib/benchApi";
import { latestVersion, matchesVersion, recipeLabel, versionSettings } from "../../lib/recipes";
import { UNIT_LABELS } from "../../lib/calcPrefill";
import Sheet from "../kx/Sheet";

// Saved formulas (Bench SaaS): the recipes of 0023 plus their blend
// ingredients (0031). useFormulas() holds the list and what is loaded; the
// library (desktop rail), the phone sheet and the save button only show it.
// A logged batch is linked to the loaded version while the Bench still holds
// exactly its settings and ingredients.

const near = (a, b) => Math.abs(Number(a) - Number(b)) < 1e-9;
const sameIngredients = (rows, stored) => {
  const a = (rows ?? []).filter((r) => Number(r.pct) > 0);
  const b = [...(stored ?? [])].sort((x, y) => x.position - y.position);
  return a.length === b.length && a.every((r, i) => r.name.trim() === b[i].name && r.type === b[i].type && near(r.pct, b[i].pct)
    && near(Number(r.price) || 0, Number(b[i].price_per_g) || 0));
};

/** The ingredient rows a stored version restores, or null for a simple formula. */
export const rowsFromVersion = (version) => {
  const list = [...(version?.recipe_ingredients ?? [])].sort((x, y) => x.position - y.position);
  return list.length ? list.map((i) => ({ id: i.id, name: i.name, type: i.type, pct: String(Number(i.pct)), price: i.price_per_g == null ? "" : String(Number(i.price_per_g)) })) : null;
};

export function useFormulas({ current, blend, entitlements, initialVersionId, onApply, onLocked, t }) {
  const [formulas, setFormulas] = useState([]);
  const [active, setActive] = useState(null); // { recipeId, versionId }
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ kind: null, text: "" });

  const load = useCallback((recipe, version) => {
    setActive({ recipeId: recipe.id, versionId: version.id });
    setStatus({ kind: null, text: "" });
    onApply({ ...versionSettings(recipe, version), name: recipe.name, ingredients: rowsFromVersion(version) });
  }, [onApply]);

  useEffect(() => {
    let live = true;
    listFormulas().then((rows) => {
      if (!live) return;
      setFormulas(rows);
      if (initialVersionId) {
        const r = rows.find((x) => x.recipe_versions.some((v) => v.id === initialVersionId));
        const v = r?.recipe_versions.find((x) => x.id === initialVersionId);
        if (r && v) load(r, v);
      }
    }).catch(() => {});
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, []);

  const activeRecipe = formulas.find((r) => r.id === active?.recipeId) ?? null;
  const activeVersion = activeRecipe?.recipe_versions.find((v) => v.id === active?.versionId) ?? null;
  const linked = Boolean(activeVersion && matchesVersion(activeVersion, current)
    && (blend ? sameIngredients(blend, activeVersion.recipe_ingredients) : !(activeVersion.recipe_ingredients ?? []).length));
  const label = activeVersion ? recipeLabel({ name: activeRecipe.name, version: activeVersion.version }) : "";

  async function save({ name, family }) {
    const clean = (name ?? "").trim();
    if (!clean) return setStatus({ kind: "error", text: t("calc.formulas.needName") });
    // The loaded formula under the same name gets a new version; anything else is a new formula.
    const asVersion = activeRecipe && activeRecipe.name.trim().toLowerCase() === clean.toLowerCase();
    // No plan limits formulas (0034); a plan row with a cap would still be honoured here.
    if (!asVersion && entitlements.loaded && !entitlements.failed && !canAddFormula(entitlements, formulas.length)) {
      return setStatus({ kind: "error", text: t("calc.formulas.full", { cap: limit(entitlements, "formulas") }) });
    }
    setBusy(true); setStatus({ kind: null, text: "" });
    try {
      const ingredients = blend ? blend.filter((r) => Number(r.pct) > 0).map((r) => ({ name: r.name.trim() || t("calc.blend.unnamed", { n: 1 }), type: r.type, pct: Number(r.pct), price_per_g: Number(r.price) > 0 ? Number(r.price) : null })) : [];
      const saved = await saveFormula(entitlements, formulas.length, {
        recipeId: asVersion ? activeRecipe.id : undefined,
        name: clean, family: family ?? null,
        version: {
          amount: Number(current.amount), unit: current.unit, concentration_pct: Number(current.concPct),
          oil_density: Number(current.oilDensity) > 0 ? Number(current.oilDensity) : null,
          ethanol_density: Number(current.ethanolDensity) > 0 ? Number(current.ethanolDensity) : null,
        },
        ingredients,
      });
      setFormulas((rs) => [saved, ...rs.filter((r) => r.id !== saved.id)]);
      const v = latestVersion(saved);
      setActive({ recipeId: saved.id, versionId: v.id });
      setStatus({ kind: "saved", text: t("calc.formulas.saved", { label: recipeLabel({ name: saved.name, version: v.version }) }) });
    } catch (e) {
      if (e instanceof LimitError && e.code === "ingredient_cap") {
        onLocked("blend");
        setStatus({ kind: "error", text: t("plan.limit.ingredients", { cap: e.cap }) });
      } else if (e instanceof LimitError) {
        // The database's 50-per-user guard, the same on every plan: Pro would not lift it.
        setStatus({ kind: "error", text: t("calc.formulas.full", { cap: e.cap }) });
      } else {
        setStatus({ kind: "error", text: e?.code === "23505" ? t("calc.recipes.exists") : t("calc.recipes.saveFailed") });
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    try {
      await deleteFormula(id);
      setFormulas((rs) => rs.filter((r) => r.id !== id));
      if (active?.recipeId === id) setActive(null);
    } catch {
      setStatus({ kind: "error", text: t("calc.recipes.deleteFailed") });
    }
  }

  return { formulas, active, activeRecipe, activeVersion, linked, label, load, save, remove, busy, status };
}

function useFiltered(formulas) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("all");
  const families = useMemo(() => [...new Set(formulas.map((f) => f.family).filter((k) => TIERS[k]))], [formulas]);
  const q = query.trim().toLowerCase();
  const shown = formulas.filter((f) => (tag === "all" || f.family === tag) && (!q || f.name.toLowerCase().includes(q)));
  return { query, setQuery, tag, setTag, families, shown };
}

function Count({ count, entitlements, t }) {
  const cap = limit(entitlements, "formulas");
  return (
    <span data-formula-count className="text-xs tabular-nums whitespace-nowrap" style={{ color: count >= cap ? COLORS.actionText : COLORS.dim, fontWeight: count >= cap ? 600 : 400 }}>
      {cap === Infinity ? t("calc.formulas.countAll", { n: count }) : t("calc.formulas.count", { n: count, max: cap })}
    </span>
  );
}

function FormulaList({ f, filter, big, t }) {
  const [confirming, setConfirming] = useState(null);
  const { shown } = filter;
  return (
    <>
      <input type="search" value={filter.query} onChange={(e) => filter.setQuery(e.target.value)}
        placeholder={t("calc.formulas.search")} aria-label={t("calc.formulas.search")}
        className={`w-full ${big ? "min-h-[48px] text-base" : "min-h-[44px] text-sm"} px-3 rounded border`}
        style={{ borderColor: COLORS.field, background: COLORS.cardHi, color: COLORS.ink }} />
      {filter.families.length > 0 && (
        <div role="group" aria-label={t("calc.formulas.families")} className={`flex gap-1 ${big ? "overflow-x-auto pb-0.5" : "flex-wrap"}`}>
          {["all", ...filter.families].map((k) => (
            <button key={k} type="button" aria-pressed={filter.tag === k} onClick={() => filter.setTag(k)}
              className="shrink-0 min-h-[36px] px-2.5 text-[13px] rounded border inline-flex items-center gap-1.5"
              style={{ borderColor: filter.tag === k ? COLORS.actionText : COLORS.line, background: filter.tag === k ? COLORS.sand : "transparent", color: COLORS.ink }}>
              {k !== "all" && <span aria-hidden="true" className="w-2 h-2" style={{ background: TIER_COLORS[k] }} />}
              {k === "all" ? t("calc.formulas.all") : t(`families.${k}.label`)}
            </button>
          ))}
        </div>
      )}
      <ul style={{ borderTop: `1px solid ${COLORS.line}` }}>
        {shown.map((r) => {
          const v = latestVersion(r);
          if (!v) return null;
          const loaded = f.active?.recipeId === r.id;
          const n = v.recipe_ingredients?.length ?? 0;
          const meta = [`${Number(v.amount)} ${UNIT_LABELS[v.unit] ?? v.unit}`, `${Number(v.concentration_pct)}%`, tierFor(v.concentration_pct).name, n ? t("calc.formulas.materials", { count: n }) : null].filter(Boolean).join(" · ");
          return (
            <li key={r.id} className={`flex items-center gap-3 ${big ? "py-3" : "py-2.5"}`} style={{ borderBottom: `1px solid ${COLORS.line}` }}>
              <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                <span className={big ? "text-base" : "text-sm"} style={{ color: COLORS.ink }}>{r.name}{r.recipe_versions.length > 1 ? ` v${v.version}` : ""}</span>
                <span dir="ltr" className="text-xs tabular-nums text-start rtl:text-end" style={{ color: COLORS.dim }}>{meta}</span>
              </span>
              {confirming === r.id ? (
                <button type="button" autoFocus onClick={() => { setConfirming(null); f.remove(r.id); }} onBlur={() => setConfirming(null)}
                  className="min-h-[44px] px-2 text-[13px]" style={{ color: COLORS.danger }}>{t("calc.recipes.confirmDelete")}</button>
              ) : (
                <button type="button" onClick={() => setConfirming(r.id)} aria-label={t("calc.recipes.delete", { name: r.name })}
                  className="w-9 min-h-[44px] text-lg" style={{ color: COLORS.dim }}>×</button>
              )}
              <button type="button" onClick={() => f.load(r, v)} aria-pressed={loaded}
                aria-label={t(loaded ? "calc.formulas.loadedName" : "calc.formulas.loadName", { name: r.name })}
                className={`${big ? "min-h-[44px] px-4" : "min-h-[40px] px-3"} text-[13px] rounded border`}
                style={{ borderColor: loaded ? COLORS.actionText : COLORS.field, background: loaded ? COLORS.sand : "transparent", color: COLORS.ink }}>
                {t(loaded ? "calc.formulas.loaded" : "calc.formulas.load")}
              </button>
            </li>
          );
        })}
      </ul>
      {shown.length === 0 && <p className="text-[13px]" style={{ color: COLORS.dim }}>{t(f.formulas.length ? "calc.formulas.empty" : "calc.formulas.none")}</p>}
    </>
  );
}

/** Desktop rail: the library itself. */
export function FormulaLibrary({ f, entitlements, t }) {
  const filter = useFiltered(f.formulas);
  return (
    <section aria-labelledby="calc-formulas-title" className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="calc-formulas-title" className="text-[11px] font-normal uppercase tracking-[0.15em] rtl:tracking-normal" style={{ color: COLORS.dim }}>{t("calc.formulas.title")}</h2>
        <Count count={f.formulas.length} entitlements={entitlements} t={t} />
      </div>
      <FormulaList f={f} filter={filter} t={t} />
    </section>
  );
}

/** Phone: a "Your formulas" button and the library in a bottom sheet. */
export function FormulasButton({ f, entitlements, t }) {
  const [open, setOpen] = useState(false);
  const filter = useFiltered(f.formulas);
  const loadAndClose = { ...f, load: (r, v) => { f.load(r, v); setOpen(false); } };
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog"
        className="w-full min-h-[52px] px-4 mb-6 flex items-center justify-between gap-3 text-[15px] rounded"
        style={{ border: `1px solid ${COLORS.ink}`, color: COLORS.ink }}>
        <span>{t("calc.formulas.open")}</span>
        <Count count={f.formulas.length} entitlements={entitlements} t={t} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("calc.formulas.title")} closeLabel={t("calc.formulas.close")}
        headerExtra={<Count count={f.formulas.length} entitlements={entitlements} t={t} />}>
        <div className="flex flex-col gap-3">
          <FormulaList f={loadAndClose} filter={filter} big t={t} />
        </div>
      </Sheet>
    </>
  );
}

/** Under the log button: which formula version a batch will carry. */
export function FormulaLink({ f, onPickVersion, t }) {
  if (!f.activeVersion) return null;
  const versions = [...f.activeRecipe.recipe_versions].sort((a, b) => b.version - a.version);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs" style={{ color: COLORS.inkSoft }}>
      <span>{t(f.linked ? "calc.recipes.linked" : "calc.recipes.changed", { label: f.label })}</span>
      {versions.length > 1 && (
        <select value={f.activeVersion.id} aria-label={t("calc.recipes.version")}
          onChange={(e) => onPickVersion(f.activeRecipe, f.activeRecipe.recipe_versions.find((v) => v.id === e.target.value))}
          className="min-h-[36px] px-2 border" style={{ borderColor: COLORS.field, background: COLORS.cardHi, color: COLORS.ink }}>
          {versions.map((v) => <option key={v.id} value={v.id}>v{v.version}{v.note ? ` — ${v.note}` : ""}</option>)}
        </select>
      )}
    </div>
  );
}
