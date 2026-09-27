import React, { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { I18nProvider } from "./i18n/I18nProvider";
import PublicLayout from "./site/PublicLayout";
import Home from "./site/Home";
import Pricing from "./site/Pricing";
import GuidesIndex from "./site/GuidesIndex";
import GuidePage from "./site/GuidePage";
import NotFound from "./site/NotFound";
import LegalPage from "./site/LegalPage";
import { COLORS } from "./lib/theme";
import ErrorBoundary from "./components/ErrorBoundary";

// The signed-in app is its own chunk: public pages (prerendered, crawlable)
// never load Supabase, the catalog search or the calculator.
const App = lazy(() => import("./App"));
// Dev-only screen previews; `import.meta.env.DEV` is false in production
// builds, so this route and its chunk are dropped there.
const DevScreens = import.meta.env.DEV ? lazy(() => import("./dev/DevScreens")) : null;

function AppLoading() {
  return <div className="min-h-screen" style={{ backgroundColor: COLORS.paper }} />;
}

function PublicRoutes() {
  return (
    <PublicLayout>
      <Routes>
        <Route index element={<Home />} />
        <Route path="pricing" element={<Pricing />} />
        <Route path="guides" element={<GuidesIndex />} />
        <Route path="guides/:slug" element={<GuidePage />} />
        <Route path="privacy" element={<LegalPage page="privacy" />} />
        <Route path="terms" element={<LegalPage page="terms" />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </PublicLayout>
  );
}

export default function Root() {
  return (
    <Routes>
      <Route path="/app/:tab?" element={<I18nProvider><ErrorBoundary><Suspense fallback={<AppLoading />}><App /></Suspense></ErrorBoundary></I18nProvider>} />
      {DevScreens && (
        <Route path="/dev/:screen?" element={<I18nProvider><Suspense fallback={<AppLoading />}><DevScreens /></Suspense></I18nProvider>} />
      )}
      <Route path="/ar/*" element={<I18nProvider locale="ar"><PublicRoutes /></I18nProvider>} />
      <Route path="/*" element={<I18nProvider locale="en"><PublicRoutes /></I18nProvider>} />
    </Routes>
  );
}
