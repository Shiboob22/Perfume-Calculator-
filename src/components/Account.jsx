import React, { useEffect, useState } from "react";
import { COLORS, SHAPE } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import { errorText } from "../i18n/errorText";
import { useEntitlements } from "../lib/useEntitlements";
import { useProfile } from "../lib/useProfile";
import { deleteAccount, fetchExport, joinWaitlist, onWaitlist } from "../lib/accountApi";
import { EXPORT_TABLES, toCsv, toJson } from "../lib/exportData";
import { UNIT_LABELS } from "../lib/calcPrefill";
import { signOut } from "../lib/auth";
import { RoomHeader, RoomPage } from "./kx";

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const stamp = () => new Date().toISOString().slice(0, 10);

// Each section is one pane of the settings (Design/boards "Account"): a side
// list on a desktop, a row of tabs on a phone. Only the danger zone is a
// bordered box, so it is the one thing on the page that looks different.
function Section({ title, children, danger = false, id }) {
  if (danger) {
    return (
      <section id={id} className={`mt-10 p-5 sm:p-6 ${SHAPE.danger}`} style={{ background: COLORS.dangerBg, border: `1px solid ${COLORS.danger}` }}>
        <h3 className="font-serif text-2xl mb-3 rtl:leading-[1.5]" style={{ color: COLORS.danger }}>{title}</h3>
        {children}
      </section>
    );
  }
  return (
    <section id={id} className="py-7 first:pt-0 border-t first:border-t-0" style={{ borderColor: COLORS.line }}>
      <h3 className="font-serif text-2xl mb-3 rtl:leading-[1.5]" style={{ color: COLORS.ink }}>{title}</h3>
      {children}
    </section>
  );
}

const inputStyle = { background: COLORS.cardHi, color: COLORS.ink, border: `1px solid ${COLORS.field}` };
const PANES = ["prefs", "plan", "data"];

// /app/account: preferences, plan and usage with the Pro waitlist, and
// data export with account deletion.
export default function Account({ user }) {
  const { t, locale, setLocale } = useI18n();
  const entitlements = useEntitlements();
  const { profile, save } = useProfile();
  // The Pricing page links here with #pro: open the plan pane and bring it into view.
  const [pane, setPane] = useState(() => (typeof window !== "undefined" && window.location.hash === "#pro" ? "plan" : "prefs"));
  useEffect(() => {
    if (window.location.hash === "#pro") document.getElementById("pro")?.scrollIntoView();
  }, []);

  return (
    <RoomPage>
      <RoomHeader title={t("account.title")} />
      <p className="text-sm -mt-4" dir="auto" style={{ color: COLORS.inkSoft }}>{t("account.signedInAs", { email: user.email })}</p>
      <div className="grid gap-8 md:grid-cols-[220px_minmax(0,1fr)] items-start">
        <nav aria-label={t("account.title")} className="flex md:flex-col overflow-x-auto md:overflow-visible" style={{ scrollbarWidth: "none" }}>
          {PANES.map((id) => {
            const on = pane === id;
            return (
              <button key={id} type="button" aria-current={on ? "true" : undefined} onClick={() => setPane(id)}
                className="min-h-[48px] px-4 md:ps-4 text-start whitespace-nowrap text-[15px] hover:text-[color:var(--c-ink)] focus-visible:outline-offset-[-2px]"
                style={{ color: on ? COLORS.ink : COLORS.inkSoft, boxShadow: `inset 2px 0 0 ${on ? COLORS.amber : "transparent"}` }}>
                {t(`account.panes.${id}`)}
              </button>
            );
          })}
        </nav>
        <div className="max-w-[560px] min-w-0">
          {pane === "prefs" && (
            <Section title={t("account.prefs.title")}>
              <Preferences profile={profile} save={save} locale={locale} setLocale={setLocale} />
            </Section>
          )}
          {pane === "plan" && (
            <>
              <Section title={t("account.plan.title")}>
                <p style={{ color: COLORS.ink }}>{t("account.plan.current", { plan: t(`plan.names.${entitlements.plan}`) })}</p>
                <p className="text-sm mt-1" style={{ color: COLORS.inkSoft }}>
                  {entitlements.batchCap == null
                    ? t("account.plan.unlimited", { used: entitlements.batchesUsed })
                    : t("account.plan.usage", { used: entitlements.batchesUsed, cap: entitlements.batchCap })}
                </p>
                <a href={locale === "ar" ? "/ar/pricing" : "/pricing"} className="inline-flex items-center min-h-[44px] text-sm underline mt-2" style={{ color: COLORS.actionText }}>{t("account.plan.seePricing")}</a>
              </Section>
              {entitlements.plan !== "pro" && <Waitlist />}
            </>
          )}
          {pane === "data" && (
            <>
              <Section title={t("account.data.title")}>
                <ExportData />
              </Section>
              <Section title={t("account.delete.title")} danger>
                <DeleteAccount email={user.email} />
              </Section>
            </>
          )}
        </div>
      </div>
    </RoomPage>
  );
}

function Waitlist() {
  const { t, locale } = useI18n();
  const [joined, setJoined] = useState(null); // null while loading
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { onWaitlist().then(setJoined).catch(() => setJoined(false)); }, []);

  async function join() {
    setBusy(true);
    setError(null);
    try {
      await joinWaitlist(locale);
      setJoined(true);
    } catch {
      setError(t("account.waitlist.failed"));
    }
    setBusy(false);
  }

  return (
    <Section id="pro" title={t("account.waitlist.title")}>
      <p className="text-sm mb-4" style={{ color: COLORS.inkSoft }}>{t("account.waitlist.lead")}</p>
      {joined
        ? <p role="status" className="text-sm font-semibold" style={{ color: COLORS.actionText }}>✓ {t("account.waitlist.joined")}</p>
        : <button type="button" disabled={busy || joined === null} onClick={join}
            className="px-5 min-h-[44px] rounded-sm text-sm font-semibold disabled:opacity-50" style={{ background: COLORS.amber, color: COLORS.onAmber }}>
            {t("account.waitlist.join")}
          </button>}
      {error && <p role="alert" className="text-sm mt-3" style={{ color: COLORS.danger }}>{error}</p>}
    </Section>
  );
}

