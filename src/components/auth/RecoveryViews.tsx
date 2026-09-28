import { useEffect, useEffectEvent, useRef, useState, type FormEvent } from 'react'
import { AuthError } from '../../auth/backend'
import { authErrorMessage } from '../../auth/messages'
import { authParams, clearAuthParams, hasAuthResult } from '../../auth/redirect'
import type { AuthState } from '../../auth/store'
import { validateConfirmation, validateEmail, validatePassword } from '../../auth/validation'
import { useAuth } from '../../hooks/useAuth'
import { useT } from '../../i18n'
import { FormAlert, PasswordField, PasswordHint, Spinner, SubmitButton, TextField } from './fields'

const RESEND_SECONDS = 60

function BackToLogIn({ onClick }: { onClick: () => void }) {
  const t = useT()
  return (
    <p className="mt-5 text-center">
      <button type="button" onClick={onClick} className="min-h-11 px-2 text-sm font-semibold text-brass-300 underline-offset-2 hover:text-brass-200 hover:underline">
        ← {t.auth.backToLogIn}
      </button>
    </p>
  )
}

/** /auth/forgot: ask for a reset link. The answer never says whether the email has an account. */
export function ForgotPasswordView({ disabled, onBack }: { disabled: boolean; onBack: () => void }) {
  const t = useT()
  const f = t.auth.forgot
  const auth = useAuth()
  const [email, setEmail] = useState('')
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendAt, setResendAt] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => window.clearTimeout(timer)
  }, [])
  useEffect(() => {
    if (resendAt <= Date.now()) return
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [resendAt])

  const wait = Math.max(0, Math.ceil((resendAt - now) / 1000))
  const emailError = validateEmail(email, t.validation)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (disabled || busy || wait > 0) return
    if (emailError) {
      setTouched(true)
      inputRef.current?.focus()
      return
    }
    setBusy(true)
    setError(null)
    try {
      await auth.resetPassword(email)
      setSent(true)
      setResendAt(Date.now() + RESEND_SECONDS * 1000)
      setNow(Date.now())
    } catch (failure) {
      setError(authErrorMessage(failure, t.authErrors))
    }
    setBusy(false)
  }

  return (
    <form noValidate onSubmit={submit} aria-labelledby="forgot-title">
      <h2 id="forgot-title" className="font-display text-2xl font-extrabold tracking-[0.1em] text-parchment-50 uppercase">
        {f.title}
      </h2>
      <p className="mt-1 mb-5 text-sm text-parchment-300">{f.intro}</p>
      <fieldset disabled={disabled} className="min-w-0">
        <TextField
          label={t.auth.email}
          inputRef={inputRef}
          type="email"
          inputMode="email"
          value={email}
          onChange={setEmail}
          onBlur={() => setTouched(true)}
          error={touched ? emailError : null}
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
        />
        <FormAlert tone="info" message={sent ? f.sent : null} />
        <FormAlert message={error} />
        <SubmitButton busy={busy} disabled={wait > 0}>
          {wait > 0 ? f.resendIn(wait) : sent ? f.resend : f.send}
        </SubmitButton>
      </fieldset>
      <BackToLogIn onClick={onBack} />
    </form>
  )
}

/** Runs once per URL even under StrictMode's double effects: a code can only be exchanged once. */
const exchanges = new Map<string, Promise<unknown>>()
function finishOnce(key: string, run: () => Promise<unknown>) {
  if (!exchanges.has(key)) exchanges.set(key, run())
  return exchanges.get(key)!
}

