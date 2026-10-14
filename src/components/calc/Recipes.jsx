import React, { useEffect, useState } from "react";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { listRecipes, createRecipe, addRecipeVersion, deleteRecipe } from "../../lib/fragranceApi";
import { UNIT_LABELS } from "../../lib/calcPrefill";
import { latestVersion, matchesVersion, recipeLabel, recipeLimit, recipeName, versionIndex, versionRow, versionSettings } from "../../lib/recipes";

// Saved recipes with versions: open one to fill the calculator, save the
// current settings as a new recipe or as the next version of the open one.
// A batch is linked to the open version only while the calculator still
// holds exactly its settings (`onLink` is told which version, or null).
export default function Recipes({ current, family, onApply, onLink, initialVersionId }) {
  const { t } = useI18n();
  const [recipes, setRecipes] = useState([]);
  const [active, setActive] = useState(null); // { recipeId, versionId }
  const [mode, setMode] = useState(null); // "new" | "version"
  const [confirming, setConfirming] = useState(null);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const index = versionIndex(recipes);
  const activeRecipe = recipes.find((r) => r.id === active?.recipeId) ?? null;
  const activeVersion = activeRecipe?.recipe_versions.find((v) => v.id === active?.versionId) ?? null;
  const same = activeVersion ? matchesVersion(activeVersion, current) : false;
  const label = activeVersion ? recipeLabel(index.get(activeVersion.id)) : "";

  useEffect(() => {
    let live = true;
    listRecipes().then((rows) => {
      if (!live) return;
      setRecipes(rows); // a convenience: a failed list just shows nothing
      // "Make again" from a batch made from a recipe version.
      if (initialVersionId) {
        const r = rows.find((x) => x.recipe_versions.some((v) => v.id === initialVersionId));
        const v = r?.recipe_versions.find((x) => x.id === initialVersionId);
        if (r && v) open(r, v);
      }
    }).catch(() => {});
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, []);

  useEffect(() => { onLink(same ? activeVersion.id : null); }, [same, activeVersion, onLink]);

  function open(recipe, version) {
    setActive({ recipeId: recipe.id, versionId: version.id });
    setMode(null); setError(""); setSaved("");
    onApply(versionSettings(recipe, version));
  }

  const settings = () => versionRow({ ...current, note });

  function failure(e, fallback) {
    if (e?.code === "23505") return t("calc.recipes.exists");
    if (e?.code === "54000") return t(mode === "version" ? "calc.recipes.limitVersions" : "calc.recipes.limitRecipes");
    return t(fallback);
  }

  async function save() {
    setError(""); setSaved("");
    const limit = recipeLimit(recipes, mode === "version" ? activeRecipe : null);
    if (limit) return setError(t(limit === "recipes" ? "calc.recipes.limitRecipes" : "calc.recipes.limitVersions"));
    setBusy(true);
    try {
      let recipe;
      if (mode === "version") recipe = await addRecipeVersion(activeRecipe.id, settings());
      else {
        const clean = recipeName(name);
        if (!clean) return;
        recipe = await createRecipe({ name: clean, family, version: settings() });
      }
      setRecipes((rs) => [recipe, ...rs.filter((r) => r.id !== recipe.id)]);
      const v = latestVersion(recipe);
      setActive({ recipeId: recipe.id, versionId: v.id });
      setSaved(t("calc.recipes.saved", { label: recipeLabel({ name: recipe.name, version: v.version }) }));
      setMode(null); setName(""); setNote("");
    } catch (e) {
      setError(failure(e, "calc.recipes.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    try {
      await deleteRecipe(id);
      setRecipes((rs) => rs.filter((r) => r.id !== id));
      if (active?.recipeId === id) setActive(null);
    } catch {
      setError(t("calc.recipes.deleteFailed"));
    }
  }

  const inputStyle = { borderColor: COLORS.field, backgroundColor: COLORS.cardHi, color: COLORS.ink };
  return (
    <div className="mb-5" role="group" aria-label={t("calc.recipes.label")}>
      <div className="flex flex-wrap gap-2 items-center">
        {recipes.map((r) => {
          const latest = latestVersion(r);
          const isActive = r.id === active?.recipeId;
          return (
            <span key={r.id} className="inline-flex items-center border text-[11px] font-mono" style={{ borderColor: isActive ? COLORS.amber : COLORS.line }}>
              <button type="button" onClick={() => open(r, latest)} aria-pressed={isActive}
                aria-label={t("calc.recipes.open", { label: recipeLabel({ name: r.name, version: latest.version }) })}
                className="px-2 py-1 min-h-[28px]" style={{ color: COLORS.ink }}>
                <span className="font-sans">{r.name}</span>{" "}
                <span style={{ color: COLORS.inkSoft }}>v{latest.version} · {Number(latest.amount)} {UNIT_LABELS[latest.unit]}, {Number(latest.concentration_pct)}%</span>
              </button>
              {confirming === r.id ? (
                <button type="button" autoFocus onClick={() => { setConfirming(null); remove(r.id); }} onBlur={() => setConfirming(null)}
                  className="px-2 min-h-[28px]" style={{ color: COLORS.danger, borderInlineStart: `1px solid ${COLORS.line}` }}>
                  {t("calc.recipes.confirmDelete")}
                </button>
              ) : (
                <button type="button" onClick={() => setConfirming(r.id)} aria-label={t("calc.recipes.delete", { name: r.name })}
                  className="min-w-[28px] min-h-[28px] px-2" style={{ color: COLORS.dim, borderInlineStart: `1px solid ${COLORS.line}` }}>×</button>
              )}
            </span>
          );
        })}
        {!mode && (
          <>
            <button type="button" onClick={() => { setMode("new"); setSaved(""); setError(""); }} className="px-2 py-1 text-[11px] font-mono underline" style={{ color: COLORS.amber }}>
              {t("calc.recipes.add")}
            </button>
            {activeRecipe && (
              <button type="button" onClick={() => { setMode("version"); setSaved(""); setError(""); }} className="px-2 py-1 text-[11px] font-mono underline" style={{ color: COLORS.amber }}>
                {t("calc.recipes.addVersion", { name: activeRecipe.name })}
              </button>
            )}
          </>
        )}
      </div>

      {activeRecipe && activeRecipe.recipe_versions.length > 1 && (
        <label className="mt-2 flex items-center gap-2 text-[11px] font-mono" style={{ color: COLORS.inkSoft }}>
          {t("calc.recipes.version")}
          <select value={active.versionId} onChange={(e) => open(activeRecipe, activeRecipe.recipe_versions.find((v) => v.id === e.target.value))}
            className="px-2 py-1 border" style={inputStyle}>
            {[...activeRecipe.recipe_versions].sort((a, b) => b.version - a.version).map((v) => (
              <option key={v.id} value={v.id}>v{v.version}{v.note ? ` — ${v.note}` : ""}</option>
            ))}
          </select>
        </label>
      )}

      {mode && (
        <div className="mt-2 flex flex-wrap gap-2 items-center">
          {mode === "new" ? (
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus
              aria-label={t("calc.recipes.name")} placeholder={t("calc.recipes.name")} className="px-2 py-1 font-mono text-[11px] border" style={inputStyle} />
          ) : (
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} autoFocus
              aria-label={t("calc.recipes.note")} placeholder={t("calc.recipes.note")} className="px-2 py-1 font-mono text-[11px] border" style={inputStyle} />
          )}
          <button type="button" onClick={save} disabled={busy || (mode === "new" && !recipeName(name))}
            className="px-2 py-1 text-[11px] font-semibold rounded-none disabled:opacity-50" style={{ background: COLORS.amber, color: COLORS.onAmber }}>
            {t("calc.recipes.save")}
          </button>
        </div>
      )}

      {/* Which version a logged batch will carry, so it is never a surprise. */}
      <p role="status" className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>
        {saved || (activeVersion ? t(same ? "calc.recipes.linked" : "calc.recipes.changed", { label }) : "")}
      </p>
      {error && <p role="alert" className="text-xs mt-1" style={{ color: COLORS.danger }}>{error}</p>}
    </div>
  );
}
