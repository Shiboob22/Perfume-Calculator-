import React, { useState, useEffect, lazy, Suspense } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { flagOn } from "./lib/flags";
import { tabFromPath, tabPath } from "./routes";
import RenameNotice from "./components/kx/RenameNotice";
import { SiteFooter, SiteHeader } from "./components/SiteChrome";
import PerfumeSearch from "./components/PerfumeSearch";
import { COLORS } from "./lib/theme";
import AuthGate from "./components/AuthGate";
import { signOut } from "./lib/auth";
import { useI18n, hasLocalChoice } from "./i18n/I18nProvider";
import LanguageToggle from "./components/LanguageToggle";
import DigitToggle from "./components/DigitToggle";
import ProLocked from "./components/ProLocked";
import { EntitlementsProvider, useEntitlements } from "./lib/useEntitlements";
import { ProfileProvider, useProfile, needsOnboarding } from "./lib/useProfile";
import { can } from "./lib/entitlements";
import { fetchPopular, warmUp } from "./lib/searchApi";
import { flush } from "./lib/outbox";
import { logBatch, listBatches, saveCheckIn } from "./lib/fragranceApi";
import { dueNow, JOURNAL_CHANGED } from "./lib/journal";
import { installGlobalHandlers } from "./lib/reportError";

// Search ships with the app shell; the other tabs load as separate chunks,
// fetched while the browser is idle after first paint so a tab switch never
// waits on the network.
const loaders = {
  selector: () => import("./components/Selector"),
  calculator: () => import("./components/FragranceBlendCalculator"),
  batches: () => import("./components/Batches"),
  inventory: () => import("./components/Inventory"),
  ask: () => import("./components/PerfumerChat"),
};
const Selector = lazy(loaders.selector);
const FragranceBlendCalculator = lazy(loaders.calculator);
const Batches = lazy(loaders.batches);
const Inventory = lazy(loaders.inventory);
const PerfumerChat = lazy(loaders.ask);
const BenchMode = lazy(() => import("./components/BenchMode"));
const BenchCards = lazy(() => import("./components/BenchCards"));
const Account = lazy(() => import("./components/Account"));
const Labels = lazy(() => import("./components/Labels"));
const Wardrobe = lazy(() => import("./components/wardrobe/Wardrobe"));
const Atlas = lazy(() => import("./components/atlas/Atlas"));
const Salon = lazy(() => import("./components/salon/Salon"));
const Onboarding = lazy(() => import("./components/Onboarding"));

function prefetchTabs() {
  const run = () => Object.values(loaders).forEach((load) => load());
  if ("requestIdleCallback" in window) requestIdleCallback(run, { timeout: 3000 });
  else setTimeout(run, 1500);
}

const TABS = ["search", "selector", "calculator", "batches", "inventory", "ask"];
const DEFAULT_TAB = "calculator";

