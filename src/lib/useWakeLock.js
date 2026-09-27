import { useEffect, useState } from "react";

// Keeps the screen on while `active` (bench mode). Browsers release the lock
// when the page is hidden, so it is taken again on return. Returns whether
// the browser supports it at all.
export function useWakeLock(active) {
  const supported = typeof navigator !== "undefined" && "wakeLock" in navigator;
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (!active || !supported) return undefined;
    let lock = null;
    let cancelled = false;
    async function take() {
      try {
        lock = await navigator.wakeLock.request("screen");
        if (cancelled) { lock.release(); return; }
        setHeld(true);
        lock.addEventListener("release", () => setHeld(false));
      } catch {
        setHeld(false); // e.g. battery saver; bench mode still works
      }
    }
    const onVisible = () => { if (document.visibilityState === "visible") take(); };
    take();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => {});
    };
  }, [active, supported]);

  return { supported, held };
}
