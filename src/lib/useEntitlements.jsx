import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authHeaders, apiError } from "./fragranceApi";
import { FALLBACK } from "./entitlements";

// The signed-in user's plan and usage from /api/me. Until it loads (or if it
// fails) the app assumes Free: features are hidden, never wrongly offered.
// The server checks every gated action again on its own.
const EntitlementsContext = createContext({ ...FALLBACK, batchesUsed: 0, loaded: false, refresh: () => {} });

export function EntitlementsProvider({ children }) {
  const [state, setState] = useState({ ...FALLBACK, batchesUsed: 0, loaded: false });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/me", { headers: await authHeaders() });
      if (!res.ok) throw await apiError(res);
      setState({ ...(await res.json()), loaded: true });
    } catch {
      setState((prev) => ({ ...prev, loaded: true }));
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return <EntitlementsContext.Provider value={{ ...state, refresh }}>{children}</EntitlementsContext.Provider>;
}

// Fixed entitlements, for the /dev previews only (?pro=1).
export function StaticEntitlements({ value, children }) {
  return <EntitlementsContext.Provider value={{ batchesUsed: 0, loaded: true, refresh: () => {}, ...value }}>{children}</EntitlementsContext.Provider>;
}

export function useEntitlements() {
  return useContext(EntitlementsContext);
}
