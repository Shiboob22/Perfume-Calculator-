import React, { useState, useEffect, lazy, Suspense } from "react";
import FlaconMark from "./components/FlaconMark";
import PerfumeSearch from "./components/PerfumeSearch";
import { COLORS } from "./lib/theme";
import AuthGate from "./components/AuthGate";
import { signOut } from "./lib/auth";

// Search is the landing tab and ships in the main bundle; the others load as
// separate chunks, fetched while the browser is idle after first paint so a
// tab switch never waits on the network.
const loaders = {
  calculator: () => import("./components/FragranceBlendCalculator"),
  batches: () => import("./components/Batches"),
  inventory: () => import("./components/Inventory"),
  ask: () => import("./components/PerfumerChat"),
};
const FragranceBlendCalculator = lazy(loaders.calculator);
const Batches = lazy(loaders.batches);
const Inventory = lazy(loaders.inventory);
const PerfumerChat = lazy(loaders.ask);

function prefetchTabs() {
  const run = () => Object.values(loaders).forEach((load) => load());
  if ("requestIdleCallback" in window) requestIdleCallback(run, { timeout: 3000 });
  else setTimeout(run, 1500);
}

const TABS = [
  { id: "search", label: "Search" },
  { id: "calculator", label: "Calculator" },
  { id: "batches", label: "Batches" },
  { id: "inventory", label: "Inventory" },
  { id: "ask", label: "Ask" },
];

export default function App() {
  useEffect(() => {
    if (window.location.hash && window.location.hash.includes('access_token')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const [activeTab, setActiveTab] = useState("search");
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
        <div className="min-h-screen" style={{ backgroundColor: COLORS.paper }}>
      <header className="max-w-3xl mx-auto px-6 sm:px-8 pt-10 pb-4">
        <div className="flex items-center gap-4 mb-6">
          <FlaconMark size={32} />
          <div className="flex-1">
            <h1
              className="text-2xl font-serif italic leading-tight"
              style={{ color: COLORS.forestDeep }}
            >
              The Scent Handbook
            </h1>
            <p className="text-xs font-mono tracking-wide mt-1" style={{ color: COLORS.inkSoft }}>
              Search · Calculator · Batches · Inventory · Ask
            </p>
          </div>
          <div className="text-right">
            {user?.email && (
              <div className="text-xs font-mono mb-1" style={{ color: COLORS.inkSoft }}>
                {user.email}
              </div>
            )}
            <button
              onClick={() => signOut()}
              className="text-xs font-mono hover:underline"
              style={{ color: COLORS.inkSoft }}
            >
              Sign out
            </button>
          </div>
        </div>

        <nav className="flex gap-2 border-b overflow-x-auto" style={{ borderColor: COLORS.line }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-2 text-xs font-mono uppercase tracking-wider -mb-px border-b-2 transition-colors whitespace-nowrap"
              style={{
                borderColor: activeTab === tab.id ? COLORS.forest : "transparent",
                color: activeTab === tab.id ? COLORS.forestDeep : COLORS.inkSoft,
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="pb-16">
        <Suspense fallback={<TabLoading />}>
        {activeTab === "search" && <PerfumeSearch onSelectPerfume={handleSelectPerfume} />}
        {activeTab === "calculator" && (
          <FragranceBlendCalculator
            selectedPerfume={selectedPerfume}
            onClearSelection={() => setSelectedPerfume(null)}
          />
        )}
        {activeTab === "batches" && <Batches />}
        {activeTab === "inventory" && <Inventory />}
        {/* Kept mounted so the conversation survives switching tabs. */}
        {(chatOpened || activeTab === "ask") && (
          <div hidden={activeTab !== "ask"}>
            <PerfumerChat />
          </div>
        )}
        </Suspense>
      </main>
    </div>
      )}
    </AuthGate>
  );
}

function TabLoading() {
  return (
    <div className="max-w-3xl mx-auto px-6 sm:px-8 py-10 text-xs font-mono" style={{ color: COLORS.inkSoft }}>
      Loading…
    </div>
  );
}
