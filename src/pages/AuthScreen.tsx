import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import type { Profile } from '../auth/backend'
import { NOT_CONFIGURED } from '../auth/messages'
import { rememberReturnTo, takeReturnTo } from '../auth/redirect'
import type { AuthState } from '../auth/store'
import { ChooseUsername } from '../components/auth/ChooseUsername'
import { FormAlert } from '../components/auth/fields'
import { LoginForm } from '../components/auth/LoginForm'
import { CallbackView, ForgotPasswordView, ResetPasswordView } from '../components/auth/RecoveryViews'
import { RegisterForm } from '../components/auth/RegisterForm'
import { Dialog } from '../components/Dialog'
import { IconClose } from '../components/icons'
import { AuthLogo } from '../components/theme/Logo'
import { Corners } from '../components/theme/Ornaments'
import { PageBackground } from '../components/theme/PageBackground'
import { AUTH_PATHS, isAuthPath, PATHS } from '../data/navigation'
import { useAuth } from '../hooks/useAuth'
import { useMediaQuery } from '../hooks/useMediaQuery'
import type { AuthLocationState, AuthMode } from '../hooks/useOpenAuth'
import { useToast } from '../hooks/useToast'

type View = keyof typeof AUTH_PATHS

const VIEWS = Object.fromEntries(Object.entries(AUTH_PATHS).map(([view, path]) => [path, view])) as Record<string, View>

const welcome = (profile: Profile | null, isNew: boolean) => (profile ? `${isNew ? 'Welcome' : 'Welcome back'}, ${profile.username}!` : 'Welcome!')
/** A profile made in the last ten minutes: this is their first visit. */
const isFresh = (profile: Profile | null) => !!profile && Date.now() - Date.parse(profile.createdAt) < 10 * 60_000

/**
 * The account screens (/auth, /auth/forgot, /auth/reset, /auth/callback,
 * /auth/username): an iron panel with the logo over the industrialist's desk
 * at night (the study, for the password and username steps), drawn over the
 * page it was opened from. The close button (and
 * Escape) go back there. Desktop switches Register/Log in with a pill;
 * phones show one full-screen form at a time with a link to the other.
 * A signed-in player without a username always gets the username step.
 */
