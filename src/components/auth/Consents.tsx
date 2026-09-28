import type { Ref } from 'react'
import type { AgeBand } from '../../auth/backend'
import { MIN_ACCOUNT_AGE } from '../../legal/operator'
import { Checkbox } from './fields'

/** The answer to "How old are you?": an age band, or too young for an account. */
export type AgeAnswer = AgeBand | 'under-14' | null

const AGE_OPTIONS: { value: Exclude<AgeAnswer, null>; label: string }[] = [
  { value: 'under-14', label: `Under ${MIN_ACCOUNT_AGE}` },
  { value: '14-17', label: `${MIN_ACCOUNT_AGE} to 17` },
  { value: '18+', label: '18 or over' },
]

/**
 * "How old are you?" as three neutral choices (no birth date). Under 14 can't
 * have an account; 14–17 can, without marketing emails.
 */
export function AgeQuestion({
  name,
  value,
  onChange,
  error,
  firstRef,
}: {
  name: string
  value: AgeAnswer
  onChange: (value: Exclude<AgeAnswer, null>) => void
  error: string | null
  firstRef?: Ref<HTMLInputElement>
}) {
  return (
    <fieldset className="min-w-0" aria-describedby={`${name}-message`} aria-invalid={error ? true : undefined}>
      <legend className="mb-1.5 font-display text-sm font-bold tracking-[0.12em] text-parchment-200 uppercase">How old are you?</legend>
      <div className="grid grid-cols-3 gap-2">
        {AGE_OPTIONS.map((option, i) => (
          <label
            key={option.value}
            className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg border px-2 text-center text-sm font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brass-300 ${
              value === option.value ? 'border-bronze-300/80 bg-bronze-500/25 text-parchment-50' : 'border-bronze-500/35 bg-soot-950/60 text-parchment-200 hover:border-bronze-300/60'
            }`}
          >
            <input
              ref={i === 0 ? firstRef : undefined}
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
      <p id={`${name}-message`} aria-live="polite" className={`mt-1 mb-2 min-h-5 text-sm ${error ? 'text-rust-300' : 'text-parchment-300'}`}>
        {error ?? 'We don’t ask for your birth date.'}
      </p>
    </fieldset>
  )
}

/** Shown instead of the rest of the form for under-14s. */
export function UnderAgeNotice({ onKeepPlaying, keepPlayingLabel = 'Keep playing as a guest' }: { onKeepPlaying: () => void; keepPlayingLabel?: string }) {
  return (
    <div role="status" className="mb-4 rounded-lg border border-verdigris-400/40 bg-verdigris-500/10 px-3 py-3 text-sm text-verdigris-300">
      <p>
        You need to be {MIN_ACCOUNT_AGE} or over to have an account. You can still play every offline mode as a guest, and nothing about you is stored
        on our servers.
      </p>
      <button type="button" onClick={onKeepPlaying} className="btn btn-ghost mt-3 w-full">
        {keepPlayingLabel}
      </button>
    </div>
  )
}

/** The required, unticked Terms and Privacy Policy box. */
export function TermsConsent({
  id,
  checked,
  onChange,
  error,
  inputRef,
}: {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  error: string | null
  inputRef?: Ref<HTMLInputElement>
}) {
  return (
    <div>
      <Checkbox id={id} checked={checked} onChange={onChange} inputRef={inputRef} describedBy={`${id}-message`} invalid={!!error}>
        I agree to the{' '}
        <a href="#/terms" target="_blank" rel="noopener" className="font-semibold text-brass-300 underline underline-offset-2 hover:text-brass-200">
          Terms of Service<span className="sr-only"> (opens in a new tab)</span>
        </a>{' '}
        and the{' '}
        <a href="#/privacy" target="_blank" rel="noopener" className="font-semibold text-brass-300 underline underline-offset-2 hover:text-brass-200">
          Privacy Policy<span className="sr-only"> (opens in a new tab)</span>
        </a>
        <span className="text-parchment-300"> (required)</span>
      </Checkbox>
      <p id={`${id}-message`} aria-live="polite" className="min-h-5 text-sm text-rust-300">
        {error}
      </p>
    </div>
  )
}

/** The separate, optional, unticked marketing box (offered to 18 and over only). */
export function MarketingConsent({ id, checked, onChange }: { id: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <Checkbox id={id} checked={checked} onChange={onChange}>
      Email me news about Bronze <span className="text-parchment-300">(optional; unsubscribe any time)</span>
    </Checkbox>
  )
}
