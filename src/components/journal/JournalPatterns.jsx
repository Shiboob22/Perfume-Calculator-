import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { COLORS } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { journalPatterns } from "../../lib/fragranceApi";

// "Your patterns": the days come from the server only on Pro; Free sees
// which families have one waiting. Always worded as the user's own history,
// never as advice (these numbers are not from the handbooks).
export default function JournalPatterns({ version }) {
  const { t } = useI18n();
  const [data, setData] = useState(null);

  useEffect(() => {
    let live = true;
    journalPatterns().then((d) => live && setData(d)).catch(() => {});
    return () => { live = false; };
  }, [version]);

  const family = (key) => t(`families.${key}.label`);
  const patterns = Object.entries(data?.patterns || {});
  const ready = data?.ready || [];
  if (!patterns.length && !ready.length) return null;

  return (
    <section aria-labelledby="journal-patterns-title" className="mb-6 p-4 border rounded-lg" style={{ borderColor: COLORS.line, backgroundColor: COLORS.card }}>
      <h3 id="journal-patterns-title" className="text-sm font-semibold" style={{ color: COLORS.forestDeep }}>{t("journal.pattern.title")}</h3>
      {patterns.length > 0 && (
        <>
          <ul className="mt-2 space-y-1 text-sm" style={{ color: COLORS.ink }}>
            {patterns.map(([key, p]) => (
              <li key={key}>{t("journal.pattern.line", { family: family(key), day: p.day, count: p.batches, min: p.min, max: p.max })}</li>
            ))}
          </ul>
          <p className="text-xs mt-2" style={{ color: COLORS.dim }}>{t("journal.pattern.source")}</p>
        </>
      )}
      {ready.length > 0 && (
        <>
          <ul className="mt-2 space-y-1 text-sm" style={{ color: COLORS.ink }}>
            {ready.map((key) => <li key={key}>{t("journal.pattern.ready", { family: family(key) })}</li>)}
          </ul>
          <p className="text-xs mt-2" style={{ color: COLORS.inkSoft }}>
            {t("journal.pattern.locked")}{" "}
            <Link to="/app/account" className="underline" style={{ color: COLORS.forest }}>{t("journal.pattern.waitlist")}</Link>
          </p>
        </>
      )}
    </section>
  );
}
