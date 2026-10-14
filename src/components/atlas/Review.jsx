import React, { useEffect, useState } from "react";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { getQueue, refreshAtlas, reviewFragrance } from "../../lib/atlasApi";
import Button from "../kx/Button";
import { Chip } from "../wardrobe/ui";

// The moderation queue, for editors (the admins table). Approve makes a
// suggestion visible to everyone; reject hides it from everyone but its
// author and deletes nothing.
export default function Review({ admin }) {
  const { t } = useI18n();
  const [rows, setRows] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    if (!admin) return undefined;
    let live = true;
    getQueue().then((r) => { if (live) setRows(r); }).catch(() => { if (live) setError(t("atlas.loadFailed")); });
    return () => { live = false; };
  }, [admin]); // eslint-disable-line react-hooks/exhaustive-deps -- load once for an admin

  if (!admin) return <p role="status" className="text-sm" style={{ color: COLORS.inkSoft }}>{t("atlas.review.notAdmin")}</p>;

  async function decide(f, approve) {
    setStatus(""); setError(""); setBusy(f.id);
    try {
      await reviewFragrance(f.id, approve);
      setRows((list) => list.filter((x) => x.id !== f.id));
      setStatus(t(approve ? "atlas.review.approved" : "atlas.review.rejected", { name: f.name }));
    } catch {
      setError(t("atlas.review.failed"));
    } finally {
      setBusy(null);
    }
  }
  async function refresh() {
    setStatus(""); setError("");
    try { await refreshAtlas(); setStatus(t("atlas.review.refreshed")); } catch { setError(t("atlas.review.failed")); }
  }

  return (
    <section aria-labelledby="atlas-review-h">
      <h2 id="atlas-review-h" className="font-serif italic text-2xl mb-1" style={{ color: COLORS.ink }}>{t("atlas.review.title")}</h2>
      <p className="text-sm mb-4 max-w-prose" style={{ color: COLORS.inkSoft }}>{t("atlas.review.lead")}</p>
      <p role="status" className="text-sm mb-2" style={{ color: COLORS.verdigrisText }}>{status}</p>
      {error && <p role="alert" className="text-sm mb-2" style={{ color: COLORS.danger }}>{error}</p>}
      {rows && rows.length === 0 && <p className="text-sm" style={{ color: COLORS.inkSoft }}>{t("atlas.review.empty")}</p>}
      <ul className="grid gap-4 list-none p-0 m-0">
        {(rows ?? []).map((f) => (
          <li key={f.id} className="p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.line}` }}>
            <h3 className="font-serif text-xl" style={{ color: COLORS.ink }}>{f.name}</h3>
            <p className="text-sm mt-1" style={{ color: COLORS.inkSoft }}>
              {f.brand ? t("atlas.review.details", { brand: f.brand, year: f.year ?? "—" }) : t("atlas.review.noBrand")}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {[...(f.top_notes ?? []), ...(f.middle_notes ?? []), ...(f.base_notes ?? [])].slice(0, 12).map((n) => <Chip key={n}>{n}</Chip>)}
              {(f.accords ?? []).slice(0, 5).map((a) => <Chip key={`a-${a}`}>{a}</Chip>)}
            </div>
            <div className="flex flex-wrap gap-3 mt-4">
              <Button loading={busy === f.id} onClick={() => decide(f, true)}>{t("atlas.review.approve")}</Button>
              <Button variant="danger" disabled={busy === f.id} onClick={() => decide(f, false)}>{t("atlas.review.reject")}</Button>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-8"><Button variant="secondary" onClick={refresh}>{t("atlas.review.refresh")}</Button></div>
    </section>
  );
}
