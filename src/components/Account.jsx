import React, { useEffect, useState } from "react";
import RoomBeam from "./kx/RoomBeam";
import { COLORS, SHAPE } from "../lib/theme";
import MotionSetting from "./MotionSetting";
import SoundSetting from "./SoundSetting";
import { useI18n } from "../i18n/I18nProvider";
import { errorText } from "../i18n/errorText";
import { useEntitlements } from "../lib/useEntitlements";
import { useProfile } from "../lib/useProfile";
import { deleteAccount, fetchExport, joinWaitlist, onWaitlist, isAdmin, sendReminderTest, inviteInfo } from "../lib/accountApi";
import { EXPORT_TABLES, toCsv, toJson } from "../lib/exportData";
import { UNIT_LABELS } from "../lib/calcPrefill";
import { CURRENCIES } from "../lib/currencies";
import { signOut } from "../lib/auth";
import { Link, Reveal } from "../motion";
import { useStartTrial } from "./plan/Upgrade";
import RoomHeader from "./kx/RoomHeader";

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const stamp = () => new Date().toISOString().slice(0, 10);

// Sections are separated by a rule, not boxed: only the danger zone is a
// bordered box, so it is the one thing on the page that looks different.
function Section({ title, children, danger = false, id }) {
  if (danger) {
    return (
      <section id={id} className={`mt-8 p-5 sm:p-6 ${SHAPE.danger}`} style={{ background: COLORS.dangerBg, border: `1px solid ${COLORS.danger}` }}>
        <h2 className="font-serif text-2xl mb-3" style={{ color: COLORS.danger }}>{title}</h2>
        {children}
      </section>
    );
  }
  return (
    <Reveal as="section" id={id} className="py-7 border-t" style={{ borderColor: COLORS.line }}>
      <h2 className="font-serif font-light text-3xl mb-3 rtl:leading-[1.5]" style={{ color: COLORS.ink }}>{title}</h2>
      {children}
    </Reveal>
  );
}

const buttonStyle = { background: COLORS.cardHi, color: COLORS.ink, border: `1px solid ${COLORS.field}` };
const inputStyle = { background: COLORS.cardHi, color: COLORS.ink, border: `1px solid ${COLORS.field}` };

// /app/account: plan and usage, the Pro waitlist, preferences, data export
// and account deletion.
export default function Account({ user }) {
  const { t, locale, setLocale } = useI18n();
  const entitlements = useEntitlements();
  const { profile, save } = useProfile();

  // The Pricing page links here with #pro; bring that section into view.
  useEffect(() => {
    if (window.location.hash === "#pro") document.getElementById("pro")?.scrollIntoView();
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-6 sm:px-8 py-6">
      <RoomBeam />
      <RoomHeader name={t("account.title")}>
        <p className="text-sm mt-3 font-mono" style={{ color: COLORS.inkSoft }}>{t("account.signedInAs", { email: user.email })}</p>
      </RoomHeader>

      <Section title={t("account.plan.title")}>
        <p style={{ color: COLORS.ink }}>{t("account.plan.current", { plan: t(`plan.names.${entitlements.plan}`) })}</p>
        <p className="text-sm mt-1" style={{ color: COLORS.inkSoft }}>
          {entitlements.batchCap == null
            ? t("account.plan.unlimited", { used: entitlements.batchesUsed })
            : t("account.plan.usage", { used: entitlements.batchesUsed, cap: entitlements.batchCap })}
        </p>
        {entitlements.batchCap != null && (
          <div dir="ltr" role="meter" aria-label={t("account.plan.title")} aria-valuemin={0} aria-valuemax={entitlements.batchCap} aria-valuenow={Math.min(entitlements.batchesUsed, entitlements.batchCap)}
            className="relative mt-3 h-4 max-w-sm">
            <span className="absolute inset-x-0 top-[7px] h-[2px]" style={{ background: COLORS.line }} />
            <span className="absolute start-0 top-[7px] h-[2px] fill-anim" style={{ width: `${Math.min(100, (entitlements.batchesUsed / entitlements.batchCap) * 100)}%`, background: COLORS.oil }} />
          </div>
        )}
        <a href={locale === "ar" ? "/ar/pricing" : "/pricing"} className="inline-block text-sm underline mt-3" style={{ color: COLORS.actionText }}>{t("account.plan.seePricing")}</a>
      </Section>

      {entitlements.plan !== "pro" && <Waitlist />}
      {entitlements.plan === "pro" && <Invite />}

      <Section title={t("account.prefs.title")}>
        <Preferences profile={profile} save={save} locale={locale} setLocale={setLocale} />
      </Section>

      <ReminderTest />

      <Section title={t("account.data.title")}>
        <ExportData />
      </Section>

      <Section title={t("account.delete.title")} danger>
        <DeleteAccount email={user.email} />
      </Section>
    </div>
  );
}

function Waitlist() {
  const { t, locale } = useI18n();
  const entitlements = useEntitlements();
  const { start, busy: trialBusy, message } = useStartTrial();
  const trialUsed = Boolean(entitlements.trial?.used);
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
      {/* The trial first, the waitlist after (audit H8: the Pricing page sends visitors here). */}
      <div data-trial className="mb-6">
        <button type="button" onClick={start} disabled={trialBusy || trialUsed}
          className="px-5 min-h-[48px] rounded text-sm font-semibold disabled:opacity-50" style={{ background: COLORS.amber, color: COLORS.onAmber }}>
          {trialUsed ? t("plan.trial.used") : trialBusy ? t("upgrade.starting") : t("plan.trial.start")}
        </button>
        <p className="text-sm mt-2" style={{ color: COLORS.inkSoft }}>{t("plan.trial.terms")}</p>
        <p role="status" className="text-sm mt-2 empty:hidden" style={{ color: COLORS.actionText }}>{message}</p>
      </div>
      <p className="text-sm mb-4" style={{ color: COLORS.inkSoft }}>{t("account.waitlist.lead")}</p>
      {joined
        ? <p role="status" className="text-sm font-semibold" style={{ color: COLORS.actionText }}>✓ {t("account.waitlist.joined")}</p>
        : <button type="button" disabled={busy || joined === null} onClick={join}
            className="px-5 py-2 rounded text-sm font-semibold disabled:opacity-50" style={{ background: COLORS.amber, color: COLORS.onAmber }}>
            {t("account.waitlist.join")}
          </button>}
      {error && <p role="alert" className="text-sm mt-3" style={{ color: COLORS.danger }}>{error}</p>}
    </Section>
  );
}

