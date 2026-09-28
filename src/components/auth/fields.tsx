import { useId, useState, type InputHTMLAttributes, type ReactNode, type Ref } from 'react'
import { PASSWORD_MIN, passwordStrength, type PasswordStrength } from '../../auth/validation'
import { IconCheck, IconEye, IconEyeOff, IconGoogle } from '../icons'
import { LabelledDivider } from '../theme/Ornaments'

/* Form parts shared by the account screens. Inputs are 48 px tall (thumb-sized on phones). */

const inputClass =
  'h-12 w-full min-w-0 rounded-lg border bg-soot-950/75 px-3.5 text-base text-parchment-50 shadow-[inset_0_1px_3px_rgb(0_0_0/0.6)] outline-none transition-colors placeholder:text-parchment-400 focus:border-ember-400/80 focus:shadow-[inset_0_1px_3px_rgb(0_0_0/0.6),0_0_0_3px_rgb(255_157_77/0.18)] disabled:cursor-not-allowed disabled:opacity-50'

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label: string
  value: string
  onChange: (value: string) => void
  /** Shown under the field in rust red, and announced. */
  error?: string | null
  /** Shown under the field when there's no error. */
  hint?: ReactNode
  /** Something at the right edge inside the field (e.g. the show/hide button). */
  trailing?: ReactNode
  /** Something on the label's line, right-aligned. */
  aside?: ReactNode
  inputRef?: Ref<HTMLInputElement>
}

/** A labelled input whose error (or hint) is tied to it for screen readers, and announced when it appears. */
export function TextField({ label, value, onChange, error, hint, trailing, aside, inputRef, id, className = '', ...input }: TextFieldProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const messageId = `${fieldId}-message`
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={fieldId} className="font-display text-sm font-bold tracking-[0.12em] text-parchment-200 uppercase">
          {label}
        </label>
        {aside}
      </div>
      <div className="relative">
        <input
          id={fieldId}
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={messageId}
          className={`${inputClass} ${error ? 'border-rust-400/80' : 'border-bronze-500/35 hover:border-bronze-400/60'} ${trailing ? 'pr-12' : ''}`}
          {...input}
        />
        {trailing && <div className="absolute inset-y-0 right-0 flex items-center pr-1">{trailing}</div>}
      </div>
      <p id={messageId} aria-live="polite" className={`mt-1 mb-2 min-h-5 text-sm ${error ? 'text-rust-300' : 'text-parchment-400'}`}>
        {error ?? hint}
      </p>
    </div>
  )
}

/** A password field with a show/hide button. */
export function PasswordField(props: Omit<TextFieldProps, 'type' | 'trailing'>) {
  const [visible, setVisible] = useState(false)
  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      spellCheck={false}
      autoCapitalize="none"
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="grid size-10 place-items-center rounded-md text-lg text-parchment-300 hover:text-parchment-50"
        >
          {visible ? <IconEyeOff /> : <IconEye />}
        </button>
      }
    />
  )
}

const STRENGTH: Record<PasswordStrength, { label: string; filled: number; color: string }> = {
  weak: { label: 'Weak', filled: 1, color: 'bg-rust-400' },
  ok: { label: 'OK', filled: 2, color: 'bg-brass-400' },
  strong: { label: 'Strong', filled: 3, color: 'bg-verdigris-400' },
}

/**
 * A new password's hint: "At least 8 characters." until typing starts, then
 * a three-step strength bar (and the length rule while it's too short).
 */
export function PasswordHint({ password }: { password: string }) {
  if (!password) return `At least ${PASSWORD_MIN} characters.`
  const strength = STRENGTH[passwordStrength(password)]
  return (
    <span className="flex items-center gap-3 pt-1.5">
      <span className="flex flex-1 gap-1" aria-hidden="true">
        {[1, 2, 3].map((step) => (
          <span key={step} className={`h-1.5 flex-1 rounded-full transition-colors ${step <= strength.filled ? strength.color : 'bg-soot-700'}`} />
        ))}
      </span>
      <span className="text-xs font-semibold text-parchment-300">
        {password.length < PASSWORD_MIN ? `At least ${PASSWORD_MIN} characters` : `Strength: ${strength.label}`}
      </span>
    </span>
  )
}

/** "✓ Available" / "Taken" / "Checking…" next to the username label. */
export function UsernameStatus({ status }: { status: UsernameCheck }) {
  if (status === 'available')
    return (
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-verdigris-300">
        <IconCheck className="size-4" strokeWidth={2.6} /> Available
      </span>
    )
  if (status === 'taken') return <span className="text-sm font-semibold text-rust-300">Taken</span>
  if (status === 'checking') return <span className="text-sm text-parchment-400">Checking…</span>
  return null
}

export type UsernameCheck = 'idle' | 'checking' | 'available' | 'taken' | 'error'

/** Google's sign-in button: white, the "G", dark text (as Google's branding asks). */
export function GoogleButton({ onClick, disabled, busy }: { onClick: () => void; disabled?: boolean; busy?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className="flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-[#747775] bg-white px-4 font-[Roboto,'Segoe_UI',Arial,sans-serif] text-[0.95rem] font-medium text-[#1f1f1f] shadow-[0_2px_8px_-2px_rgb(0_0_0/0.6)] transition hover:bg-[#f2f2f2] focus-visible:outline-ember-400 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? <Spinner className="size-5 text-[#1f1f1f]" /> : <IconGoogle className="size-5" />}
      Continue with Google
    </button>
  )
}

/** Between Google and the email form: the brass divider with "or" over its cog. */
export function OrDivider() {
  return <LabelledDivider label="or" className="my-4" />
}

export function Spinner({ className = 'size-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`animate-spin ${className}`} aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 00-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

/** A server error above the submit button (announced). Renders an empty live region when there's none. */
export function FormAlert({ message, tone = 'error' }: { message: ReactNode; tone?: 'error' | 'info' }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} aria-live={tone === 'error' ? 'assertive' : 'polite'}>
      {message && (
        <p
          className={`mb-3 rounded-lg border px-3 py-2.5 text-sm ${
            tone === 'error' ? 'border-rust-400/50 bg-rust-500/10 text-rust-300' : 'border-verdigris-400/40 bg-verdigris-500/10 text-verdigris-300'
          }`}
        >
          {message}
        </p>
      )}
    </div>
  )
}

/** A checkbox with its label, 44 px tall. */
export function Checkbox({
  checked,
  onChange,
  children,
  id,
  inputRef,
  describedBy,
  invalid,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
  id?: string
  inputRef?: Ref<HTMLInputElement>
  describedBy?: string
  invalid?: boolean
}) {
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-parchment-200">
      <input
        id={id}
        ref={inputRef}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        className="size-5 shrink-0 cursor-pointer accent-bronze-400"
      />
      <span>{children}</span>
    </label>
  )
}

/** The brass submit button, with a spinner while working. */
export function SubmitButton({ children, busy, disabled }: { children: ReactNode; busy?: boolean; disabled?: boolean }) {
  return (
    <button type="submit" className="btn-brass h-14 w-full text-lg" disabled={disabled || busy} aria-busy={busy || undefined}>
      {busy && <Spinner className="size-5" />}
      {children}
    </button>
  )
}
