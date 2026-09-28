import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AuthError, signupConsent, type Profile } from '../../auth/backend'
import { authErrorMessage } from '../../auth/messages'
import { suggestUsername, validateUsername } from '../../auth/validation'
import { useAuth } from '../../hooks/useAuth'
import { AgeQuestion, MarketingConsent, TermsConsent, UnderAgeNotice, type AgeAnswer } from './Consents'
import { FormAlert, SubmitButton, TextField, UsernameStatus } from './fields'
import { useUsernameCheck } from './useUsernameCheck'

/**
 * First sign-in with Google: before the Bronze account is created, pick a
 * username (prefilled from the Google name, same rules and live check as
 * registering), answer the age question and accept the Terms, exactly as on
 * the Register form. Declining (or being under 14) deletes what Google shared.
 */
export function ChooseUsername({ onChosen, onDecline }: { onChosen: (profile: Profile) => void; onDecline: () => void }) {
  const auth = useAuth()
  const [username, setUsername] = useState(() => suggestUsername(auth.user?.displayName ?? auth.user?.email?.split('@')[0]))
  const [age, setAge] = useState<AgeAnswer>(null)
  const [agreed, setAgreed] = useState(false)
  const [marketing, setMarketing] = useState(false)
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refused, setRefused] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const ageRef = useRef<HTMLInputElement>(null)
  const agreeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.select(), 0)
    return () => window.clearTimeout(timer)
  }, [])

  const name = username.trim()
  const check = useUsernameCheck(username, auth.isUsernameAvailable)
  const fieldError =
    validateUsername(name) ?? (check === 'taken' || refused === name ? 'That username is taken.' : check === 'error' ? 'Couldn’t check this username. Try again.' : null)
  const ageError = age === null ? 'Choose your age group.' : null
  const agreeError = agreed ? null : 'Agree to the Terms and Privacy Policy to continue.'
  const tooYoung = age === 'under-14'
  const valid = !fieldError && check === 'available' && !ageError && !agreeError && !tooYoung

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy || tooYoung) return
    if (!valid || age === null) {
      setTried(true)
      ;(fieldError || check !== 'available' ? inputRef : ageError ? ageRef : agreeRef).current?.focus()
      return
    }
    setBusy(true)
    setError(null)
    try {
      onChosen(await auth.chooseUsername(name, signupConsent(age, marketing)))
    } catch (failure) {
      if (failure instanceof AuthError && failure.code === 'username-taken') setRefused(name)
      setError(authErrorMessage(failure))
      setBusy(false)
    }
  }

  return (
    <form noValidate onSubmit={submit} aria-labelledby="username-title">
      <div className="mb-5 flex items-center gap-3">
        {auth.user?.avatarUrl && (
          <img src={auth.user.avatarUrl} alt="" referrerPolicy="no-referrer" className="size-12 rounded-full border-2 border-bronze-400/60 object-cover" />
        )}
        <div className="min-w-0">
          <h2 id="username-title" className="font-display text-2xl font-extrabold tracking-[0.1em] text-parchment-50 uppercase">
            Finish your account
          </h2>
          <p className="truncate text-sm text-parchment-300">Signed in with Google as {auth.user?.email ?? auth.user?.displayName ?? 'your Google account'}</p>
        </div>
      </div>
      <p className="mb-4 text-sm text-parchment-300">Choose the name other players will see. Your Bronze account is only created when you continue.</p>
      <TextField
        label="Username"
        inputRef={inputRef}
        value={username}
        onChange={(value) => {
          setUsername(value)
          setError(null)
        }}
        error={name ? fieldError : validateUsername(name)}
        hint="3–20 characters: letters, numbers and _."
        aside={<UsernameStatus status={check} />}
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={20}
        required
      />
      <AgeQuestion
        name="google-age"
        value={age}
        onChange={(value) => {
          setAge(value)
          if (value !== '18+') setMarketing(false)
        }}
        error={tried ? ageError : null}
        firstRef={ageRef}
      />
      {tooYoung ? (
        <UnderAgeNotice onKeepPlaying={onDecline} keepPlayingLabel="Delete this sign-in and play as a guest" />
      ) : (
        <>
          <TermsConsent id="google-agree" checked={agreed} onChange={setAgreed} error={tried ? agreeError : null} inputRef={agreeRef} />
          {age === '18+' && <MarketingConsent id="google-marketing" checked={marketing} onChange={setMarketing} />}
          <div className="mt-3">
            <FormAlert message={error} />
            <SubmitButton busy={busy} disabled={!valid}>
              Create account
            </SubmitButton>
          </div>
        </>
      )}
      <p className="mt-5 text-center">
        <button type="button" onClick={onDecline} className="min-h-11 px-2 text-sm font-semibold text-parchment-200 underline-offset-2 hover:text-parchment-50 hover:underline">
          Not now: cancel and delete what Google shared
        </button>
      </p>
    </form>
  )
}