// Bring a friend (0042): the Pro user's invite link, months earned, gifted Pro's end.
function Invite() {
  const { t, locale } = useI18n();
  const [info, setInfo] = useState(null);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  // An answer without a code is a failure too, so "{earned} of {cap}" never shows raw (audit L8).
  useEffect(() => { inviteInfo().then((i) => (i?.code ? setInfo(i) : setFailed(true))).catch(() => setFailed(true)); }, []);
  const link = info ? `${window.location.origin}${locale === "ar" ? "/ar" : ""}/bench?ref=invite-${info.code}` : "";
  async function copy() {
    try { await navigator.clipboard.writeText(link); setCopied(true); } catch { setCopied(false); }
  }
  const date = (iso) => new Date(iso).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB", { day: "numeric", month: "long", year: "numeric", numberingSystem: "latn" });
  return (
    <Section id="invite" title={t("account.invite.title")}>
      <p className="text-sm mb-4" style={{ color: COLORS.inkSoft }}>{t("account.invite.lead")}</p>
      {failed && <p role="alert" className="text-sm" style={{ color: COLORS.danger }}>{t("account.invite.failed")}</p>}
      {info && (
        <div className="flex flex-col gap-3" data-invite>
          <div className="flex flex-wrap items-center gap-2">
            <input readOnly value={link} dir="ltr" aria-label={t("account.invite.title")} onFocus={(e) => e.target.select()}
              className="flex-1 min-w-0 min-h-[44px] px-3 rounded text-sm font-mono" style={inputStyle} />
            <button type="button" onClick={copy} className="min-h-[44px] px-5 rounded text-sm font-semibold" style={{ background: COLORS.amber, color: COLORS.onAmber }}>{t("account.invite.copy")}</button>
          </div>
          <p role="status" className="text-sm" style={{ color: COLORS.actionText }}>{copied ? t("account.invite.copied") : ""}</p>
          {Number.isFinite(info.earned) && Number.isFinite(info.cap) && <p className="text-sm" style={{ color: COLORS.ink }} data-invite-earned>{t("account.invite.earned", { earned: info.earned, cap: info.cap })}</p>}
          {info.gift_ends_at && <p className="text-sm" style={{ color: COLORS.inkSoft }}>{t("account.invite.until", { date: date(info.gift_ends_at) })}</p>}
        </div>
      )}
    </Section>
  );
}

// Admins only (the server checks too): send yourself one reminder to see what arrives.
function ReminderTest() {
  const { t } = useI18n();
  const [admin, setAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { isAdmin().then(setAdmin).catch(() => setAdmin(false)); }, []);
  if (!admin) return null;

  async function send() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await sendReminderTest());
    } catch (err) {
      setError(errorText(t, err));
    }
    setBusy(false);
  }

  const push = result?.push;
  return (
    <Section id="reminder-test" title={t("account.reminderTest.title")}>
      <p className="text-sm mb-4" style={{ color: COLORS.inkSoft }}>{t("account.reminderTest.lead")}</p>
      <button type="button" disabled={busy} onClick={send} data-reminder-test
        className="px-5 py-2 rounded text-sm font-semibold disabled:opacity-50" style={buttonStyle}>
        {busy ? t("account.reminderTest.working") : t("account.reminderTest.button")}
      </button>
      {result && (
        <ul role="status" className="text-sm mt-3 space-y-1" style={{ color: COLORS.ink }}>
          <li>{t(`account.reminderTest.email.${result.email}`)}</li>
          <li>{push === "off" ? t("account.reminderTest.push.off")
            : push.devices === 0 ? t("account.reminderTest.push.none")
            : t("account.reminderTest.push.sent", { count: push.sent, devices: push.devices })}</li>
        </ul>
      )}
      {error && <p role="alert" className="text-sm mt-3" style={{ color: COLORS.danger }}>{error}</p>}
    </Section>
  );
}

