import React, { useEffect, useState } from "react";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { getWearOptIn, setWearOptIn } from "../../lib/atlasApi";

// Off by default. When on, your owned bottles and wearings count toward the
// anonymous community numbers on Atlas fragrance pages (nothing is shown
// below 10 people, only rounded ranges, never a name or a list). Hidden if
// the setting can't be read (a database without migration 0025).
export default function Privacy() {
  const { t } = useI18n();
  const [on, setOn] = useState(null); // null: unknown, so no switch is shown
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    getWearOptIn().then((v) => { if (live) setOn(v); }).catch(() => {});
    return () => { live = false; };
  }, []);
  if (on === null) return null;

  async function toggle(next) {
    setStatus(""); setError("");
    try { await setWearOptIn(next); setOn(next); setStatus(t("wardrobe.privacy.saved")); }
    catch { setError(t("wardrobe.privacy.failed")); }
  }

  return (
    <section className="mt-12 pt-6 border-t" style={{ borderColor: COLORS.line }}>
      <label className="flex items-start gap-3 cursor-pointer min-h-[44px]" style={{ color: COLORS.ink }}>
        <input type="checkbox" checked={on} onChange={(e) => toggle(e.target.checked)} className="mt-1 w-5 h-5" aria-describedby="privacy-help" />
        <span className="text-sm">{t("wardrobe.privacy.label")}</span>
      </label>
      <p id="privacy-help" className="text-xs mt-1 ms-8" style={{ color: COLORS.dim }}>{t("wardrobe.privacy.help")}</p>
      <p role="status" className="text-xs mt-1 ms-8" style={{ color: COLORS.verdigrisText }}>{status}</p>
      {error && <p role="alert" className="text-xs mt-1 ms-8" style={{ color: COLORS.danger }}>{error}</p>}
    </section>
  );
}
