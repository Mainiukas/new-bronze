import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { MfaFactor } from '../../auth/backend'
import { authErrorMessage } from '../../auth/messages'
import type { AuthState } from '../../auth/store'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { useT } from '../../i18n'
import { FormAlert, Spinner, SubmitButton, TextField } from './fields'

type Mode = 'app' | 'sms' | 'recovery'

/**
 * The log-in step for accounts with two-factor authentication: the 6-digit
 * code from the authenticator app, or an SMS code (if they added one), or a
 * recovery code. Cancel logs out.
 */
export function MfaChallenge({ onDone }: { onDone: (state: AuthState) => void }) {
  const t = useT()
  const m = t.mfaLogin
  const auth = useAuth()
  const notify = useToast()
  const [factors, setFactors] = useState<MfaFactor[] | null>(null)
  const [mode, setMode] = useState<Mode>('app')
  const [code, setCode] = useState('')
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { getMfaState } = auth

  useEffect(() => {
    getMfaState().then(
      (state) => {
        const verified = state.factors.filter((factor) => factor.verified)
        setFactors(verified)
        if (!verified.some((factor) => factor.type === 'totp') && verified.some((factor) => factor.type === 'phone')) setMode('sms')
      },
      (failure) => setError(authErrorMessage(failure, t.authErrors)),
    )
  }, [getMfaState, t.authErrors])
  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => window.clearTimeout(timer)
  }, [mode, challengeId])

  const totp = factors?.find((factor) => factor.type === 'totp')
  const sms = factors?.find((factor) => factor.type === 'phone')

  const switchTo = (next: Mode) => {
    setMode(next)
    setCode('')
    setError(null)
    setChallengeId(null)
  }

  const sendSms = async () => {
    if (!sms) return
    setBusy(true)
    setError(null)
    try {
      setChallengeId(await auth.sendMfaSms(sms.id))
    } catch (failure) {
      setError(authErrorMessage(failure, t.authErrors))
    } finally {
      setBusy(false)
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy || !code.trim()) return
    setBusy(true)
    setError(null)
    try {
      if (mode === 'recovery') {
        const state = await auth.useRecoveryCode(code)
        notify(m.recoveryUsed)
        onDone(state)
      } else if (mode === 'sms' && sms && challengeId) {
        onDone(await auth.verifyMfaSms(sms.id, challengeId, code))
      } else if (totp) {
        onDone(await auth.verifyMfa(code, totp.id))
      }
    } catch (failure) {
      setError(authErrorMessage(failure, t.authErrors))
      setCode('')
      inputRef.current?.focus()
    } finally {
      setBusy(false)
    }
  }

  const link = 'min-h-11 px-2 text-sm font-semibold text-brass-300 underline-offset-2 hover:text-brass-200 hover:underline'

  return (
    <div role="group" aria-labelledby="mfa-title">
      <h2 id="mfa-title" className="font-display text-2xl font-extrabold tracking-[0.1em] text-parchment-50 uppercase">
        {m.title}
      </h2>
      {!factors ? (
        error ? (
          <FormAlert message={error} />
        ) : (
          <p className="mt-6 flex items-center gap-3 text-parchment-300" role="status">
            <Spinner />
          </p>
        )
      ) : (
        <form onSubmit={(event) => void submit(event)} noValidate className="mt-2">
          <p className="mb-5 text-sm text-parchment-300">
            {mode === 'recovery' ? m.recoveryIntro : mode === 'sms' && sms?.phone && challengeId ? m.smsSent(sms.phone) : m.intro}
          </p>
          {mode === 'sms' && !challengeId ? (
            <button type="button" className="btn-brass mb-4 h-14 w-full text-lg" disabled={busy} onClick={() => void sendSms()}>
              {busy && <Spinner />}
              {m.sendSms}
            </button>
          ) : (
            <>
              <TextField
                label={mode === 'recovery' ? m.recoveryCode : m.code}
                inputRef={inputRef}
                value={code}
                onChange={(value) => setCode(mode === 'recovery' ? value : value.replace(/\D/g, '').slice(0, 6))}
                inputMode={mode === 'recovery' ? 'text' : 'numeric'}
                autoComplete="one-time-code"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={mode === 'recovery' ? 14 : 6}
              />
              <FormAlert message={error} />
              <SubmitButton busy={busy} disabled={mode === 'recovery' ? code.trim().length < 10 : code.length !== 6}>
                {mode === 'recovery' ? m.recoveryButton : m.verify}
              </SubmitButton>
            </>
          )}
          <div className="mt-4 flex flex-col items-center gap-1">
            {mode !== 'app' && totp && (
              <button type="button" className={link} onClick={() => switchTo('app')}>
                {m.useApp}
              </button>
            )}
            {mode !== 'sms' && sms && (
              <button type="button" className={link} onClick={() => switchTo('sms')}>
                {m.sendSms}
              </button>
            )}
            {mode !== 'recovery' && totp && (
              <button type="button" className={link} onClick={() => switchTo('recovery')}>
                {m.useRecovery}
              </button>
            )}
            <button type="button" className="min-h-11 px-2 text-sm font-semibold text-parchment-300 hover:text-parchment-50" onClick={() => void auth.signOut()}>
              {m.cancel}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
