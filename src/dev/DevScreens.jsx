// Development only (never in a production build — see Root.jsx): renders an
// app screen without signing in, for visual checks. Calls to /api fail
// quietly here; nothing is saved.
import React, { lazy, Suspense } from "react";
import { useParams } from "react-router-dom";
import { COLORS } from "../lib/theme";
import { EntitlementsProvider } from "../lib/useEntitlements";
import LanguageToggle from "../components/LanguageToggle";
import DigitToggle from "../components/DigitToggle";

const SCREENS = {
  calculator: lazy(() => import("../components/FragranceBlendCalculator")),
  batches: lazy(() => import("../components/Batches")),
  inventory: lazy(() => import("../components/Inventory")),
  ask: lazy(() => import("../components/PerfumerChat")),
  search: lazy(() => import("../components/PerfumeSearch")),
  bench: lazy(() => import("../components/BenchMode")),
  onboarding: lazy(() => import("../components/Onboarding")),
  account: lazy(() => import("../components/Account")),
};

const DEV_USER = { email: "preview@example.com" };

export default function DevScreens() {
  const { screen } = useParams();
  const Screen = SCREENS[screen] || SCREENS.calculator;
  return (
    <EntitlementsProvider>
      <div className="min-h-screen" style={{ backgroundColor: COLORS.paper }}>
        <div className="flex gap-4 justify-end p-3 text-xs font-mono" style={{ color: COLORS.dim }}>
          dev preview · not signed in <DigitToggle /> <LanguageToggle />
        </div>
        <Suspense fallback={null}><Screen user={DEV_USER} /></Suspense>
      </div>
    </EntitlementsProvider>
  );
}
