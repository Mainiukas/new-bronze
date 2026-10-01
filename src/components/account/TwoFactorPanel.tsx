import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type { MfaState, TotpEnrollment } from '../../auth/backend'
import { authErrorMessage } from '../../auth/messages'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { useT } from '../../i18n'
import { FEATURES } from '../../lib/features'
import { FormAlert, Spinner, TextField } from '../auth/fields'
import { Actions, Panel, StatusPill } from './parts'

type Step =
  | { kind: 'view' }
  | { kind: 'enrolling'; enrollment: TotpEnrollment }
  | { kind: 'codes'; codes: string[] }
  | { kind: 'confirm'; purpose: 'disable' | 'regenerate'; challengeId?: string }
  | { kind: 'sms'; factorId: string; challengeId: string }

const cleanCode = (value: string) => value.replace(/\D/g, '').slice(0, 6)

/**
 * Two-factor authentication with an authenticator app (TOTP): set up with a
 * QR code and a first code, then 10 recovery codes shown once; turn off or
 * get new recovery codes with a current code. Optionally SMS codes to the
 * verified phone as a second method.
 */
export function TwoFactorPanel({ recoveryCodesLeft, onChanged }: { recoveryCodesLeft: number; onChanged: () => void }) {
  const t = useT()
  const w = t.security.twoFactor
  const auth = useAuth()
  const notify = useToast()
  const [mfa, setMfa] = useState<MfaState | null>(null)
  const [step, setStep] = useState<Step>({ kind: 'view' })
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phoneEnabled, setPhoneEnabled] = useState(false)
  const { getMfaState, serviceSettings } = auth

  const load = useCallback(() => {
    getMfaState().then(setMfa, (failure) => setError(authErrorMessage(failure, t.authErrors)))
  }, [getMfaState, t.authErrors])
  useEffect(load, [load])
  useEffect(() => {
    // SMS codes need phone verification, which may be switched off (lib/features.ts).
    if (!FEATURES.phoneVerification) return
    serviceSettings().then(
      (settings) => setPhoneEnabled(settings.phone),
      () => setPhoneEnabled(false),
    )
  }, [serviceSettings])

  const run = async (work: () => Promise<void>) => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await work()
    } catch (failure) {
      setError(authErrorMessage(failure, t.authErrors))
    } finally {
      setBusy(false)
    }
  }

  if (!mfa) return <Panel title={w.title} id="mfa-title">{error ? <FormAlert message={error} /> : <Spinner />}</Panel>

  const totp = mfa.factors.find((factor) => factor.type === 'totp' && factor.verified)
  const sms = mfa.factors.find((factor) => factor.type === 'phone' && factor.verified)
  const on = !!(totp || sms)
  const phone = auth.user?.phone ? `+${auth.user.phone.replace(/^\+/, '')}` : null

  const start = () =>
    run(async () => {
      setStep({ kind: 'enrolling', enrollment: await auth.enrollTotp() })
      setCode('')
    })

  const confirmEnrollment = (event: FormEvent, enrollment: TotpEnrollment) => {
    event.preventDefault()
    void run(async () => {
      await auth.confirmMfaFactor(enrollment.factorId, code)
      const codes = await auth.regenerateRecoveryCodes()
      setStep({ kind: 'codes', codes })
      setCode('')
      load()
      onChanged()
    })
  }

  const confirmWithCode = (event: FormEvent, purpose: 'disable' | 'regenerate', challengeId?: string) => {
    event.preventDefault()
    const factor = totp ?? sms
    if (!factor) return
    void run(async () => {
      // A current code first: from the app, or (SMS-only accounts) the SMS just sent.
      if (factor.type === 'totp') await auth.confirmMfaFactor(factor.id, code)
      else if (challengeId) await auth.confirmMfaSmsFactor(factor.id, challengeId, code)
      if (purpose === 'regenerate') {
        setStep({ kind: 'codes', codes: await auth.regenerateRecoveryCodes() })
      } else {
        for (const item of mfa.factors) await auth.removeMfaFactor(item.id)
        await auth.clearRecoveryCodes().catch(() => undefined)
        notify(w.disabled)
        setStep({ kind: 'view' })
      }
      setCode('')
      load()
      onChanged()
    })
  }

  const startSms = () =>
    run(async () => {
      if (!phone) return
      const factorId = await auth.enrollPhoneFactor(phone)
      const challengeId = await auth.sendMfaSms(factorId)
      setStep({ kind: 'sms', factorId, challengeId })
      setCode('')
    })

  const confirmSms = (event: FormEvent, factorId: string, challengeId: string) => {
    event.preventDefault()
    void run(async () => {
      await auth.confirmMfaSmsFactor(factorId, challengeId, code)
      setStep({ kind: 'view' })
      setCode('')
      notify(w.enabled)
      load()
    })
  }

  const codeField = <TextField label={w.code} value={code} onChange={(value) => setCode(cleanCode(value))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="max-w-48" />
  const cancel = (
    <button
      type="button"
      className="btn btn-ghost"
      onClick={() => {
        setStep({ kind: 'view' })
        setCode('')
        setError(null)
      }}
    >
      {t.common.cancel}
    </button>
  )

  return (
    <Panel title={w.title} intro={w.intro} id="mfa-title" aside={<StatusPill on={on}>{on ? w.on : w.off}</StatusPill>}>
      {step.kind === 'enrolling' && (
        <form onSubmit={(event) => confirmEnrollment(event, step.enrollment)} className="flex flex-col gap-3">
          <p className="text-parchment-100">{w.scan}</p>
          <img src={step.enrollment.qrCode} alt={w.qrAlt} width={200} height={200} className="size-50 rounded-lg bg-white p-2" />
          <p className="text-sm text-parchment-300">{w.secret}</p>
          <code className="self-start rounded-md border border-bronze-500/30 bg-soot-950/70 px-3 py-2 font-mono text-sm tracking-wider break-all text-parchment-50 select-all">
            {step.enrollment.secret}
          </code>
          {codeField}
          <FormAlert message={error} />
          <Actions>
            <button type="submit" className="btn btn-primary" disabled={busy || code.length !== 6}>
              {busy && <Spinner className="size-4" />}
              {w.confirm}
            </button>
            {cancel}
          </Actions>
        </form>
      )}

      {step.kind === 'codes' && <RecoveryCodes codes={step.codes} onDone={() => setStep({ kind: 'view' })} />}

      {step.kind === 'confirm' && (
        <form onSubmit={(event) => confirmWithCode(event, step.purpose, step.challengeId)} className="flex flex-col gap-3">
          <p className="text-parchment-100">{step.challengeId && phone ? w.smsSent(phone) : step.purpose === 'disable' ? w.disableIntro : w.regenerateIntro}</p>
          {codeField}
          <FormAlert message={error} />
          <Actions>
            <button type="submit" className={`btn ${step.purpose === 'disable' ? 'border border-rust-400/60 bg-rust-500/15 text-rust-300' : 'btn-primary'}`} disabled={busy || code.length !== 6}>
              {busy && <Spinner className="size-4" />}
              {step.purpose === 'disable' ? w.disable : w.regenerate}
            </button>
            {cancel}
          </Actions>
        </form>
      )}

      {step.kind === 'sms' && (
        <form onSubmit={(event) => confirmSms(event, step.factorId, step.challengeId)} className="flex flex-col gap-3">
          <p className="text-parchment-100">{phone && w.smsSent(phone)}</p>
          {codeField}
          <FormAlert message={error} />
          <Actions>
            <button type="submit" className="btn btn-primary" disabled={busy || code.length !== 6}>
              {busy && <Spinner className="size-4" />}
              {w.smsEnable}
            </button>
            {cancel}
          </Actions>
        </form>
      )}

      {step.kind === 'view' && (
        <>
          {on ? (
            <ul className="flex flex-col gap-1 text-parchment-100">
              {totp && <li>✓ {w.app}</li>}
              {sms && phone && <li>✓ {w.sms} ({phone})</li>}
              {totp && <li className="text-sm text-parchment-300">{w.codesLeft(recoveryCodesLeft)}</li>}
            </ul>
          ) : null}
          <FormAlert message={error} />
          <Actions>
            {!totp && (
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void start()}>
                {busy && <Spinner className="size-4" />}
                {w.enable}
              </button>
            )}
            {totp && (
              <button type="button" className="btn btn-ghost" onClick={() => setStep({ kind: 'confirm', purpose: 'regenerate' })}>
                {w.regenerate}
              </button>
            )}
            {on && (
              <button
                type="button"
                className="btn border border-rust-400/60 bg-rust-500/15 text-rust-300 hover:bg-rust-500/25"
                disabled={busy}
                onClick={() =>
                  !totp && sms
                    ? void run(async () => setStep({ kind: 'confirm', purpose: 'disable', challengeId: await auth.sendMfaSms(sms.id) }))
                    : setStep({ kind: 'confirm', purpose: 'disable' })
                }
              >
                {w.disable}
              </button>
            )}
          </Actions>
          {phoneEnabled && (
            <div className="flex flex-col gap-2 border-t border-bronze-500/20 pt-3">
              {phone ? (
                <>
                  <p className="text-sm text-parchment-300">{w.smsIntro(phone)}</p>
                  <Actions>
                    {sms ? (
                      <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void run(async () => (await auth.removeMfaFactor(sms.id), load()))}>
                        {w.smsDisable}
                      </button>
                    ) : (
                      <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void startSms()}>
                        {w.smsEnable}
                      </button>
                    )}
                  </Actions>
                </>
              ) : (
                <p className="text-sm text-parchment-400">{w.smsNeedsPhone}</p>
              )}
            </div>
          )}
        </>
      )}
    </Panel>
  )
}