// The signed-in app: /bench (calculator), /bench/journal (batches), /app/<tab>.
export default function App() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { tab: param } = useParams();
  const { pathname } = useLocation();
  const tab = tabFromPath(pathname, param);
  // cards and account are pages of their own, reached from links, not tabs.
  const activeTab = TABS.includes(tab) ? tab : tab === "cards" || tab === "account" || tab === "labels" || tab === "wardrobe" || tab === "atlas" || tab === "salon" ? null : DEFAULT_TAB;
  const wardrobeOn = flagOn("wardrobe");
  const atlasOn = flagOn("atlas");
  const salonOn = flagOn("salon");
  const setActiveTab = (id) => navigate(`${tabPath(id)}${id === "calculator" ? window.location.search : ""}`);

  // Start the search tab's popular shelf and wake the catalog functions
  // while the session is being checked.
  useEffect(() => { fetchPopular(); warmUp(); }, []);
  useEffect(installGlobalHandlers, []);

  // Each tab is its own page to screen readers and the tab switcher.
  const page = activeTab ?? tab;
  const pageHeading = page === "selector" || page === "account" || page === "wardrobe" || page === "atlas" || page === "salon" ? null
    : TABS.includes(page) ? t(`app.tabs.${page}`) : page === "labels" ? t("labels.title") : page === "cards" ? t("cards.open") : null;
  useEffect(() => {
    const name = TABS.includes(page) ? t(`app.tabs.${page}`) : page === "account" ? t("account.title") : page === "labels" ? t("labels.title") : page === "wardrobe" ? t("wardrobe.title") : page === "atlas" ? t("atlas.title") : page === "salon" ? t("salon.title") : null;
    document.title = name ? `${name} — ${t("brand")}` : t("brand");
  }, [page, t]);

  // Batches logged without a connection are sent when the app opens and
  // whenever the connection returns.
  useEffect(() => {
    // Refused batches are kept (see outbox.js); tell the Batches tab.
    // Queued journal check-ins go with them, in order; a point answered
    // meanwhile on another device counts as sent.
    const sendCheckIn = (c) => saveCheckIn(c).catch((e) => { if (e.code !== "already_answered") throw e; });
    const send = () => flush({ batch: logBatch, checkin: sendCheckIn })
      .then((r) => { if (r.refused.length) window.dispatchEvent(new Event("sh-outbox-refused")); })
      .catch(() => {});
    send();
    window.addEventListener("online", send);
    return () => window.removeEventListener("online", send);
  }, []);
  // Check-ins due, for the badge on the Batches tab: counted once signed in
  // (CountDueCheckIns), then kept in step by the Batches tab itself.
  const [dueCount, setDueCount] = useState(0);
  useEffect(() => {
    const update = (e) => setDueCount(e.detail?.due ?? 0);
    window.addEventListener(JOURNAL_CHANGED, update);
    return () => window.removeEventListener(JOURNAL_CHANGED, update);
  }, []);
  useEffect(() => {
    if (window.location.hash && window.location.hash.includes('access_token')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  const [selectedPerfume, setSelectedPerfume] = useState(null);
  // The chat stays mounted once opened, so it survives tab switches.
  const [chatOpened, setChatOpened] = useState(false);
  useEffect(() => { if (activeTab === "ask") setChatOpened(true); }, [activeTab]);
  useEffect(prefetchTabs, []);

  function handleSelectPerfume(perfume) {
    setSelectedPerfume(perfume);
    setActiveTab("calculator");
  }

  return (
    <AuthGate>
      {(user) => (
        <EntitlementsProvider>
        <ProfileProvider>
        <OnboardingGate>
        <CountDueCheckIns />
        {tab === "bench" ? (
          // Bench mode is full screen: no header or tabs at the scale.
          <Suspense fallback={<TabLoading />}><BenchMode /></Suspense>
        ) : (
        <div className="min-h-screen" style={{ backgroundColor: COLORS.paper }}>
      <SiteHeader zone="app" active={activeTab === "calculator" ? "calculator" : activeTab === "batches" ? "journal" : tab === "wardrobe" ? "wardrobe" : tab === "atlas" ? "atlas" : tab === "salon" ? "salon" : undefined}
        wardrobe={wardrobeOn} atlas={atlasOn} salon={salonOn}
        language={<><LanguageToggle /><DigitToggle /></>}
        extra={<>
          <button type="button" onClick={() => navigate("/app/account")}
            className="text-sm hover:underline underline-offset-4 min-h-[44px]"
            style={{ color: tab === "account" ? COLORS.forest : COLORS.inkSoft }}
            aria-current={tab === "account" ? "page" : undefined}>
            {t("account.link")}
          </button>
          <button type="button" onClick={() => signOut()} className="text-sm hover:underline underline-offset-4 min-h-[44px]" style={{ color: COLORS.inkSoft }}>
            {t("app.signOut")}
          </button>
        </>} />
      <header className="max-w-3xl mx-auto px-4 sm:px-8 pt-6">
        <nav aria-label={t("app.tabsLabel")} className="relative flex gap-2 border-b overflow-x-auto" style={{ borderColor: COLORS.line }}>
          {TABS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              aria-current={activeTab === id ? "page" : undefined}
              className="px-3 py-2 text-sm -mb-px border-b-2 transition-colors whitespace-nowrap"
              style={{
                borderColor: activeTab === id ? COLORS.forest : "transparent",
                color: activeTab === id ? COLORS.forestDeep : COLORS.inkSoft,
              }}
            >
              {t(`app.tabs.${id}`)}
              {id === "batches" && dueCount > 0 && (
                <span className="ms-1.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-none text-[11px] font-semibold align-middle"
                  style={{ background: COLORS.amber, color: COLORS.onAmber }}>
                  <span aria-hidden="true">{dueCount}</span>
                  <span className="sr-only">{t("journal.tabBadge", { count: dueCount })}</span>
                </span>
              )}
            </button>
          ))}
        </nav>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-4 empty:hidden"><RenameNotice /></div>
      <main className="pb-16">
        {/* One h1 per page for screen readers; Selector and Account title themselves. */}
        {pageHeading && <h1 className="sr-only">{pageHeading}</h1>}
        <Suspense fallback={<TabLoading />}>
        {tab === "cards" && <BenchCards />}
        {tab === "atlas" && (atlasOn ? <Atlas /> : <Navigate to="/bench" replace />)}
        {tab === "salon" && (salonOn ? <Salon /> : <Navigate to="/bench" replace />)}
        {tab === "wardrobe" && (wardrobeOn ? <Wardrobe /> : <Navigate to="/bench" replace />)}
        {tab === "account" && <Account user={user} />}
        {tab === "labels" && <Labels />}
        {tab !== "cards" && activeTab === "search" && <PerfumeSearch onSelectPerfume={handleSelectPerfume} />}
        {activeTab === "selector" && <Selector onSelectPerfume={handleSelectPerfume} />}
        {activeTab === "calculator" && (
          <FragranceBlendCalculator
            selectedPerfume={selectedPerfume}
            onClearSelection={() => setSelectedPerfume(null)}
          />
        )}
        {activeTab === "batches" && <Batches />}
        {activeTab === "inventory" && <Gate feature="inventory"><Inventory /></Gate>}
        {/* Kept mounted so the conversation survives switching tabs. */}
        {(chatOpened || activeTab === "ask") && (
          <div hidden={activeTab !== "ask"}>
            <Gate feature="ai.ask"><PerfumerChat /></Gate>
          </div>
        )}
        </Suspense>
      </main>
      <SiteFooter />
    </div>
        )}
        </OnboardingGate>
        </ProfileProvider>
        </EntitlementsProvider>
      )}
    </AuthGate>
  );
}

