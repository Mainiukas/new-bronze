import { useEffect, useEffectEvent, useRef, useState, type FormEvent } from 'react'
import { AuthError } from '../../auth/backend'
import { authErrorMessage } from '../../auth/messages'
import { authParams, clearAuthParams, hasAuthResult } from '../../auth/redirect'
import type { AuthState } from '../../auth/store'
import { validateConfirmation, validateEmail, validatePassword } from '../../auth/validation'
import { useAuth } from '../../hooks/useAuth'
import { FormAlert, PasswordField, PasswordHint, Spinner, SubmitButton, TextField } from './fields'

const RESEND_SECONDS = 60

function BackToLogIn({ onClick }: { onClick: () => void }) {
  return (
    <p className="mt-5 text-center">
      <button type="button" onClick={onClick} className="min-h-11 px-2 text-sm font-semibold text-brass-300 underline-offset-2 hover:text-brass-200 hover:underline">
        ← Back to log in
      </button>
    </p>
  )
}

/** /auth/forgot: ask for a reset link. The answer never says whether the email has an account. */
export function ForgotPasswordView({ disabled, onBack }: { disabled: boolean; onBack: () => void }) {
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
  const emailError = validateEmail(email)

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
      await auth.sendPasswordReset(email)
      setSent(true)
      setResendAt(Date.now() + RESEND_SECONDS * 1000)
      setNow(Date.now())
    } catch (failure) {
      setError(authErrorMessage(failure))
    }
    setBusy(false)
  }

  return (
    <form noValidate onSubmit={submit} aria-labelledby="forgot-title">
      <h2 id="forgot-title" className="font-display text-2xl font-extrabold tracking-[0.1em] text-parchment-50 uppercase">
        Forgot password
      </h2>
      <p className="mt-1 mb-5 text-sm text-parchment-300">Enter the email you registered with and we’ll send you a link to set a new password.</p>
      <fieldset disabled={disabled} className="min-w-0">
        <TextField
          label="Email"
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
        <FormAlert tone="info" message={sent ? 'If an account exists for that email, we’ve sent a reset link. Check your inbox (and spam).' : null} />
        <FormAlert message={error} />
        <SubmitButton busy={busy} disabled={wait > 0}>
          {wait > 0 ? `Resend in ${wait}s` : sent ? 'Resend link' : 'Send reset link'}
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
  const auth = useAuth()
  const [phase, setPhase] = useState<'checking' | 'ready' | 'invalid'>(() => (hasAuthResult(authParams()) ? 'checking' : 'ready'))
  const [linkError, setLinkError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [touched, setTouched] = useState({ password: false, confirm: false })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { finishRedirect, status } = auth

  // Exchange the link's code for a session, then tidy the address bar.
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
        setLinkError(authErrorMessage(failure))
        setPhase('invalid')
      },
    )
    return () => {
      alive = false
    }
  }, [finishRedirect])

  const signedIn = status === 'signed-in' || status === 'needs-username' || status === 'error'
  const view = phase === 'ready' && !signedIn && status !== 'loading' && status !== 'unconfigured' ? 'invalid' : phase

  useEffect(() => {
    if (view !== 'ready') return
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => window.clearTimeout(timer)
  }, [view])

  const errors = { password: validatePassword(password), confirm: validateConfirmation(password, confirm) }
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
      await auth.setNewPassword(password)
      onDone()
    } catch (failure) {
      setError(authErrorMessage(failure))
      setBusy(false)
    }
  }

  return (
    <div aria-labelledby="reset-title" role="group">
      <h2 id="reset-title" className="font-display text-2xl font-extrabold tracking-[0.1em] text-parchment-50 uppercase">
        Set a new password
      </h2>
      {view === 'checking' || status === 'loading' ? (
        <p className="mt-6 flex items-center gap-3 text-parchment-300" role="status">
          <Spinner /> Checking your link…
        </p>
      ) : view === 'invalid' ? (
        <div className="mt-4">
          <FormAlert message={linkError ?? 'This reset link is invalid or has expired.'} />
          <p className="text-sm text-parchment-300">
            Reset links work once, for a limited time, in the browser you asked for them in. Ask for a new one and open it here.
          </p>
          <BackToLogIn onClick={onBack} />
        </div>
      ) : (
        <form noValidate onSubmit={submit} className="mt-5">
          <fieldset disabled={disabled} className="min-w-0">
            <PasswordField
              label="New password"
              inputRef={inputRef}
              value={password}
              onChange={setPassword}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              error={touched.password ? errors.password : null}
              hint={<PasswordHint password={password} />}
              autoComplete="new-password"
              required
            />
            <PasswordField
              label="Confirm new password"
              value={confirm}
              onChange={setConfirm}
              onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
              error={touched.confirm ? errors.confirm : null}
              autoComplete="new-password"
              required
            />
            <FormAlert message={error} />
            <SubmitButton busy={busy}>Set new password</SubmitButton>
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
          linkProblem
            ? 'This sign-in link can’t be used here: it may have expired, been used already, or been opened in a different browser. If you just confirmed your email, log in now.'
            : authErrorMessage(error),
        )
      },
    )
    return () => {
      alive = false
    }
  }, [hasResult, params, finishRedirect])

  // Nothing to finish (e.g. reloaded after it finished): carry on once the session is known.
  const settledSignedIn = !hasResult && (status === 'signed-in' || status === 'needs-username')
  useEffect(() => {
    if (settledSignedIn) carryOnWithCurrent()
  }, [settledSignedIn])

  const error = failure ?? (!hasResult && status !== 'loading' && !settledSignedIn ? 'There’s nothing to finish here. Try logging in again.' : null)

  return (
    <div role="group" aria-labelledby="callback-title">
      <h2 id="callback-title" className="font-display text-2xl font-extrabold tracking-[0.1em] text-parchment-50 uppercase">
        {error ? 'Couldn’t sign you in' : 'Signing you in'}
      </h2>
      {error ? (
        <div className="mt-4">
          <FormAlert message={error} />
          <BackToLogIn onClick={onBack} />
        </div>
      ) : (
        <p className="mt-6 flex items-center gap-3 text-parchment-300" role="status">
          <Spinner /> One moment…
        </p>
      )}
    </div>
  )
}