/** The ten codes, shown once: copy, download, then "I've saved them". */
function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const t = useT()
  const w = t.security.twoFactor
  const [copied, setCopied] = useState(false)
  const text = codes.join('\n')

  const copy = () => {
    navigator.clipboard.writeText(text).then(
      () => setCopied(true),
      () => setCopied(false),
    )
  }
  const download = () => {
    const url = URL.createObjectURL(new Blob([`Bronze recovery codes\n\n${text}\n`], { type: 'text/plain' }))
    const link = Object.assign(document.createElement('a'), { href: url, download: 'bronze-recovery-codes.txt' })
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-display text-lg font-bold tracking-[0.08em] text-parchment-50 uppercase">{w.recoveryTitle}</h3>
      <p className="max-w-prose text-sm text-parchment-200">{w.recoveryIntro}</p>
      <ol className="grid grid-cols-2 gap-2 rounded-lg border border-brass-400/40 bg-soot-950/80 p-4 font-mono text-base tracking-wider text-parchment-50 select-all sm:grid-cols-5 sm:text-sm">
        {codes.map((recoveryCode) => (
          <li key={recoveryCode}>{recoveryCode}</li>
        ))}
      </ol>
      <Actions>
        <button type="button" className="btn btn-ghost" onClick={copy} aria-live="polite">
          {copied ? w.copied : w.copy}
        </button>
        <button type="button" className="btn btn-ghost" onClick={download}>
          {w.download}
        </button>
        <button type="button" className="btn btn-primary" onClick={onDone}>
          {w.savedThem}
        </button>
      </Actions>
    </div>
  )
}