/** /auth/reset: the email link lands here; set a new password. */
export function ResetPasswordView({ disabled, onBack, onDone }: { disabled: boolean; onBack: () => void; onDone: () => void }) {
  const t = useT()
  const rs = t.auth.reset
  const auth = useAuth()
  const [phase, setPhase] = useState<'checking' | 'ready' | 'invalid'>(() => (hasAuthResult(authParams()) ? 'checking' : 'ready'))
  const [linkError, setLinkError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [touched, setTouched] = useState({ password: false, confirm: false })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { finishRedirect, status, passwordRecovery } = auth

  // Exchange the link's code for a session (Supabase then reports PASSWORD_RECOVERY), then tidy the address bar.
  useEffect(() => {
    const params = authParams()
    if (!hasAuthResult(params)) return
    let alive = true
    finishOnce(params.toString(), () => finishRedirect(params)).then(
      () => {
        clearAuthParams()
        if (alive) setPhase('ready')
      },
      (failure) => {
        clearAuthParams()
        if (!alive) return
        setLinkError(authErrorMessage(failure, t.authErrors))
        setPhase('invalid')
      },
    )
    return () => {
      alive = false
    }
  }, [finishRedirect, t.authErrors])

  // The form shows for a session from a reset link (PASSWORD_RECOVERY), or for a player who is already signed in.
  const signedIn = passwordRecovery || status === 'signed-in' || status === 'needs-username' || status === 'error'
  const view = phase === 'ready' && !signedIn && status !== 'loading' && status !== 'unconfigured' ? 'invalid' : phase

  useEffect(() => {
    if (view !== 'ready') return
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => window.clearTimeout(timer)
  }, [view])

  const errors = { password: validatePassword(password, t.validation), confirm: validateConfirmation(password, confirm, t.validation) }
  const valid = !errors.password && !errors.confirm

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (disabled || busy) return
    if (!valid) {
      setTouched({ password: true, confirm: true })
      inputRef.current?.focus()
      return
    }
    setBusy(true)
    setError(null)
    try {
      await auth.updatePassword(password)
      onDone()
    } catch (failure) {
      setError(authErrorMessage(failure, t.authErrors))
      setBusy(false)
    }
  }

  return (
    <div aria-labelledby="reset-title" role="group">
      <h2 id="reset-title" className="font-display text-2xl font-extrabold tracking-[0.1em] text-parchment-50 uppercase">
        {rs.title}
      </h2>
      {view === 'checking' || status === 'loading' ? (
        <p className="mt-6 flex items-center gap-3 text-parchment-300" role="status">
          <Spinner /> {rs.checking}
        </p>
      ) : view === 'invalid' ? (
        <div className="mt-4">
          <FormAlert message={linkError ?? rs.invalid} />
          <p className="text-sm text-parchment-300">{rs.howLinksWork}</p>
          <BackToLogIn onClick={onBack} />
        </div>
      ) : (
        <form noValidate onSubmit={submit} className="mt-5">
          <fieldset disabled={disabled} className="min-w-0">
            <PasswordField
              label={rs.newPassword}
              inputRef={inputRef}
              value={password}
              onChange={setPassword}
              onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
              error={touched.password ? errors.password : null}
              hint={<PasswordHint password={password} />}
              autoComplete="new-password"
              required
            />
            <PasswordField
              label={rs.confirmNew}
              value={confirm}
              onChange={setConfirm}
              onBlur={() => setTouched((prev) => ({ ...prev, confirm: true }))}
              error={touched.confirm ? errors.confirm : null}
              autoComplete="new-password"
              required
            />
            <FormAlert message={error} />
            <SubmitButton busy={busy}>{rs.submit}</SubmitButton>
          </fieldset>
          <BackToLogIn onClick={onBack} />
        </form>
      )}
    </div>
  )
}

/**
 * /auth/callback: Google (or a confirmation email) sent the player back here
 * with a code. Swap it for a session, then carry on (exactly once).
 */
export function CallbackView({
  onSignedIn,
  onNeedsUsername,
  onBack,
}: {
  onSignedIn: (state: AuthState) => void
  onNeedsUsername: () => void
  onBack: () => void
}) {
  const t = useT()
  const cb = t.auth.callback
  const auth = useAuth()
  const [params] = useState(authParams)
  const hasResult = hasAuthResult(params)
  const [failure, setFailure] = useState<string | null>(null)
  const done = useRef(false)
  const { finishRedirect, status } = auth

  const carryOn = useEffectEvent((state: AuthState) => {
    if (done.current) return
    done.current = true
    if (state.status === 'needs-username') onNeedsUsername()
    else onSignedIn(state)
  })
  const carryOnWithCurrent = useEffectEvent(() => carryOn(auth))

  // Exchange the code. It can only be used once, so this runs once per URL.
  useEffect(() => {
    if (!hasResult) return
    let alive = true
    finishOnce(params.toString(), () => finishRedirect(params)).then(
      (state) => {
        clearAuthParams()
        if (alive) carryOn(state as AuthState)
      },
      (error) => {
        clearAuthParams()
        if (!alive) return
        const linkProblem = error instanceof AuthError && error.code === 'link-invalid'
        setFailure(
          linkProblem ? cb.linkProblem : authErrorMessage(error, t.authErrors),
        )
      },
    )
    return () => {
      alive = false
    }
  }, [hasResult, params, finishRedirect, t.authErrors, cb.linkProblem])

  // Nothing to finish (e.g. reloaded after it finished): carry on once the session is known.
  const settledSignedIn = !hasResult && (status === 'signed-in' || status === 'needs-username')
  useEffect(() => {
    if (settledSignedIn) carryOnWithCurrent()
  }, [settledSignedIn])

  const error = failure ?? (!hasResult && status !== 'loading' && !settledSignedIn ? cb.nothing : null)

  return (
    <div role="group" aria-labelledby="callback-title">
      <h2 id="callback-title" className="font-display text-2xl font-extrabold tracking-[0.1em] text-parchment-50 uppercase">
        {error ? cb.failed : cb.signingIn}
      </h2>
      {error ? (
        <div className="mt-4">
          <FormAlert message={error} />
          <BackToLogIn onClick={onBack} />
        </div>
      ) : (
        <p className="mt-6 flex items-center gap-3 text-parchment-300" role="status">
          <Spinner /> {cb.moment}
        </p>
      )}
    </div>
  )
}
