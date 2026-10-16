import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { isAuthRetryableFetchError } from '@supabase/auth-js'
import { supabase, signInWithEmail, signInWithProvider } from '../lib/auth'
import { AUTH_STORAGE_KEY } from '../lib/supabaseClient'
import { COLORS } from '../lib/theme'
import { useI18n } from '../i18n/I18nProvider'
import { errorText } from '../i18n/errorText';
import LanguageToggle from './LanguageToggle'
import KyphiraLogo from './kx/KyphiraLogo'
import { localePath } from '../site/meta'

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
  const { t, locale } = useI18n()
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
    borderColor: COLORS.field,
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
      <div className="min-h-screen flex flex-col" style={{ background: COLORS.paper, color: COLORS.ink }}>
        <header className="h-[72px] flex items-center justify-between px-4 sm:px-6 lg:px-12" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
          <Link to={localePath(locale, '/')} aria-label={t('site.nav.home')} className="inline-flex items-center min-h-[44px]">
            <KyphiraLogo form="wordmark" height={16} title={t('brand')} />
          </Link>
          <LanguageToggle />
        </header>

        <div className="flex-1 grid md:grid-cols-2">
          <div className="px-4 sm:px-8 md:px-[clamp(32px,10vw,148px)] py-10 md:py-16 flex flex-col justify-center">
            <div className="w-full max-w-[424px]">
              <p dir="ltr" className="text-xs tracking-[0.06em]" style={{ color: COLORS.dim }}>K·0000</p>
              <h1 className="mt-4 font-serif font-light text-[clamp(40px,5vw,64px)] leading-[1.1] rtl:leading-[1.4] tracking-[-0.01em] rtl:tracking-normal">{t('auth.heading')}</h1>
              <p className="mt-4 text-[17px] leading-relaxed" style={{ color: COLORS.dim }}>{t('auth.lead')}</p>

              {errorMsg && (
                <div role="alert" className="mt-6 p-3 text-sm rounded-sm" style={{ border: `1px solid ${COLORS.danger}`, color: COLORS.danger, background: COLORS.dangerBg }}>
                  {errorMsg}
                </div>
              )}

              {sentMagicLink ? (
                <div className="mt-10">
                  <h2 ref={inboxRef} tabIndex={-1} className="font-serif text-2xl mb-2 rtl:leading-[1.5]">{t('auth.checkInbox')}</h2>
                  <p className="text-sm mb-4" style={{ color: COLORS.inkSoft }}>
                    {t('auth.sentLinkTo')} <span dir="ltr" style={{ color: COLORS.ink }}>{email}</span>.
                  </p>
                  <button onClick={() => setSentMagicLink(false)} className="text-sm underline min-h-[44px]" style={{ color: COLORS.actionText }}>
                    {t('auth.useDifferent')}
                  </button>
                </div>
              ) : (
                <>
                  <div className="mt-10">
                    <button onClick={() => handleOAuth('google')}
                      className="w-full min-h-[52px] px-4 border text-[15px] rounded-sm hover:border-[color:var(--c-dim)]" style={oauthBtn}>
                      {t('auth.continueGoogle')}
                    </button>
                  </div>

                  <div className="flex items-center gap-4 my-6">
                    <div className="flex-grow border-t" style={{ borderColor: COLORS.line }}></div>
                    <span className="text-xs" style={{ color: COLORS.dim }}>{t('auth.orMagicLink')}</span>
                    <div className="flex-grow border-t" style={{ borderColor: COLORS.line }}></div>
                  </div>

                  <form onSubmit={handleEmailSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="auth-email" className="block text-sm mb-2" style={{ color: COLORS.ink }}>
                        {t('auth.emailLabel')}
                      </label>
                      <input id="auth-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('auth.emailPlaceholder')} dir="ltr" autoComplete="email"
                        className="w-full px-4 min-h-[52px] text-[15px] rounded-sm focus:outline-none focus:ring-2 text-start"
                        style={{ background: COLORS.card, border: `1px solid ${COLORS.field}`, color: COLORS.ink }} />
                    </div>
                    <button type="submit" disabled={submitting}
                      className="on-resin w-full min-h-[52px] px-4 text-[15px] font-semibold rounded-sm disabled:opacity-50 hover:bg-[color:var(--c-action-hover)]"
                      style={{ background: COLORS.amber, color: COLORS.onAmber }}>
                      {submitting ? t('auth.sendingLink') : t('auth.sendLink')}
                    </button>
                  </form>
                </>
              )}

              <Link to={localePath(locale, '/library')} className="inline-flex items-center min-h-[44px] mt-8 text-sm hover:underline" style={{ color: COLORS.actionText }}>
                {t('auth.backToGuides')}
              </Link>
            </div>
          </div>

          {/* The room at dusk: the mark, a glow from the top, the method in three words. */}
          <div aria-hidden="true" className="relative hidden md:flex flex-col justify-between p-12 overflow-hidden" style={{ background: COLORS.card, borderInlineStart: `1px solid ${COLORS.line}`, color: COLORS.ink }}>
            <span className="absolute inset-x-0 top-0 h-[360px]" style={{ background: 'radial-gradient(70% 100% at 50% 0%, color-mix(in srgb, var(--c-amber) 24%, transparent), transparent 72%)' }} />
            <span className="relative"><KyphiraLogo form="symbol" height={120} /></span>
            <div className="relative">
              <p className="font-serif font-light text-[clamp(36px,3.6vw,52px)] leading-[1.1] rtl:leading-[1.4]">{t('site.landing.methodTitle')}</p>
              <p className="mt-3 text-sm" style={{ color: COLORS.dim }}>{t('auth.panelSub')}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // App passes children as a render-prop function: <AuthGate>{(user) => ...}</AuthGate>.
  return typeof children === 'function' ? children(session.user) : children
}
