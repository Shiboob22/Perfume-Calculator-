import React, { useState } from "react";
import { BRAND } from "../../brand.js";
import { renameNoticeVisible } from "../../lib/renameNotice.js";
import { useI18n } from "../../i18n/I18nProvider";
import Notice from "./Notice";

const KEY = "kyphira.renameNoticeDismissed";
const read = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } };

// "Scent Ledger is now Kyphira": for signed-in users, for the first
// BRAND.renameNoticeDays days after the rebrand, until they dismiss it.
export default function RenameNotice({ now = new Date() }) {
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState(read);
  if (!renameNoticeVisible(now, dismissed, BRAND)) return null;
  const dismiss = () => { try { localStorage.setItem(KEY, "1"); } catch { /* private window: it just comes back next visit */ } setDismissed(true); };
  return (
    <Notice tone="info" title={t("notice.renamed.title", { former: BRAND.formerName, name: BRAND.name })} onDismiss={dismiss} dismissLabel={t("notice.dismiss")} className="mb-4">
      {t("notice.renamed.text")}
    </Notice>
  );
}
