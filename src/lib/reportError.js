// Client error reports: what broke, where, in which build. Sent to /api/log,
// which writes them to the Vercel runtime logs. Never includes the user's
// email, the URL's query or hash (sign-in tokens pass through the hash), or
// anything they typed.

const MAX_PER_PAGE = 10;
const seen = new Set();

export function errorPayload(error, { componentStack, path } = {}) {
  const message = String(error?.message || error || "Unknown error").slice(0, 500);
  return {
    message,
    name: String(error?.name || "Error").slice(0, 100),
    stack: String(error?.stack || "").slice(0, 4000),
    componentStack: String(componentStack || "").slice(0, 2000),
    path: String(path || "").split(/[?#]/)[0].slice(0, 200),
    release: import.meta.env?.VITE_RELEASE || "dev",
  };
}

export function reportError(error, extra = {}) {
  if (typeof window === "undefined") return;
  const payload = errorPayload(error, { path: window.location.pathname, ...extra });
  // The same error in a render loop is reported once.
  const key = `${payload.name}:${payload.message}`;
  if (seen.has(key) || seen.size >= MAX_PER_PAGE) return;
  seen.add(key);
  if (!import.meta.env?.PROD) return;
  const body = JSON.stringify(payload);
  try {
    if (!navigator.sendBeacon?.("/api/log", new Blob([body], { type: "application/json" }))) {
      fetch("/api/log", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
    }
  } catch {}
}

// Errors outside React's render (event handlers, promises) in the app.
export function installGlobalHandlers() {
  const onError = (e) => reportError(e.error || e.message);
  const onRejection = (e) => reportError(e.reason);
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}
