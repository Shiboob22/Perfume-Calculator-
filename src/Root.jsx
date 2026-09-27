import React, { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { I18nProvider } from "./i18n/I18nProvider";
import PublicLayout from "./site/PublicLayout";
import Home from "./site/Home";
import Pricing from "./site/Pricing";
import GuidesIndex from "./site/GuidesIndex";
import GuidePage from "./site/GuidePage";
import NotFound from "./site/NotFound";
import { COLORS } from "./lib/theme";

// The signed-in app is its own chunk: public pages (prerendered, crawlable)
// never load Supabase, the catalog search or the calculator.
const App = lazy(() => import("./App"));

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
        <Route path="*" element={<NotFound />} />
      </Routes>
    </PublicLayout>
  );
}

export default function Root() {
  return (
    <Routes>
      <Route path="/app/:tab?" element={<I18nProvider><Suspense fallback={<AppLoading />}><App /></Suspense></I18nProvider>} />
      <Route path="/ar/*" element={<I18nProvider locale="ar"><PublicRoutes /></I18nProvider>} />
      <Route path="/*" element={<I18nProvider locale="en"><PublicRoutes /></I18nProvider>} />
    </Routes>
  );
}