// New accounts answer three questions before the app opens. The app waits
// for the profile (capped at a few seconds in ProfileProvider) so the
// calculator opens at the saved bottle and new users never see it flash
// up before the questions.
function OnboardingGate({ children }) {
  const profile = useProfile();
  const { setLocale, setDigits } = useI18n();
  // Language and digits saved to the account follow the user to a new
  // device (one with no choice of its own yet).
  const saved = profile.profile;
  useEffect(() => {
    if (saved?.locale && !hasLocalChoice("locale")) setLocale(saved.locale);
    if (saved?.digits && !hasLocalChoice("digits")) setDigits(saved.digits);
  }, [saved?.locale, saved?.digits, setLocale, setDigits]);
  if (!profile.loaded) return <TabLoading />;
  if (needsOnboarding(profile)) return <Suspense fallback={<TabLoading />}><Onboarding /></Suspense>;
  return children;
}

// A tab whose feature the plan doesn't include shows the Pro panel instead.
// Nothing is shown until the plan has loaded, so Free users never see a
// feature flash up and then disappear.
function Gate({ feature, children }) {
  const entitlements = useEntitlements();
  if (!entitlements.loaded) return <TabLoading />;
  return can(entitlements, feature) ? children : <ProLocked feature={feature} />;
}

// Counts the check-ins due once there is a session (it renders nothing).
// Inside AuthGate on purpose: asking for batches before sign-in would make
// the auth client read, and clear, a sign-in link's #access_token first.
function CountDueCheckIns() {
  // Check-ins are Pro: on Free nothing is ever "due".
  const allowed = can(useEntitlements(), "journal.checkins");
  useEffect(() => {
    if (!allowed) return;
    listBatches(100)
      .then((b) => window.dispatchEvent(new CustomEvent(JOURNAL_CHANGED, { detail: { due: dueNow(b).length } })))
      .catch(() => {});
  }, [allowed]);
  return null;
}

function TabLoading() {
  const { t } = useI18n();
  return (
    <div className="max-w-3xl mx-auto px-6 sm:px-8 py-10 text-xs font-mono" style={{ color: COLORS.inkSoft }}>
      {t("app.loading")}
    </div>
  );
}
