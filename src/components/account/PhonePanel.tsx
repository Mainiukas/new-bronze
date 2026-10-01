import { useEffect, useId, useState, type FormEvent } from 'react'
import { AuthError } from '../../auth/backend'
import { authErrorMessage } from '../../auth/messages'
import { countriesByName, countryFlag, DEFAULT_PHONE_COUNTRY, toE164 } from '../../data/countries'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { useI18n } from '../../i18n'
import { FormAlert, Spinner, TextField } from '../auth/fields'
import { IconChevronDown } from '../icons'
import { Actions, Panel, selectClass, StatusPill } from './parts'

const RESEND_SECONDS = 60

/**
 * Add (or change) a phone number, confirmed with an SMS code: Supabase phone
 * auth (updateUser({ phone }) then verifyOtp type 'phone_change'). Needs an
 * SMS provider set up in Supabase; without one this says it isn't available.
 * At most 5 codes sent or tried an hour (checked by the database).
 */
export function PhonePanel() {
  const { t, locale } = useI18n()
  const w = t.security.phone
  const auth = useAuth()
  const notify = useToast()
  const [available, setAvailable] = useState<boolean | null>(null)
  const [editing, setEditing] = useState(false)
  const [country, setCountry] = useState(DEFAULT_PHONE_COUNTRY)
  const [number, setNumber] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [resendAt, setResendAt] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const countryId = useId()
  const { serviceSettings } = auth
  const verifiedPhone = auth.user?.phone ? `+${auth.user.phone.replace(/^\+/, '')}` : null

  useEffect(() => {
    serviceSettings().then(
      (settings) => setAvailable(settings.phone),
      () => setAvailable(false),
    )
  }, [serviceSettings])
  useEffect(() => {
    if (resendAt <= Date.now()) return
    const timer = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(timer)
  }, [resendAt])
  const wait = Math.max(0, Math.ceil((resendAt - now) / 1000))

  /** Counts towards the 5-an-hour limit; false (with the message shown) when used up. */
  const allowed = async () => {
    if (await auth.notePhoneAttempt()) return true
    setError(w.tooMany)
    return false
  }

  const send = async (phone: string) => {
    setBusy(true)
    setError(null)
    try {
      if (!(await allowed())) return
      await auth.startPhoneVerification(phone)
      setSentTo(phone)
      setCode('')
      setResendAt(Date.now() + RESEND_SECONDS * 1000)
      setNow(Date.now())
    } catch (failure) {
      if (failure instanceof AuthError && failure.code === 'unavailable') setAvailable(false)
      else setError(authErrorMessage(failure, t.authErrors))
    } finally {
      setBusy(false)
    }
  }

  const submitNumber = (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    const phone = toE164(country, number)
    if (!phone) return setError(w.invalid)
    void send(phone)
  }

  const submitCode = async (event: FormEvent) => {
    event.preventDefault()
    if (busy || !sentTo || code.length !== 6) return
    setBusy(true)
    setError(null)
    try {
      if (!(await allowed())) return
      await auth.confirmPhone(sentTo, code)
      notify(w.done)
      setSentTo(null)
      setEditing(false)
      setNumber('')
      setCode('')
    } catch (failure) {
      setError(authErrorMessage(failure, t.authErrors))
    } finally {
      setBusy(false)
    }
  }

  const header = { title: w.title, intro: w.intro, id: 'phone-title' }
  if (available === null) return <Panel {...header}>{<Spinner />}</Panel>
  if (!available)
    return (
      <Panel {...header}>
        <p className="rounded-lg border border-bronze-500/30 bg-soot-950/60 px-3 py-2.5 text-parchment-200">{w.unavailable}</p>
      </Panel>
    )

  if (verifiedPhone && !editing)
    return (
      <Panel {...header} aside={<StatusPill on>{t.profilePage.phoneVerified}</StatusPill>}>
        <p className="font-semibold text-parchment-50">{w.verified(verifiedPhone)}</p>
        <Actions>
          <button type="button" className="btn btn-ghost" onClick={() => setEditing(true)}>
            {w.change}
          </button>
        </Actions>
      </Panel>
    )

  return (
    <Panel {...header}>
      {sentTo ? (
        <form onSubmit={(event) => void submitCode(event)} noValidate className="flex flex-col gap-2">
          <p className="text-parchment-100">{w.sentTo(sentTo)}</p>
          <TextField
            label={w.code}
            value={code}
            onChange={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            className="max-w-48"
          />
          <FormAlert message={error} />
          <Actions>
            <button type="submit" className="btn btn-primary" disabled={busy || code.length !== 6}>
              {busy && <Spinner className="size-4" />}
              {w.verify}
            </button>
            <button type="button" className="btn btn-ghost" disabled={busy || wait > 0} onClick={() => void send(sentTo)}>
              {wait > 0 ? w.resendIn(wait) : w.resend}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setSentTo(null)}>
              {t.common.cancel}
            </button>
          </Actions>
        </form>
      ) : (
        <form onSubmit={submitNumber} noValidate className="flex flex-col gap-2">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
            <div>
              <label htmlFor={countryId} className="mb-1.5 block font-display text-sm font-bold tracking-[0.12em] text-parchment-200 uppercase">
                {w.country}
              </label>
              <div className="relative">
                <select id={countryId} value={country} onChange={(event) => setCountry(event.target.value)} className={selectClass} autoComplete="tel-country-code">
                  {countriesByName(locale).map((item) => (
                    <option key={item.code} value={item.code}>
                      {countryFlag(item.code)} {item.name} (+{item.dial})
                    </option>
                  ))}
                </select>
                <IconChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-bronze-300" />
              </div>
            </div>
            <TextField label={w.number} type="tel" inputMode="tel" autoComplete="tel-national" value={number} onChange={setNumber} />
          </div>
          <FormAlert message={error} />
          <Actions>
            <button type="submit" className="btn btn-primary" disabled={busy || !number.trim()}>
              {busy && <Spinner className="size-4" />}
              {w.send}
            </button>
            {editing && (
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>
                {t.common.cancel}
              </button>
            )}
          </Actions>
        </form>
      )}
    </Panel>
  )
}
