import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { AuthError } from '../../auth/backend'
import { authErrorMessage } from '../../auth/messages'
import type { AuthState } from '../../auth/store'
import { useAuth } from '../../hooks/useAuth'
import { Checkbox, FormAlert, GoogleButton, OrDivider, PasswordField, SubmitButton, TextField } from './fields'

const MAX_FAILURES = 5
const COOLDOWN_MS = 30_000
/** Failed tries survive a reload of the tab. */
const FAILURES_KEY = 'bronze.auth.failures'

interface Failures {
  count: number
  /** Time (ms) until which logging in is paused. */
  until: number
}

function readFailures(): Failures {
  try {
    const saved = JSON.parse(sessionStorage.getItem(FAILURES_KEY) ?? 'null') as Failures | null
    if (saved && typeof saved.count === 'number' && typeof saved.until === 'number') return saved
  } catch {
    // Unreadable: start over.
  }
  return { count: 0, until: 0 }
}

function writeFailures(failures: Failures) {
  try {
    sessionStorage.setItem(FAILURES_KEY, JSON.stringify(failures))
  } catch {
    // Storage unavailable: the count lives in memory only.
  }
}

interface LoginFormProps {
  disabled: boolean
  onGoogle: (remember: boolean) => Promise<void>
  onForgot: () => void
  onLoggedIn: (state: AuthState) => void
  /** Below the button (the phone's "New here? Create an account"). */
  footer?: ReactNode
  /** Focus the first field on opening (off when the keyboard is on the Register/Log in switch). */
  autoFocus?: boolean
}

/** Log in with Google, or a username or email and password. Five wrong tries pause it for 30 seconds. */
export function LoginForm({ disabled, onGoogle, onForgot, onLoggedIn, footer, autoFocus = true }: LoginFormProps) {
  const auth = useAuth()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  // Unticked by default: staying logged in after the browser closes is the player's choice.
  const [remember, setRemember] = useState(false)
  const [touched, setTouched] = useState({ identifier: false, password: false })
  const [busy, setBusy] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [failures, setFailures] = useState(readFailures)
  const [now, setNow] = useState(() => Date.now())
  const firstRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!autoFocus) return
    const timer = window.setTimeout(() => firstRef.current?.focus(), 0)
    return () => window.clearTimeout(timer)
  }, [autoFocus])

  const waitSeconds = Math.max(0, Math.ceil((failures.until - now) / 1000))
  // Tick the countdown while paused.
  useEffect(() => {
    if (failures.until <= Date.now()) return
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [failures.until])

  const errors = {
    identifier: identifier.trim() ? null : 'Enter your username or email.',
    password: password ? null : 'Enter your password.',
  }
  const valid = !errors.identifier && !errors.password

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (disabled || busy || waitSeconds > 0) return
    if (!valid) {
      setTouched({ identifier: true, password: true })
      ;(errors.identifier ? firstRef : passwordRef).current?.focus()
      return
    }
    setBusy(true)
    setError(null)
    try {
      const state = await auth.logIn(identifier, password, remember)
      const cleared = { count: 0, until: 0 }
      writeFailures(cleared)
      setFailures(cleared)
      onLoggedIn(state)
    } catch (failure) {
      if (failure instanceof AuthError && failure.code === 'invalid-credentials') {
        const count = failures.count + 1
        const next = count >= MAX_FAILURES ? { count: 0, until: Date.now() + COOLDOWN_MS } : { count, until: 0 }
        writeFailures(next)
        setFailures(next)
        setNow(Date.now())
        setError(
          next.until
            ? `${authErrorMessage(failure)} Too many tries: wait ${COOLDOWN_MS / 1000} seconds before trying again.`
            : authErrorMessage(failure),
        )
      } else {
        setError(authErrorMessage(failure))
      }
      setBusy(false)
    }
  }

  const google = async () => {
    setGoogleBusy(true)
    setError(null)
    try {
      await onGoogle(remember)
    } catch (failure) {
      setError(authErrorMessage(failure))
      setGoogleBusy(false)
    }
  }

  return (
    <form noValidate onSubmit={submit} aria-label="Log in">
      <fieldset disabled={disabled} className="min-w-0">
        <GoogleButton onClick={google} busy={googleBusy} disabled={busy} />
        <OrDivider />

        <TextField
          label="Username or email"
          inputRef={firstRef}
          value={identifier}
          onChange={setIdentifier}
          onBlur={() => setTouched((t) => ({ ...t, identifier: true }))}
          error={touched.identifier ? errors.identifier : null}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
        />
        <PasswordField
          label="Password"
          inputRef={passwordRef}
          value={password}
          onChange={setPassword}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          error={touched.password ? errors.password : null}
          autoComplete="current-password"
          required
          className="-mb-1"
        />
        <div className="flex items-center justify-between gap-3">
          <Checkbox id="login-remember" checked={remember} onChange={setRemember}>
            Remember me
          </Checkbox>
          <button type="button" onClick={onForgot} className="min-h-11 text-sm font-semibold text-brass-300 underline-offset-2 hover:text-brass-200 hover:underline">
            Forgot password?
          </button>
        </div>

        <div className="mt-3">
          <FormAlert message={error} />
          <SubmitButton busy={busy} disabled={waitSeconds > 0}>
            {waitSeconds > 0 ? `Try again in ${waitSeconds}s` : busy ? 'Logging in…' : 'Log in'}
          </SubmitButton>
        </div>
      </fieldset>
      {footer}
    </form>
  )
}