function Preferences({ profile, save, locale, setLocale }) {
  const { t } = useI18n();
  const [bottle, setBottle] = useState(profile?.default_bottle ?? "");
  const [shop, setShop] = useState(profile?.shop_name ?? "");
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
        <select value={locale} onChange={(e) => { setLocale(e.target.value); update({ locale: e.target.value }); }} className="px-3 py-2 rounded" style={inputStyle}>
          <option value="en" lang="en">English</option>
          <option value="ar" lang="ar">العربية</option>
        </select>
      </label>
      <label className={row} style={{ borderColor: COLORS.line }}>
        <span style={{ color: COLORS.ink }}>{t("account.prefs.unit")}</span>
        <select value={unit} onChange={(e) => update({ default_unit: e.target.value })} className="px-3 py-2 rounded" style={inputStyle}>
          {Object.keys(UNIT_LABELS).map((u) => <option key={u} value={u}>{t(`onboarding.unit.${u}`)}</option>)}
        </select>
      </label>
      <label className={row} style={{ borderColor: COLORS.line }}>
        <span style={{ color: COLORS.ink }}>{t("account.prefs.bottle")}</span>
        <span className="flex items-center gap-2">
          <input type="number" inputMode="decimal" min="0" step="any" value={bottle} onChange={(e) => setBottle(e.target.value)}
            onBlur={() => { const n = Number(bottle); if (n > 0 && n !== profile?.default_bottle) update({ default_bottle: n }); }}
            className="w-28 px-3 py-2 rounded font-mono" style={inputStyle} />
          <span className="font-mono text-sm" style={{ color: COLORS.inkSoft }}>{UNIT_LABELS[unit]}</span>
        </span>
      </label>
      <label className={row} style={{ borderColor: COLORS.line }}>
        <span style={{ color: COLORS.ink }}>{t("account.prefs.sells")}</span>
        <input type="checkbox" checked={Boolean(profile?.sells)} onChange={(e) => update({ sells: e.target.checked })}
          className="w-6 h-6 min-h-[24px]" style={{ accentColor: COLORS.amber }} />
      </label>
      {profile?.sells && (
        <label className={row} style={{ borderColor: COLORS.line }}>
          <span style={{ color: COLORS.ink }}>{t("account.prefs.currency")}</span>
          <select value={CURRENCIES.includes(profile?.currency) ? profile.currency : ""} onChange={(e) => update({ currency: e.target.value })}
            className="px-3 py-2 rounded font-mono" style={inputStyle}>
            {!CURRENCIES.includes(profile?.currency) && <option value="" disabled>—</option>}
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      )}
      {profile?.sells && (
        <div className={row} style={{ borderColor: COLORS.line }}>
          <label htmlFor="shop-name" className="flex flex-col">
            <span style={{ color: COLORS.ink }}>{t("account.prefs.shop")}</span>
            <span className="text-xs" style={{ color: COLORS.inkSoft }}>{t("account.prefs.shopHint")}</span>
          </label>
          <input id="shop-name" data-shop-name value={shop} maxLength={60} dir="auto" autoComplete="organization"
            onChange={(e) => setShop(e.target.value)}
            onBlur={() => { const v = shop.trim() || null; if (v !== (profile?.shop_name ?? null)) update({ shop_name: v }); }}
            className="w-full sm:w-64 px-3 py-2 rounded" style={inputStyle} />
        </div>
      )}
      {/* On this device only (M6), so it is not one of the saved profile fields. */}
      <div className="py-3 border-b" style={{ borderColor: COLORS.line }}><MotionSetting /></div>
      <div className="py-3 border-b" style={{ borderColor: COLORS.line }}><SoundSetting /></div>
      <div className={row} style={{ borderColor: COLORS.line }}>
        <Link to="/bench?tour=1" data-tour-again className="min-h-[44px] inline-flex items-center underline underline-offset-4" style={{ color: COLORS.actionText }}>{t("tour.again")}</Link>
      </div>
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
            className="px-4 py-2 rounded text-sm font-semibold" style={{ background: COLORS.amber, color: COLORS.onAmber }}>
            {t("account.data.json")}
          </button>
          {tables.map((table) => (
            <button key={table} type="button" onClick={() => download(`scent-handbook-${table}-${stamp()}.csv`, toCsv(data[table]), "text/csv;charset=utf-8")}
              className="px-4 py-2 rounded text-sm" style={buttonStyle}>
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
          className="mt-1 w-full px-3 py-2 rounded font-mono" style={inputStyle} />
      </label>
      <button type="submit" disabled={!matches || busy}
        className="px-5 py-2 rounded text-sm font-semibold disabled:opacity-40" style={{ background: COLORS.danger, color: COLORS.paper }}>
        {busy ? t("account.delete.working") : t("account.delete.button")}
      </button>
      {error && <p role="alert" className="text-sm mt-3" style={{ color: COLORS.danger }}>{error}</p>}
    </form>
  );
}
