import React, { useState } from "react";
import FlaconMark from "./components/FlaconMark";
import PerfumeSearch from "./components/PerfumeSearch";
import FragranceBlendCalculator from "./components/FragranceBlendCalculator";
import Batches from "./components/Batches";
import Inventory from "./components/Inventory";
import { COLORS } from "./lib/theme";
import AuthGate from "./components/AuthGate";
import { signOut } from "./lib/auth";

const TABS = [
  { id: "search", label: "Search" },
  { id: "calculator", label: "Calculator" },
  { id: "batches", label: "Batches" },
  { id: "inventory", label: "Inventory" },
];

export default function App() {
  useEffect(() => {
    if (window.location.hash && window.location.hash.includes('access_token')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const [activeTab, setActiveTab] = useState("search");
  const [selectedPerfume, setSelectedPerfume] = useState(null);

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
              Search · Calculator · Batches · Inventory
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
              className="px-4 py-2 text-sm font-semibold -mb-px border-b-2 transition-colors whitespace-nowrap"
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
        {activeTab === "search" && <PerfumeSearch onSelectPerfume={handleSelectPerfume} />}
        {activeTab === "calculator" && (
          <FragranceBlendCalculator
            selectedPerfume={selectedPerfume}
            onClearSelection={() => setSelectedPerfume(null)}
          />
        )}
        {activeTab === "batches" && <Batches />}
        {activeTab === "inventory" && <Inventory />}
      </main>
    </div>
      )}
    </AuthGate>
  );
}
