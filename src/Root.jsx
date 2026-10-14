import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
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
const Styleguide = import.meta.env.DEV ? lazy(() => import("./dev/Styleguide")) : null;

function AppLoading() {
  return <div className="min-h-screen" style={{ backgroundColor: COLORS.paper }} />;
}

// Old /guides/<slug> links, for client-side navigation and `vite dev`; on the
// server the same move is a 301 (vercel.json).
function GuideRedirect() {
  const { pathname, search } = useLocation();
  return <Navigate to={pathname.replace(/\/guides(?=\/|$)/, "/library") + search} replace />;
}

function PublicRoutes() {
  return (
    <PublicLayout>
      <Routes>
        <Route index element={<Home />} />
        <Route path="pricing" element={<Pricing />} />
        <Route path="library" element={<GuidesIndex />} />
        <Route path="library/:slug" element={<GuidePage />} />
        <Route path="guides/*" element={<GuideRedirect />} />
        <Route path="privacy" element={<LegalPage page="privacy" />} />
        <Route path="terms" element={<LegalPage page="terms" />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </PublicLayout>
  );
}

const appElement = (
  <I18nProvider><ErrorBoundary><Suspense fallback={<AppLoading />}><App /></Suspense></ErrorBoundary></I18nProvider>
);

export default function Root() {
  return (
    <Routes>
      <Route path="/app/:tab?" element={appElement} />
      <Route path="/bench" element={appElement} />
      <Route path="/bench/journal" element={appElement} />
      {DevScreens && (
        <Route path="/dev/:screen?" element={<I18nProvider><Suspense fallback={<AppLoading />}><DevScreens /></Suspense></I18nProvider>} />
      )}
      {Styleguide && (
        <>
          <Route path="/styleguide" element={<I18nProvider locale="en"><Suspense fallback={<AppLoading />}><Styleguide /></Suspense></I18nProvider>} />
          <Route path="/ar/styleguide" element={<I18nProvider locale="ar"><Suspense fallback={<AppLoading />}><Styleguide /></Suspense></I18nProvider>} />
        </>
      )}
      <Route path="/ar/*" element={<I18nProvider locale="ar"><PublicRoutes /></I18nProvider>} />
      <Route path="/*" element={<I18nProvider locale="en"><PublicRoutes /></I18nProvider>} />
    </Routes>
  );
}
