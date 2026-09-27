import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { inject } from "@vercel/analytics";
import Root from "./Root";
import "@fontsource/cormorant-garamond/latin-500.css";
import "@fontsource/cormorant-garamond/latin-600.css";
import "@fontsource/cormorant-garamond/latin-700.css";
import "@fontsource/cormorant-garamond/latin-500-italic.css";
import "@fontsource/cormorant-garamond/latin-600-italic.css";
import "@fontsource/space-grotesk/latin-400.css";
import "@fontsource/space-grotesk/latin-500.css";
import "@fontsource/space-grotesk/latin-600.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "./index.css";

const tree = (
  <React.StrictMode>
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  </React.StrictMode>
);

// Public pages arrive prerendered: hydrate them. The app (/app) arrives as an
// empty shell: render it.
const el = document.getElementById("root");
if (el.hasChildNodes()) hydrateRoot(el, tree);
else createRoot(el).render(tree);

// Offline support (built by scripts/build-sw.mjs; production builds only).
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}

// Vercel Web Analytics: page views only, no cookies. The URL is sent without
// its hash (a sign-in link briefly carries tokens there) and, inside the app,
// without its query string.
if (import.meta.env.PROD) {
  inject({
    beforeSend(event) {
      const url = new URL(event.url);
      url.hash = "";
      if (url.pathname.startsWith("/app")) url.search = "";
      return { ...event, url: url.toString() };
    },
  });
}