export function AuthScreen() {
  const auth = useAuth()
  const notify = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const desktop = useMediaQuery('(min-width: 768px)')
  const [confirmSentTo, setConfirmSentTo] = useState<string | null>(null)
  /** Off after switching with the arrow keys, so focus stays on the switch. */
  const [focusFirstField, setFocusFirstField] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  const state = (location.state ?? {}) as AuthLocationState
  const depth = state.depth ?? 0
  const routeView: View = VIEWS[location.pathname] ?? 'forms'
  const view: View = auth.status === 'needs-username' && routeView !== 'reset' && routeView !== 'callback' ? 'username' : routeView
  const mode: AuthMode = params.get('mode') === 'login' ? 'login' : 'register'
  const onAuthRoute = isAuthPath(location.pathname)

  /** Move within the account screens, keeping the page behind them. */
  const go = (to: string) => navigate(to, { state: { background: state.background, depth: depth + 1 } satisfies AuthLocationState })
  const switchMode = (next: AuthMode, withKeyboard = false) => {
    setConfirmSentTo(null)
    setFocusFirstField(!withKeyboard)
    go(`/auth?mode=${next}`)
  }
  /** Back to where the player was before the account screens. */
  const leave = () => {
    if (!onAuthRoute) return
    if (depth > 0) navigate(-depth)
    else navigate(takeReturnTo(), { replace: true })
  }

  const startGoogle = async (remember: boolean) => {
    const from = state.background
    rememberReturnTo(from ? `${from.pathname}${from.search}` : PATHS.mainMenu)
    await auth.logInWithGoogle(remember)
  }

  /** A first Google sign-in turned down: the unfinished account is deleted (nothing is kept), then back to the lobby. */
  const decline = async () => {
    try {
      await auth.declineSignup()
      notify('Sign-up cancelled. Nothing was kept.')
    } catch {
      // Couldn't reach the server: at least log out here. The unfinished sign-up is deleted automatically within 7 days.
      await auth.logOut().catch(() => undefined)
      notify('Logged out. The unfinished sign-up will be deleted automatically.')
    }
    navigate(PATHS.mainMenu, { replace: true })
  }

  // Phones: keep the focused field (and, if it fits, the button under it) above the on-screen keyboard.
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    const onResize = () => {
      const field = document.activeElement
      if (!(field instanceof HTMLInputElement) || !scrollRef.current?.contains(field)) return
      field.form?.querySelector<HTMLElement>('[type="submit"]')?.scrollIntoView({ block: 'nearest' })
      field.scrollIntoView({ block: 'nearest' })
    }
    viewport.addEventListener('resize', onResize)
    return () => viewport.removeEventListener('resize', onResize)
  }, [])

  const notice = !auth.configured && view !== 'username' && (
    <div className="mb-5">
      <FormAlert tone="info" message={`${NOT_CONFIGURED} You can keep playing as a guest; nothing here will sign you in.`} />
      <button type="button" className="btn btn-ghost w-full" onClick={leave}>
        Keep playing as a guest
      </button>
    </div>
  )

  let body: ReactNode
  let titleId = 'auth-title'
  if (view === 'username') {
    titleId = 'username-title'
    body = (
      <ChooseUsername
        onChosen={(profile) => {
          notify(welcome(profile, true))
          if (onAuthRoute) navigate(takeReturnTo(), { replace: true })
        }}
        onDecline={() => void decline()}
      />
    )
  } else if (view === 'forgot') {
    titleId = 'forgot-title'
    body = <ForgotPasswordView disabled={!auth.configured} onBack={() => switchMode('login')} />
  } else if (view === 'reset') {
    titleId = 'reset-title'
    body = (
      <ResetPasswordView
        disabled={!auth.configured}
        onBack={() => switchMode('login')}
        onDone={() => {
          navigate(PATHS.mainMenu, { replace: true })
          notify('Password updated')
        }}
      />
    )
  } else if (view === 'callback') {
    titleId = 'callback-title'
    body = (
      <CallbackView
        onSignedIn={(signedIn: AuthState) => {
          navigate(takeReturnTo(), { replace: true })
          notify(welcome(signedIn.profile, isFresh(signedIn.profile)))
        }}
        onNeedsUsername={() => navigate(AUTH_PATHS.username, { replace: true })}
        onBack={() => navigate('/auth?mode=login', { replace: true })}
      />
    )
  } else if (confirmSentTo) {
    body = <CheckEmail email={confirmSentTo} onDone={leave} onRestart={() => setConfirmSentTo(null)} />
  } else {
    const register = (
      <RegisterForm
        key="register"
        disabled={!auth.configured}
        autoFocus={focusFirstField}
        onGoogle={() => startGoogle(true)}
        onKeepPlaying={leave}
        onRegistered={({ needsConfirmation, username, email }) => {
          if (needsConfirmation) return setConfirmSentTo(email)
          leave()
          notify(`Welcome, ${username}!`)
        }}
        footer={!desktop && <SwitchLink prompt="" action="I already have an account" onClick={() => switchMode('login')} />}
      />
    )
    const login = (
      <LoginForm
        key="login"
        disabled={!auth.configured}
        autoFocus={focusFirstField}
        onGoogle={startGoogle}
        onForgot={() => go(AUTH_PATHS.forgot)}
        onLoggedIn={(signedIn) => {
          if (signedIn.status === 'needs-username') return
          leave()
          notify(signedIn.status === 'signed-in' ? welcome(signedIn.profile, false) : 'Logged in, but your profile couldn’t be loaded.')
        }}
        footer={!desktop && <SwitchLink prompt="New here?" action="Create an account" onClick={() => switchMode('register')} />}
      />
    )
    body = desktop ? (
      <>
        <ModePill mode={mode} onChange={switchMode} />
        <div role="tabpanel" id="auth-tabpanel" aria-labelledby={`auth-tab-${mode}`} className="mt-6">
          <h2 id="auth-title" className="sr-only">
            {mode === 'register' ? 'Create an account' : 'Log in'}
          </h2>
          {notice}
          {mode === 'register' ? register : login}
        </div>
      </>
    ) : (
      <>
        <h2 id="auth-title" className="mb-1 font-display text-3xl font-extrabold tracking-[0.1em] text-parchment-50 uppercase">
          {mode === 'register' ? 'Create account' : 'Log in'}
        </h2>
        <p className="mb-5 text-sm text-parchment-300">
          {mode === 'register' ? 'Save your record, and be ready for friends and online play.' : 'Welcome back, industrialist.'}
        </p>
        {notice}
        {mode === 'register' ? register : login}
      </>
    )
  }

  const painting = view === 'forgot' || view === 'reset' || view === 'username' ? 'auth_study' : 'auth'
  const closeLabel = view === 'username' ? 'Cancel sign-up' : 'Close'
  const onClose = view === 'username' ? () => void decline() : leave

  return (
    <Dialog open onClose={onClose} labelledBy={titleId} variant="screen" dismissible={view !== 'username'}>
      <div ref={scrollRef} className="relative h-full overflow-y-auto overscroll-contain">
        <PageBackground name={painting}>
          {/* A warm lamp glow behind the panel */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_42%_48%_at_50%_50%,var(--color-ember-400),transparent_75%)] opacity-20" />
        </PageBackground>

        <div className="relative flex min-h-full justify-center md:items-center md:px-6 md:py-10">
          {/* Phones: the logo on the painting, the form in an iron panel below it. */}
          <section
            className={
              desktop
                ? 'iron-framed relative w-full max-w-[29rem] animate-fade-up px-9 pt-8 pb-9'
                : 'relative w-full px-3 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]'
            }
          >
            {desktop && <Corners />}
            <header className="relative mb-5 flex items-center justify-center px-12">
              <AuthLogo />
              <button type="button" onClick={onClose} className="icon-btn absolute -top-1 right-0 size-11 text-base md:-top-2 md:-right-2" aria-label={closeLabel}>
                <IconClose />
              </button>
            </header>
            {desktop ? (
              body
            ) : (
              <div className="plate iron relative animate-fade-up rounded-xl px-4 pt-5 pb-6">
                <Corners />
                {body}
              </div>
            )}
          </section>
        </div>
      </div>
    </Dialog>
  )
}

