import React, { useEffect, useState } from "react";
import { COLORS } from "../lib/theme";
import FlaconMark from "./FlaconMark";
import { getSession, onAuthChange, signInWithEmail, signInWithGoogle, signInWithApple } from "../lib/auth";

function OAuthButton({ onClick, children, dark }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full px-4 py-2.5 text-sm font-semibold border mb-2"
      style={
        dark
          ? { backgroundColor: "#111", color: "#fff", borderColor: "#111" }
          : { backgroundColor: "#fff", color: COLORS.ink, borderColor: COLORS.line }
      }
    >
      {children}
    </button>
  );
}

export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null); // null | 'sending' | 'sent' | 'error'
  const [error, setError] = useState("");
  const [oauthError, setOauthError] = useState("");

  useEffect(() => {
    getSession().then(setSession).catch(() => setSession(null));
    const unsubscribe = onAuthChange(setSession);
    return unsubscribe;
  }, []);

  async function handleSignIn(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setError("");
    try {
      await signInWithEmail(email.trim());
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(err.message || "Could not send sign-in link.");
    }
  }

  async function handleOAuth(fn) {
    setOauthError("");
    try {
      await fn();
      // browser redirects away to the provider from here — nothing more to do
    } catch (err) {
      setOauthError(err.message || "Sign-in failed.");
    }
  }

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: COLORS.paper }}>
        <p className="text-sm font-mono" style={{ color: COLORS.inkSoft }}>Loading…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: COLORS.paper }}>
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3 mb-8 justify-center">
            <FlaconMark size={30} />
            <h1 className="text-xl font-serif italic" style={{ color: COLORS.forestDeep }}>The Scent Handbook</h1>
          </div>

          <div className="p-5 border" style={{ borderColor: COLORS.line, backgroundColor: COLORS.card }}>
            <OAuthButton onClick={() => handleOAuth(signInWithGoogle)}>Continue with Google</OAuthButton>
            <OAuthButton onClick={() => handleOAuth(signInWithApple)} dark>Continue with Apple</OAuthButton>

            {oauthError && (
              <p className="text-xs mt-1 mb-2" style={{ color: "#8C4A3A" }}>{oauthError}</p>
            )}

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px" style={{ backgroundColor: COLORS.line }} />
              <span className="text-xs font-mono" style={{ color: COLORS.inkSoft }}>or</span>
              <div className="flex-1 h-px" style={{ backgroundColor: COLORS.line }} />
            </div>

            {status === "sent" ? (
              <div className="text-center">
                <p className="text-sm" style={{ color: COLORS.ink }}>
                  Check <b>{email}</b> for a sign-in link.
                </p>
                <button
                  type="button"
                  onClick={() => setStatus(null)}
                  className="text-xs font-mono underline mt-3"
                  style={{ color: COLORS.inkSoft }}
                >
                  Use a different email
                </button>
              </div>
            ) : (
              <form onSubmit={handleSignIn}>
                <label className="block text-xs font-semibold mb-2" style={{ color: COLORS.inkSoft }}>
                  Sign in with email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 font-mono text-sm border focus:outline-none focus:ring-2 mb-3"
                  style={{ borderColor: COLORS.line, color: COLORS.ink, backgroundColor: "#fff" }}
                />
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="w-full px-4 py-2 text-sm font-semibold disabled:opacity-50"
                  style={{ backgroundColor: COLORS.forest, color: "#fff" }}
                >
                  {status === "sending" ? "Sending…" : "Send sign-in link"}
                </button>
                {status === "error" && (
                  <p className="text-xs mt-2" style={{ color: "#8C4A3A" }}>{error}</p>
                )}
                <p className="text-xs mt-3" style={{ color: COLORS.inkSoft }}>
                  No password — we'll email you a one-time link.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return children(session.user);
}
