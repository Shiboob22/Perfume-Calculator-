import React, { useState, useEffect, useRef } from 'react'
import { isAuthRetryableFetchError } from '@supabase/auth-js'
import { supabase, signInWithEmail, signInWithProvider } from '../lib/auth'
import { AUTH_STORAGE_KEY } from '../lib/supabaseClient'
import { COLORS } from '../lib/theme'
import { useI18n } from '../i18n/I18nProvider'
import { errorText } from '../i18n/errorText';
import LanguageToggle from './LanguageToggle'
import FlaconMark from './FlaconMark'

// The session saved by the last visit, read synchronously so a returning user
// sees the app on first render. getSession() below still confirms it — and
// refreshes an expired token, a network round trip we no longer wait on; if
// the refresh fails, the auth listener signs the user out.
function storedSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY))
    return saved?.user && saved?.access_token ? saved : null
  } catch {
    return null
  }
}

export default function AuthGate({ children }) {
  const { t } = useI18n()
  const [session, setSession] = useState(storedSession)
  const [loading, setLoading] = useState(() => !session)
  const inboxRef = useRef(null)
  const [email, setEmail] = useState('')
  const [sentMagicLink, setSentMagicLink] = useState(false)
  // The form (and its focused button) is replaced by "Check your inbox":
  // move focus there so screen readers announce it.
  useEffect(() => { if (sentMagicLink) inboxRef.current?.focus() }, [sentMagicLink])
  const [errorMsg, setErrorMsg] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    // Check active sessions
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      // No connection (e.g. at the bench): keep the saved session instead of
      // signing out; the token refreshes once the connection is back.
      if (error && isAuthRetryableFetchError(error)) {
        setLoading(false)
        return
      }
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
      setErrorMsg(errorText(t, err, 'auth.sendFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleOAuth = async (provider) => {
    setErrorMsg(null)
    try {
      await signInWithProvider(provider)
    } catch (err) {
      setErrorMsg(err.message || t('auth.oauthFailed', { provider }))
    }
  }

  const oauthBtn = {
    borderColor: COLORS.line,
    color: COLORS.ink,
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono text-sm"
        style={{ background: COLORS.paper, color: COLORS.inkSoft }}>
        {t('auth.loading')}
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: COLORS.paper }}>
        <div className="w-full max-w-md p-8 rounded-2xl" style={{ background: COLORS.card, border: `1px solid ${COLORS.line}` }}>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <FlaconMark size={34} />
            </div>
            <h1 className="font-serif italic text-3xl" style={{ color: COLORS.forestDeep }}>{t('brand')}</h1>
            <p className="text-[11px] font-mono uppercase tracking-[0.28em] rtl:tracking-normal mt-2" style={{ color: COLORS.amberDeep }}>{t('auth.signIn')}</p>
          </div>

          {errorMsg && (
            <div role="alert" className="mb-4 p-3 text-xs font-mono rounded-lg" style={{ border: `1px solid ${COLORS.danger}`, color: COLORS.danger, background: COLORS.dangerBg }}>
              {errorMsg}
            </div>
          )}

          {sentMagicLink ? (
            <div className="text-center py-6">
              <h2 ref={inboxRef} tabIndex={-1} className="font-serif italic rtl:not-italic text-xl mb-2" style={{ color: COLORS.forestDeep }}>{t('auth.checkInbox')}</h2>
              <p className="text-xs font-mono mb-6" style={{ color: COLORS.inkSoft }}>
                {t('auth.sentLinkTo')} <span dir="ltr" style={{ color: COLORS.ink }}>{email}</span>.
              </p>
              <button
                onClick={() => setSentMagicLink(false)}
                className="text-xs font-mono underline"
                style={{ color: COLORS.amber }}
              >
                {t('auth.useDifferent')}
              </button>
            </div>
          ) : (
            <>
              {/* OAuth Providers */}
              <div className="space-y-3 mb-6">
                <button
                  onClick={() => handleOAuth('google')}
                  className="w-full py-2.5 px-4 border rounded-lg text-xs font-mono uppercase tracking-wider rtl:tracking-normal transition-colors"
                  style={oauthBtn}
                >
                  {t('auth.continueGoogle')}
                </button>
                <button
                  onClick={() => handleOAuth('apple')}
                  className="w-full py-2.5 px-4 border rounded-lg text-xs font-mono uppercase tracking-wider rtl:tracking-normal transition-colors"
                  style={oauthBtn}
                >
                  {t('auth.continueApple')}
                </button>
              </div>

              <div className="flex items-center my-6">
                <div className="flex-grow border-t" style={{ borderColor: COLORS.line }}></div>
                <span className="px-3 text-[11px] font-mono uppercase" style={{ color: COLORS.dim }}>{t('auth.orMagicLink')}</span>
                <div className="flex-grow border-t" style={{ borderColor: COLORS.line }}></div>
              </div>

              {/* Magic Link Form */}
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label htmlFor="auth-email" className="block text-[11px] font-mono uppercase tracking-wider rtl:tracking-normal mb-1.5" style={{ color: COLORS.inkSoft }}>
                    {t('auth.emailLabel')}
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('auth.emailPlaceholder')}
                    dir="ltr"
                    autoComplete="email"
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2"
                    style={{ background: COLORS.cardHi, border: `1px solid ${COLORS.field}`, color: COLORS.ink }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-lg text-xs font-mono uppercase tracking-wider rtl:tracking-normal transition-colors disabled:opacity-50"
                  style={{ background: `linear-gradient(180deg,${COLORS.amber},${COLORS.amberDeep})`, color: COLORS.onAmber }}
                >
                  {submitting ? t('auth.sendingLink') : t('auth.sendLink')}
                </button>
              </form>
            </>
          )}

        </div>
        <LanguageToggle className="mt-6" />
      </div>
    )
  }

  // App passes children as a render-prop function: <AuthGate>{(user) => ...}</AuthGate>.
  return typeof children === 'function' ? children(session.user) : children
}
