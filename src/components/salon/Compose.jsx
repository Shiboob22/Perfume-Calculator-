import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { listRecipes } from "../../lib/fragranceApi";
import { searchAtlas } from "../../lib/atlasApi";
import { createPost, getMyProfile } from "../../lib/salonApi";
import { postRow, recipeLine, snapshotFromRecipe, LIMITS } from "../../lib/salon/validate";
import Button from "../kx/Button";
import Field from "../kx/Field";
import { SelectField, inputClass, inputStyle } from "../wardrobe/ui";

const ERROR_KEYS = { "54000": "tooMany", "23505": "exists", "22023": "failed", "23514": "linkRefused" };

// Write a post: share a saved recipe's blend (only its size, strength and
// the densities you set) or review a fragrance. Needs a public profile.
export default function Compose() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(undefined);
  const [recipes, setRecipes] = useState([]);
  const [kind, setKind] = useState("recipe");
  const [recipeId, setRecipeId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [rating, setRating] = useState("5");
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [fragrance, setFragrance] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getMyProfile().then(setProfile).catch(() => setProfile(null));
    listRecipes().then(setRecipes).catch(() => {});
  }, []);

  const recipe = recipes.find((r) => r.id === recipeId) ?? null;
  function pickRecipe(id) {
    setRecipeId(id);
    const r = recipes.find((x) => x.id === id);
    if (r && !title) setTitle(r.name);
  }
  async function search(e) {
    e.preventDefault();
    if (!q.trim()) return;
    setError("");
    try { setResults((await searchAtlas({ q: q.trim() })).rows.slice(0, 6)); } catch { setError(t("salon.loadFailed")); }
  }

  async function publish(e) {
    e.preventDefault();
    const checked = postRow({
      kind, title, body, family: recipe?.family, snapshot: recipe ? snapshotFromRecipe(recipe) : null,
      fragranceId: fragrance?.id, rating,
    });
    if (checked.errors) return setError(t("salon.compose.check", { fields: checked.errors.map((x) => t(`salon.compose.fields.${x}`)).join(", ") }));
    setError(""); setBusy(true);
    try {
      await createPost(checked.value);
      navigate("/salon");
    } catch (err) {
      const key = err?.code === "42501" ? "notAllowed" : ERROR_KEYS[err?.code] ?? "failed";
      setError(t(`salon.compose.${key}`, { fields: "" }));
      setBusy(false);
    }
  }

  if (profile === undefined) return <p role="status" className="text-sm" style={{ color: COLORS.inkSoft }}>{t("salon.loading")}</p>;
  if (!profile?.is_public) {
    return (
      <section aria-labelledby="salon-compose-h" className="max-w-xl">
        <h2 id="salon-compose-h" className="font-serif italic text-2xl mb-2" style={{ color: COLORS.ink }}>{t("salon.compose.title")}</h2>
        <p className="text-sm" style={{ color: COLORS.inkSoft }}>{t("salon.compose.needProfile")} <Link to="/salon/me" className="underline underline-offset-2" style={{ color: COLORS.forestDeep }}>{t("salon.feed.setUp")}</Link></p>
      </section>
    );
  }

  return (
    <section aria-labelledby="salon-compose-h" className="max-w-xl">
      <h2 id="salon-compose-h" className="font-serif italic text-2xl mb-1" style={{ color: COLORS.ink }}>{t("salon.compose.title")}</h2>
      <p className="text-sm mb-5" style={{ color: COLORS.inkSoft }}>{t("salon.compose.lead")}</p>
      <form onSubmit={publish} noValidate className="grid gap-4">
        <fieldset className="grid gap-2 border-0 p-0 m-0">
          <legend className="text-sm mb-1.5" style={{ color: COLORS.inkSoft }}>{t("salon.compose.kind")}</legend>
          <div className="flex gap-4">
            {["recipe", "review"].map((k) => (
              <label key={k} className="inline-flex items-center gap-2 min-h-[44px]" style={{ color: COLORS.ink }}>
                <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} />
                {t(`salon.post.${k}`)}
              </label>
            ))}
          </div>
        </fieldset>

        {kind === "recipe" && (
          recipes.length === 0
            ? <p className="text-sm" style={{ color: COLORS.inkSoft }}>{t("salon.compose.noRecipes")} <Link to="/bench" className="underline underline-offset-2" style={{ color: COLORS.forestDeep }}>{t("salon.compose.toBench")}</Link></p>
            : (
              <>
                <SelectField label={t("salon.compose.pickRecipe")} value={recipeId} onChange={pickRecipe}
                  options={[{ value: "", label: t("salon.compose.pickRecipeNone") }, ...recipes.map((r) => ({ value: r.id, label: r.name }))]} />
                {recipe && <p className="text-sm font-mono" dir="ltr" style={{ color: COLORS.ink }}>{recipeLine(snapshotFromRecipe(recipe))}</p>}
                <p className="text-xs" style={{ color: COLORS.dim }}>{t("salon.compose.recipeHint")}</p>
              </>
            )
        )}

        {kind === "review" && (
          <>
            <div>
              <label htmlFor="salon-frag" className="block text-sm mb-1.5" style={{ color: COLORS.inkSoft }}>{t("salon.compose.fragrance")}</label>
              <div className="flex gap-2">
                <input id="salon-frag" value={q} onChange={(e) => setQ(e.target.value)} className={inputClass} style={inputStyle} onKeyDown={(e) => { if (e.key === "Enter") search(e); }} />
                <Button type="button" variant="secondary" onClick={search}>{t("salon.compose.find")}</Button>
              </div>
            </div>
            {fragrance && <p role="status" className="text-sm" style={{ color: COLORS.verdigrisText }}>{t("salon.compose.chosen", { name: fragrance.name })}</p>}
            {results && results.length === 0 && <p className="text-sm" style={{ color: COLORS.inkSoft }}>{t("salon.compose.noResults")}</p>}
            {results && results.length > 0 && (
              <ul className="grid gap-1 list-none p-0 m-0" aria-label={t("salon.compose.results")}>
                {results.map((f) => (
                  <li key={f.id}>
                    <button type="button" onClick={() => { setFragrance(f); setResults(null); if (!title) setTitle(f.name); }} className="w-full text-start px-3 min-h-[44px] border" style={{ borderColor: COLORS.line, color: COLORS.ink, background: COLORS.card }}>
                      {f.name}{f.brand ? <span style={{ color: COLORS.dim }}> · {f.brand}</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <SelectField label={t("salon.compose.rating")} value={rating} onChange={setRating} options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: t("salon.post.rating", { n }) }))} />
          </>
        )}

        <Field label={t("salon.compose.titleLabel")} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={LIMITS.title} />
        <div>
          <label htmlFor="salon-body" className="block text-sm mb-1.5" style={{ color: COLORS.inkSoft }}>{t("salon.compose.bodyLabel")}</label>
          <textarea id="salon-body" rows={5} maxLength={LIMITS.body} value={body} onChange={(e) => setBody(e.target.value)} className={`${inputClass} py-2`} style={inputStyle} aria-describedby="salon-body-hint" />
          <p id="salon-body-hint" className="text-xs mt-1" style={{ color: COLORS.dim }}>{t("salon.compose.bodyHint")}</p>
        </div>
        {error && <p role="alert" className="text-sm" style={{ color: COLORS.danger }}>{error}</p>}
        <div className="flex gap-3"><Button type="submit" loading={busy}>{t("salon.compose.publish")}</Button></div>
      </form>
    </section>
  );
}
