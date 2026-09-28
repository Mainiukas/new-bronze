import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { AuthError, signupConsent } from '../../auth/backend'
import { authErrorMessage } from '../../auth/messages'
import { validateConfirmation, validateEmail, validatePassword, validateUsername } from '../../auth/validation'
import { useAuth } from '../../hooks/useAuth'
import { AgeQuestion, MarketingConsent, TermsConsent, UnderAgeNotice, type AgeAnswer } from './Consents'
import { FormAlert, GoogleButton, OrDivider, PasswordField, PasswordHint, SubmitButton, TextField, UsernameStatus } from './fields'
import { useUsernameCheck } from './useUsernameCheck'

type Field = 'username' | 'email' | 'password' | 'confirm' | 'age' | 'agreed'
const FIELDS: Field[] = ['username', 'email', 'password', 'confirm', 'age', 'agreed']

interface RegisterFormProps {
  /** Accounts aren't configured: everything is shown but disabled. */
  disabled: boolean
  onGoogle: () => Promise<void>
  onRegistered: (result: { needsConfirmation: boolean; username: string; email: string }) => void
  /** Below the button (the phone's "I already have an account"). */
  footer?: ReactNode
  /** Focus the first field on opening (off when the keyboard is on the Register/Log in switch). */
  autoFocus?: boolean
  /** Under 14: close the account screens and carry on as a guest. */
  onKeepPlaying: () => void
}

/**
 * Create an account: Google, or username, email and password, then the age
 * question (under 14: guests only), the required Terms box and, for 18 and
 * over, an optional marketing box. Both boxes start unticked.
 */
export function RegisterForm({ disabled, onGoogle, onRegistered, footer, autoFocus = true, onKeepPlaying }: RegisterFormProps) {
  const auth = useAuth()
  const [values, setValues] = useState({ username: '', email: '', password: '', confirm: '' })
  const [age, setAge] = useState<AgeAnswer>(null)
  const [agreed, setAgreed] = useState(false)
  const [marketing, setMarketing] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const [busy, setBusy] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  /** A name the server refused although the live check had passed it (taken a moment earlier). */
  const [refusedName, setRefusedName] = useState<string | null>(null)
  const inputs = useRef<Partial<Record<Field, HTMLInputElement | null>>>({})
  const tooYoung = age === 'under-14'

  // Focus the first field once the panel is open.
  useEffect(() => {
    if (!autoFocus) return
    const timer = window.setTimeout(() => inputs.current.username?.focus(), 0)
    return () => window.clearTimeout(timer)
  }, [autoFocus])

  const check = useUsernameCheck(values.username, auth.isUsernameAvailable, auth.configured)
  const name = values.username.trim()
  const errors: Record<Field, string | null> = {
    username:
      validateUsername(name) ??
      (check === 'taken' || refusedName === name ? 'That username is taken.' : check === 'error' ? 'Couldn’t check this username. Try again.' : null),
    email: validateEmail(values.email),
    password: validatePassword(values.password),
    confirm: validateConfirmation(values.password, values.confirm),
    age: age === null ? 'Choose your age group.' : null,
    agreed: agreed ? null : 'Agree to the Terms and Privacy Policy to continue.',
  }
  const valid = FIELDS.every((field) => !errors[field]) && check === 'available' && !tooYoung
  const shown = (field: Field) => (touched[field] || (field === 'username' && check === 'taken') ? errors[field] : null)

  const set = (field: keyof typeof values) => (value: string) => setValues((prev) => ({ ...prev, [field]: value }))
  const touch = (field: Field) => () => setTouched((prev) => ({ ...prev, [field]: true }))

  /** Show every error and put focus on the first one. */
  const revealErrors = () => {
    setTouched(Object.fromEntries(FIELDS.map((field) => [field, true])))
    const first = FIELDS.find((field) => errors[field])
    if (first) inputs.current[first]?.focus()
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (disabled || busy || tooYoung) return
    if (!valid || age === null) return revealErrors()
    setBusy(true)
    setServerError(null)
    try {
      const result = await auth.register({ username: name, email: values.email, password: values.password, consent: signupConsent(age, marketing) })
      onRegistered({ ...result, username: name, email: values.email.trim() })
    } catch (error) {
      if (error instanceof AuthError && error.code === 'username-taken') {
        setRefusedName(name)
        inputs.current.username?.focus()
      }
      setServerError(authErrorMessage(error))
      setBusy(false)
    }
  }

  // Enter in a field while the button is still disabled: say what's missing instead of doing nothing.
  const onKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter' && !valid && (event.target as HTMLElement).tagName === 'INPUT') {
      event.preventDefault()
      revealErrors()
    }
  }

  const google = async () => {
    setGoogleBusy(true)
    setServerError(null)
    try {
      await onGoogle()
    } catch (error) {
      setServerError(authErrorMessage(error))
      setGoogleBusy(false)
    }
  }

  return (
    <form noValidate onSubmit={submit} onKeyDown={onKeyDown} aria-label="Create an account">
      <fieldset disabled={disabled} className="min-w-0">
        <GoogleButton onClick={google} busy={googleBusy} disabled={busy} />
        <p className="mt-2 text-center text-xs text-parchment-400">With Google too, you’ll confirm your age and accept the Terms before your account is created.</p>
        <OrDivider />

        <TextField
          label="Username"
          inputRef={(el) => void (inputs.current.username = el)}
          value={values.username}
          onChange={(v) => {
            set('username')(v)
            setServerError(null)
          }}
          onBlur={touch('username')}
          error={shown('username')}
          hint="3–20 characters: letters, numbers and _."
          aside={<UsernameStatus status={check} />}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={20}
          required
        />
        <TextField
          label="Email"
          inputRef={(el) => void (inputs.current.email = el)}
          type="email"
          inputMode="email"
          value={values.email}
          onChange={set('email')}
          onBlur={touch('email')}
          error={shown('email')}
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
        />
        <PasswordField
          label="Password"
          inputRef={(el) => void (inputs.current.password = el)}
          value={values.password}
          onChange={set('password')}
          onBlur={touch('password')}
          error={shown('password')}
          hint={<PasswordHint password={values.password} />}
          autoComplete="new-password"
          required
        />
        <PasswordField
          label="Confirm password"
          inputRef={(el) => void (inputs.current.confirm = el)}
          value={values.confirm}
          onChange={set('confirm')}
          onBlur={touch('confirm')}
          error={shown('confirm')}
          autoComplete="new-password"
          required
        />

        <AgeQuestion
          name="register-age"
          value={age}
          onChange={(value) => {
            setAge(value)
            touch('age')()
            if (value !== '18+') setMarketing(false)
          }}
          error={shown('age')}
          firstRef={(el) => void (inputs.current.age = el)}
        />
        {tooYoung ? (
          <UnderAgeNotice onKeepPlaying={onKeepPlaying} />
        ) : (
          <>
            <TermsConsent
              id="register-agree"
              checked={agreed}
              onChange={(checked) => {
                setAgreed(checked)
                touch('agreed')()
              }}
              error={shown('agreed')}
              inputRef={(el) => void (inputs.current.agreed = el)}
            />
            {age === '18+' && <MarketingConsent id="register-marketing" checked={marketing} onChange={setMarketing} />}
          </>
        )}

        <div className="mt-3">
          <FormAlert message={serverError} />
          <SubmitButton busy={busy} disabled={!valid || tooYoung}>
            {busy ? 'Creating account…' : 'Create account'}
          </SubmitButton>
        </div>
      </fieldset>
      {footer}
    </form>
  )
}