function Preferences({ profile, save, locale, setLocale }) {
  const { t } = useI18n();
  const [bottle, setBottle] = useState(profile?.default_bottle ?? "");
  const [status, setStatus] = useState(null);
  const unit = profile?.default_unit ?? "ml";

  async function update(changes) {
    setStatus(null);
    try {
      await save(changes);
      setStatus("saved");
    } catch {
      setStatus("failed");
    }
  }

  const row = "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3 border-b last:border-b-0";
  return (
    <div>
      <label className={row} style={{ borderColor: COLORS.line }}>
        <span style={{ color: COLORS.ink }}>{t("account.prefs.language")}</span>
        <select value={locale} onChange={(e) => { setLocale(e.target.value); update({ locale: e.target.value }); }} className="px-3 min-h-[44px] rounded-sm" style={inputStyle}>
          <option value="en" lang="en">English</option>
          <option value="ar" lang="ar">العربية</option>
        </select>
      </label>
      <label className={row} style={{ borderColor: COLORS.line }}>
        <span style={{ color: COLORS.ink }}>{t("account.prefs.unit")}</span>
        <select value={unit} onChange={(e) => update({ default_unit: e.target.value })} className="px-3 min-h-[44px] rounded-sm" style={inputStyle}>
          {Object.keys(UNIT_LABELS).map((u) => <option key={u} value={u}>{t(`onboarding.unit.${u}`)}</option>)}
        </select>
      </label>
      <label className={row} style={{ borderColor: COLORS.line }}>
        <span style={{ color: COLORS.ink }}>{t("account.prefs.bottle")}</span>
        <span className="flex items-center gap-2">
          <input type="number" inputMode="decimal" min="0" step="any" value={bottle} onChange={(e) => setBottle(e.target.value)}
            onBlur={() => { const n = Number(bottle); if (n > 0 && n !== profile?.default_bottle) update({ default_bottle: n }); }}
            className="w-28 px-3 min-h-[44px] rounded-sm" style={inputStyle} />
          <span className="font-mono text-sm" style={{ color: COLORS.inkSoft }}>{UNIT_LABELS[unit]}</span>
        </span>
      </label>
      <p role="status" className="text-xs mt-2 min-h-[1rem]" style={{ color: status === "failed" ? COLORS.danger : COLORS.inkSoft }}>
        {status === "saved" && t("account.prefs.saved")}
        {status === "failed" && t("account.prefs.saveFailed")}
      </p>
    </div>
  );
}

function ExportData() {
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { fetchExport().then(setData).catch(() => setError(t("account.data.failed"))); }, [t]);

  const tables = data ? EXPORT_TABLES.filter((table) => data[table]?.length) : [];
  return (
    <div>
      <p className="text-sm mb-4" style={{ color: COLORS.inkSoft }}>{t("account.data.lead")}</p>
      {error && <p role="alert" className="text-sm" style={{ color: COLORS.danger }}>{error}</p>}
      {data && tables.length === 0 && <p className="text-sm" style={{ color: COLORS.inkSoft }}>{t("account.data.empty")}</p>}
      {tables.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => download(`scent-handbook-${stamp()}.json`, toJson(data), "application/json")}
            className="px-4 min-h-[44px] rounded-sm text-sm font-semibold" style={{ background: COLORS.amber, color: COLORS.onAmber }}>
            {t("account.data.json")}
          </button>
          {tables.map((table) => (
            <button key={table} type="button" onClick={() => download(`scent-handbook-${table}-${stamp()}.csv`, toCsv(data[table]), "text/csv;charset=utf-8")}
              className="px-4 min-h-[44px] rounded-sm text-sm" style={{ background: COLORS.cardHi, color: COLORS.ink, border: `1px solid ${COLORS.field}` }}>
              {t("account.data.csv", { table: t(`account.data.tables.${table}`) })}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DeleteAccount({ email }) {
  const { t } = useI18n();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const matches = confirm.trim().toLowerCase() === email.toLowerCase();

  async function remove(e) {
    e.preventDefault();
    if (!matches) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(confirm.trim());
      await signOut().catch(() => {});
      window.location.assign("/");
    } catch (err) {
      setError(t("account.delete.failed", { error: errorText(t, err) }));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={remove}>
      <p className="text-sm mb-4" style={{ color: COLORS.ink }}>{t("account.delete.lead")}</p>
      <label className="block text-sm mb-3" style={{ color: COLORS.inkSoft }}>
        {t("account.delete.confirmLabel")}
        <input type="email" autoComplete="off" value={confirm} onChange={(e) => setConfirm(e.target.value)} dir="ltr"
          className="mt-1 w-full px-3 min-h-[44px] rounded-sm" style={inputStyle} />
      </label>
      <button type="submit" disabled={!matches || busy}
        className="px-5 min-h-[44px] rounded-sm text-sm font-semibold disabled:opacity-40" style={{ background: COLORS.danger, color: COLORS.paper }}>
        {busy ? t("account.delete.working") : t("account.delete.button")}
      </button>
      {error && <p role="alert" className="text-sm mt-3" style={{ color: COLORS.danger }}>{error}</p>}
    </form>
  );
}
