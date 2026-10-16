import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { inject } from "@vercel/analytics";
import Root from "./Root";
import { isAppPath } from "./routes";
import { applyFlagLink } from "./lib/flags";
// Newsreader (display and voice; optical-size axis), Hanken Grotesk (interface), figures are Hanken with tabular numerals.
import "@fontsource-variable/newsreader/opsz.css";
import "@fontsource-variable/newsreader/opsz-italic.css";
import "@fontsource-variable/hanken-grotesk/wght.css";
import "./index.css";

// A sign-in link that lands on a public page (Supabase falls back to the
// Site URL when /app isn't an allowed redirect) carries its tokens in the
// hash; public pages never load the auth client, so hand it to the app.
if (!isAppPath(location.pathname) && /(^|[#&])(access_token|error_description)=/.test(location.hash)) {
  location.replace(`/app${location.search}${location.hash}`);
}

// ?flag=wardrobe / ?unflag=wardrobe: try a flagged room on this device.
applyFlagLink(location.search);

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
      if (isAppPath(url.pathname)) url.search = "";
      return { ...event, url: url.toString() };
    },
  });
}
