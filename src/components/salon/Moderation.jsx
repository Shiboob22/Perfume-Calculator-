import React, { useEffect, useState } from "react";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { getReportQueue, moderate, unsuspend } from "../../lib/salonApi";
import Button from "../kx/Button";
import Field from "../kx/Field";
import { Chip } from "../wardrobe/ui";

// The report queue, for editors (the admins table). Hide or restore a post,
// dismiss a report, suspend an author; lift a suspension by handle. Nothing is
// ever deleted, and every decision is logged by the database.
export default function Moderation({ admin }) {
  const { t } = useI18n();
  const [rows, setRows] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);
  const [handle, setHandle] = useState("");

  useEffect(() => {
    if (!admin) return undefined;
    let live = true;
    getReportQueue().then((r) => { if (live) setRows(r); }).catch(() => { if (live) setError(t("salon.loadFailed")); });
    return () => { live = false; };
  }, [admin]); // eslint-disable-line react-hooks/exhaustive-deps -- load once for an editor

  if (!admin) return <p role="status" className="text-sm" style={{ color: COLORS.inkSoft }}>{t("salon.mod.notAdmin")}</p>;

  async function decide(r, action) {
    setStatus(""); setError(""); setBusy(`${r.id}:${action}`);
    try {
      await moderate(r.id, action);
      setRows((list) => list.filter((x) => x.id !== r.id && !(action !== "dismiss" && x.post_id && x.post_id === r.post_id)));
      setStatus(t(`salon.mod.did.${action}`));
    } catch { setError(t("salon.mod.failed")); } finally { setBusy(null); }
  }
  async function lift(e) {
    e.preventDefault(); setStatus(""); setError("");
    try { await unsuspend(handle.trim().replace(/^@/, "")); setStatus(t("salon.mod.did.unsuspend")); setHandle(""); }
    catch { setError(t("salon.mod.failed")); }
  }

  return (
    <section aria-labelledby="salon-mod-h">
      <h2 id="salon-mod-h" className="font-serif italic text-2xl mb-1" style={{ color: COLORS.ink }}>{t("salon.mod.title")}</h2>
      <p className="text-sm mb-4 max-w-prose" style={{ color: COLORS.inkSoft }}>{t("salon.mod.lead")}</p>
      <p role="status" className="text-sm mb-2" style={{ color: COLORS.verdigrisText }}>{status}</p>
      {error && <p role="alert" className="text-sm mb-2" style={{ color: COLORS.danger }}>{error}</p>}
      {rows && rows.length === 0 && <p className="text-sm" style={{ color: COLORS.inkSoft }}>{t("salon.mod.empty")}</p>}
      <ul className="grid gap-4 list-none p-0 m-0">
        {(rows ?? []).map((r) => (
          <li key={r.id} className="p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.line}` }}>
            <div className="flex flex-wrap gap-2 items-center">
              <Chip>{t(r.post_id ? "salon.mod.post" : "salon.mod.profile")}</Chip>
              <Chip>{t(`salon.post.reasons.${r.reason}`)}</Chip>
              <span className="text-sm" style={{ color: COLORS.inkSoft }}>{t("salon.mod.reports", { n: Number(r.reports) })}</span>
              {r.target_handle && <span className="text-sm font-mono" dir="ltr" style={{ color: COLORS.dim }}>@{r.target_handle}</span>}
            </div>
            {r.post_title && <h3 className="font-serif text-xl mt-2" style={{ color: COLORS.ink }}>{r.post_title}</h3>}
            {r.post_body && <p className="mt-1 text-sm whitespace-pre-line max-w-prose" style={{ color: COLORS.inkSoft }}>{r.post_body}</p>}
            {r.post_status === "hidden" && <p className="text-sm mt-1" style={{ color: COLORS.danger }}>{t("salon.mod.alreadyHidden")}</p>}
            {r.note && <p className="mt-2 text-sm" style={{ color: COLORS.inkSoft }}>{t("salon.mod.note", { note: r.note })}</p>}
            <div className="flex flex-wrap gap-3 mt-4">
              {r.post_id && r.post_status !== "hidden" && <Button loading={busy === `${r.id}:hide`} onClick={() => decide(r, "hide")}>{t("salon.mod.hide")}</Button>}
              {r.post_id && r.post_status === "hidden" && <Button loading={busy === `${r.id}:restore`} onClick={() => decide(r, "restore")}>{t("salon.mod.restore")}</Button>}
              <Button variant="secondary" loading={busy === `${r.id}:dismiss`} onClick={() => decide(r, "dismiss")}>{t("salon.mod.dismiss")}</Button>
              <Button variant="danger" loading={busy === `${r.id}:suspend`} onClick={() => decide(r, "suspend")}>{t("salon.mod.suspend")}</Button>
            </div>
          </li>
        ))}
      </ul>
      <form onSubmit={lift} className="mt-8 flex flex-wrap items-end gap-3 max-w-md">
        <Field label={t("salon.mod.unsuspendTitle")} mono dir="ltr" value={handle} onChange={(e) => setHandle(e.target.value)} className="flex-1" />
        <Button type="submit" variant="secondary" disabled={!handle.trim()}>{t("salon.mod.unsuspend")}</Button>
      </form>
    </section>
  );
}
