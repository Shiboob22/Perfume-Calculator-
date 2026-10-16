import React, { useEffect, useState } from "react";
import { Link } from "../../motion";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { getMyProfile, getProfile, removeMySalon, saveMyProfile } from "../../lib/salonApi";
import { profileRow, LIMITS } from "../../lib/salon/validate";
import { profileHref } from "../../lib/salon/paths";
import Button from "../kx/Button";
import Field from "../kx/Field";
import { inputClass, inputStyle } from "../wardrobe/ui";

// My Salon profile. Private until the switch is turned on; turning it off
// hides the profile and every post again.
export default function MyProfile() {
  const { t } = useI18n();
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({ handle: "", displayName: "", bio: "", isPublic: false });
  const [suspended, setSuspended] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  useEffect(() => {
    getMyProfile().then(async (p) => {
      if (p) {
        setForm({ handle: p.handle, displayName: p.display_name ?? "", bio: p.bio ?? "", isPublic: p.is_public });
        setSaved(true);
        const info = await getProfile(p.handle).catch(() => null);
        setSuspended(info?.suspended === true);
      }
      setLoaded(true);
    }).catch(() => { setError(t("salon.loadFailed")); setLoaded(true); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- load once

  async function save(e) {
    e.preventDefault(); setStatus("");
    const checked = profileRow(form);
    if (checked.errors) return setError(t("salon.me.check", { fields: checked.errors.map((x) => t(`salon.me.fields.${x}`)).join(", ") }));
    setError(""); setBusy(true);
    try {
      await saveMyProfile(checked.value);
      setSaved(true);
      setStatus(t("salon.me.saved"));
    } catch (err) {
      setError(err?.code === "23505" ? t("salon.me.taken") : t("salon.me.failed"));
    } finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true); setError("");
    try {
      await removeMySalon();
      setForm({ handle: "", displayName: "", bio: "", isPublic: false });
      setSaved(false); setConfirm(false); setStatus(t("salon.me.removed"));
    } catch { setError(t("salon.me.failed")); } finally { setBusy(false); }
  }

  if (!loaded) return <p role="status" className="text-sm" style={{ color: COLORS.inkSoft }}>{t("salon.loading")}</p>;

  return (
    <section aria-labelledby="salon-me-h" className="max-w-xl">
      <h2 id="salon-me-h" className="font-serif italic text-2xl mb-1" style={{ color: COLORS.ink }}>{t("salon.me.title")}</h2>
      <p className="text-sm mb-2" style={{ color: COLORS.inkSoft }}>{t("salon.me.lead")}</p>
      <p className="text-sm mb-5" style={{ color: COLORS.dim }}>{t("salon.me.privacy")}</p>
      {suspended && <p role="alert" className="text-sm mb-4" style={{ color: COLORS.danger }}>{t("salon.me.suspended")}</p>}
      <form onSubmit={save} noValidate className="grid gap-4">
        <Field label={t("salon.me.handle")} hint={t("salon.me.handleHint")} mono dir="ltr" value={form.handle} onChange={(e) => set({ handle: e.target.value })} maxLength={31} autoCapitalize="none" autoCorrect="off" spellCheck={false} />
        <Field label={t("salon.me.name")} value={form.displayName} onChange={(e) => set({ displayName: e.target.value })} maxLength={LIMITS.name} />
        <div>
          <label htmlFor="salon-bio" className="block text-sm mb-1.5" style={{ color: COLORS.inkSoft }}>{t("salon.me.bio")}</label>
          <textarea id="salon-bio" rows={3} maxLength={LIMITS.bio} value={form.bio} onChange={(e) => set({ bio: e.target.value })} className={`${inputClass} py-2`} style={inputStyle} />
        </div>
        <label className="flex items-start gap-3 min-h-[44px]" style={{ color: COLORS.ink }}>
          <input type="checkbox" className="mt-1.5" checked={form.isPublic} onChange={(e) => set({ isPublic: e.target.checked })} aria-describedby="salon-public-hint" />
          <span>
            <span className="block">{t("salon.me.public")}</span>
            <span id="salon-public-hint" className="block text-xs mt-0.5" style={{ color: COLORS.dim }}>{t("salon.me.publicHint")}</span>
          </span>
        </label>
        {error && <p role="alert" className="text-sm" style={{ color: COLORS.danger }}>{error}</p>}
        <p role="status" className="text-sm" style={{ color: COLORS.verdigrisText }}>{status}</p>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={busy}>{t("salon.me.save")}</Button>
          {saved && form.isPublic && <Button as={Link} to={profileHref(form.handle)} variant="secondary">{t("salon.me.view")}</Button>}
        </div>
      </form>
      {saved && (
        <div className="mt-10 pt-5" style={{ borderTop: `1px solid ${COLORS.line}` }}>
          {!confirm
            ? <Button variant="danger" onClick={() => setConfirm(true)}>{t("salon.me.remove")}</Button>
            : (
              <div role="group" aria-label={t("salon.me.removeConfirm")} className="flex flex-wrap items-center gap-3">
                <span className="text-sm max-w-prose" style={{ color: COLORS.ink }}>{t("salon.me.removeConfirm")}</span>
                <Button variant="danger" loading={busy} onClick={remove}>{t("salon.me.removeYes")}</Button>
                <Button variant="secondary" onClick={() => setConfirm(false)}>{t("salon.cancel")}</Button>
              </div>
            )}
        </div>
      )}
    </section>
  );
}