/** Desktop's [ Register | Log in ] switch: a brass highlight slides to the chosen side. */
function ModePill({ mode, onChange }: { mode: AuthMode; onChange: (mode: AuthMode, withKeyboard?: boolean) => void }) {
  const modes: [AuthMode, string][] = [
    ['register', 'Register'],
    ['login', 'Log in'],
  ]
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const next = event.key === 'ArrowLeft' ? 'register' : 'login'
    if (next !== mode) onChange(next, true)
    document.getElementById(`auth-tab-${next}`)?.focus()
  }
  return (
    <div role="tablist" aria-label="Register or log in" onKeyDown={onKeyDown} className="relative grid grid-cols-2 rounded-full border border-bronze-500/40 bg-soot-950/80 p-1 shadow-[inset_0_2px_6px_rgb(0_0_0/0.7)]">
      <span
        aria-hidden="true"
        className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full border border-brass-200/60 bg-linear-to-b from-brass-200 via-brass-400 to-bronze-500 shadow-[inset_0_1px_0_rgb(255_255_255/0.5),0_2px_8px_-2px_rgb(255_157_77/0.6)] transition-transform duration-200 ease-out motion-reduce:transition-none ${
          mode === 'login' ? 'translate-x-full' : 'translate-x-0'
        }`}
      />
      {modes.map(([value, label]) => {
        const active = mode === value
        return (
          <button
            key={value}
            id={`auth-tab-${value}`}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls="auth-tabpanel"
            tabIndex={active ? 0 : -1}
            onClick={() => !active && onChange(value)}
            className={`relative h-11 rounded-full font-display text-base font-extrabold tracking-[0.14em] uppercase transition-colors duration-200 motion-reduce:transition-none ${
              active ? 'text-[#34200a] [text-shadow:0_1px_0_rgb(255_244_214/0.6)]' : 'text-parchment-200 hover:text-parchment-50'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

function SwitchLink({ prompt, action, onClick }: { prompt: string; action: string; onClick: () => void }) {
  return (
    <p className="mt-6 border-t border-bronze-500/25 pt-5 text-center text-sm text-parchment-300">
      {prompt}{' '}
      <button type="button" onClick={onClick} className="min-h-11 px-1 font-display text-base font-bold tracking-[0.08em] text-brass-300 uppercase underline-offset-4 hover:text-brass-200 hover:underline">
        {action}
      </button>
    </p>
  )
}

/** After registering with email confirmation on. */
function CheckEmail({ email, onDone, onRestart }: { email: string; onDone: () => void; onRestart: () => void }) {
  return (
    <div role="status" aria-labelledby="auth-title">
      <h2 id="auth-title" className="font-display text-2xl font-extrabold tracking-[0.1em] text-parchment-50 uppercase">
        Check your email
      </h2>
      <p className="mt-3 text-parchment-200">
        Check your email to confirm your account. We sent a link to <strong className="text-parchment-50">{email}</strong>; open it in this browser to finish.
      </p>
      <p className="mt-2 text-sm text-parchment-300">No email after a few minutes? Check your spam folder.</p>
      <button type="button" className="btn btn-primary mt-6 w-full" onClick={onDone}>
        Back to the lobby
      </button>
      <p className="mt-4 text-center">
        <button type="button" onClick={onRestart} className="min-h-11 px-2 text-sm font-semibold text-brass-300 hover:text-brass-200 hover:underline">
          Wrong address? Register again
        </button>
      </p>
    </div>
  )
}
