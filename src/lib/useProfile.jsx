import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getProfile, saveProfile } from "./accountApi";

// The signed-in user's profile (onboarding answers and preferences).
// If it can't be loaded — offline, say — the app carries on with defaults
// and does not show onboarding: a first-run screen must never block the
// calculator at the bench.
const PROFILE_TIMEOUT_MS = 3000;

const ProfileContext = createContext({ profile: null, loaded: false, failed: false, save: async () => {}, keepLocally: () => {} });

export function ProfileProvider({ children }) {
  const [state, setState] = useState({ profile: null, loaded: false, failed: false });

  useEffect(() => {
    let cancelled = false;
    // Give up after a few seconds on a slow connection rather than hold the
    // app back; the calculator then opens at its plain defaults.
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), PROFILE_TIMEOUT_MS));
    Promise.race([getProfile(), timeout])
      .then((profile) => { if (!cancelled) setState({ profile, loaded: true, failed: false }); })
      .catch(() => { if (!cancelled) setState({ profile: null, loaded: true, failed: true }); });
    return () => { cancelled = true; };
  }, []);

  const save = useCallback(async (changes) => {
    const profile = await saveProfile(changes);
    setState({ profile, loaded: true, failed: false });
    return profile;
  }, []);

  // When saving fails (offline at the bench), keep the answers for this
  // visit only, so onboarding can't trap the user; it asks again next time.
  const keepLocally = useCallback((changes) => {
    setState((prev) => ({ ...prev, profile: { ...prev.profile, ...changes } }));
  }, []);

  return <ProfileContext.Provider value={{ ...state, save, keepLocally }}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  return useContext(ProfileContext);
}

// True once the profile has loaded and the user has never finished (or
// skipped) the first-run questions.
export function needsOnboarding({ loaded, failed, profile }) {
  return loaded && !failed && !profile?.onboarded_at;
}
