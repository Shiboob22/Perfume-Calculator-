import React, { useState, useEffect } from 'react'
import { supabase, signInWithEmail, signInWithProvider } from '../lib/auth'

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [sentMagicLink, setSentMagicLink] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    // Check active sessions
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg(null)
    setSubmitting(true)
    try {
      await signInWithEmail(email)
      setSentMagicLink(true)
    } catch (err) {
      setErrorMsg(err.message || 'Failed to send magic link.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOAuth = async (provider) => {
    setErrorMsg(null)
    try {
      await signInWithProvider(provider)
    } catch (err) {
      setErrorMsg(err.message || `Failed to sign in with ${provider}.`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F6F0] flex items-center justify-center text-[#2C2A29] font-mono text-sm">
        Loading Scent Handbook...
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#F9F6F0] text-[#2C2A29] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-[#E5E0D8] p-8 shadow-sm rounded-none">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-block p-3 bg-[#F9F6F0] border border-[#E5E0D8] mb-3">
              {/* Flacon SVG Mark */}
              <svg className="w-6 h-6 text-[#1E3A2F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M10 2h4v3h-4zM9 5h6v4H9zM7 9h10v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9z" />
              </svg>
            </div>
            <h1 className="font-serif text-2xl font-medium tracking-wide text-[#1E3A2F]">The Scent Handbook</h1>
            <p className="text-xs font-mono uppercase tracking-widest text-[#78716C] mt-1">Authentication Required</p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-mono">
              {errorMsg}
            </div>
          )}

          {sentMagicLink ? (
            <div className="text-center py-6">
              <p className="font-serif text-lg mb-2 text-[#1E3A2F]">Check your inbox</p>
              <p className="text-xs text-[#78716C] font-mono mb-6">
                We sent a magic sign-in link to <span className="text-[#2C2A29]">{email}</span>.
              </p>
              <button
                onClick={() => setSentMagicLink(false)}
                className="text-xs font-mono text-[#1E3A2F] underline hover:text-black"
              >
                Use a different email or method
              </button>
            </div>
          ) : (
            <>
              {/* OAuth Providers */}
              <div className="space-y-3 mb-6">
                <button
                  onClick={() => handleOAuth('google')}
                  className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-[#E5E0D8] bg-white hover:bg-[#F9F6F0] text-xs font-mono uppercase tracking-wider text-[#2C2A29] transition-colors"
                >
                  <span>Continue with Google</span>
                </button>

                <button
                  onClick={() => handleOAuth('apple')}
                  className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-[#E5E0D8] bg-white hover:bg-[#F9F6F0] text-xs font-mono uppercase tracking-wider text-[#2C2A29] transition-colors"
                >
                  <span>Continue with Apple</span>
                </button>
              </div>

              <div className="flex items-center my-6">
                <div className="flex-grow border-t border-[#E5E0D8]"></div>
                <span className="px-3 text-xs font-mono text-[#78716C] uppercase">or magic link</span>
                <div className="flex-grow border-t border-[#E5E0D8]"></div>
              </div>

              {/* Magic Link Form */}
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#78716C] mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="hisham@oravue.com"
                    className="w-full px-3 py-2 bg-[#F9F6F0] border border-[#E5E0D8] text-sm text-[#2C2A29] focus:outline-none focus:border-[#1E3A2F]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 bg-[#1E3A2F] hover:bg-[#162A22] text-white text-xs font-mono uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Sending Link...' : 'Send Magic Link'}
                </button>
              </form>
            </>
          )}

        </div>
      </div>
    )
  }

  // App passes children as a render-prop function: <AuthGate>{(user) => ...}</AuthGate>.
  // Call it with the authenticated user. Returning the function directly makes
  // React try to render a function as a child (blank screen for logged-in users).
  return typeof children === 'function' ? children(session.user) : children
}