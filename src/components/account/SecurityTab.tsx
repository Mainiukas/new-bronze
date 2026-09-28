import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { AuthError, type LinkedIdentity, type SignInRecord } from '../../auth/backend'
import { authErrorMessage } from '../../auth/messages'
import { rememberReturnTo } from '../../auth/redirect'
import { validateEmail, validatePasswordChange } from '../../auth/validation'
import { accountPath } from '../../data/navigation'
import { useAccountDetails } from '../../hooks/useAccountDetails'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { useI18n } from '../../i18n'
import { describeUserAgent, maskIp } from '../../lib/device'
import { FEATURES } from '../../lib/features'
import { stripeConfigured } from '../../lib/stripe'
import { FormAlert, PasswordField, PasswordHint, Spinner, TextField } from '../auth/fields'
import { CardPanel } from './CardPanel'
import { Actions, Panel, StatusPill } from './parts'
import { PhonePanel } from './PhonePanel'
import { TwoFactorPanel } from './TwoFactorPanel'

/** Settings → Account → Security: email, password, 2FA, phone and card check (when switched on), linked accounts, sign-ins. */
export function SecurityTab() {
  const { details, error, reload } = useAccountDetails()
  if (!details) return error ? <FormAlert message={error} /> : <Loading />
  return (
    <>
      <EmailPanel />
      <PasswordPanel hasPassword={details.hasPassword} onChanged={reload} />
      <TwoFactorPanel recoveryCodesLeft={details.recoveryCodesLeft} onChanged={reload} />
      {FEATURES.phoneVerification && <PhonePanel />}
      {stripeConfigured && <CardPanel details={details} onChanged={reload} />}
      <LinkedAccountsPanel hasPassword={details.hasPassword} />
      <SignInsPanel />
    </>
  )
}

export function Loading() {
  const t = useI18n().t
  return (
    <p className="flex items-center gap-3 text-parchment-300" role="status">
      <Spinner /> {t.accountPage.loading}
    </p>
  )
}

function EmailPanel() {
  const { t } = useI18n()
  const w = t.security.email
  const auth = useAuth()
  const user = auth.user!
  const [email, setEmail] = useState('')
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: 'error' | 'info'; text: string } | null>(null)
  const emailError = validateEmail(email, t.validation)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setTouched(true)
    if (busy || emailError) return
    setBusy(true)
    setMessage(null)
    try {
      await auth.changeEmail(email)
      setMessage({ tone: 'info', text: w.sent })
      setEmail('')
      setTouched(false)
    } catch (failure) {
      setMessage({ tone: 'error', text: authErrorMessage(failure, t.authErrors) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} noValidate>
      <Panel
        title={w.title}
        id="email-title"
        aside={<StatusPill on={user.emailVerified !== false}>{user.emailVerified === false ? w.unverified : w.verified}</StatusPill>}
      >
        <p className="font-semibold break-all text-parchment-50">{user.email}</p>
        {user.pendingEmail && <p className="rounded-lg border border-brass-400/40 bg-brass-500/10 px-3 py-2.5 text-sm text-brass-200">{w.pending(user.pendingEmail)}</p>}
        <TextField
          label={w.newEmail}
          type="email"
          inputMode="email"
          value={email}
          onChange={setEmail}
          onBlur={() => email && setTouched(true)}
          error={touched ? emailError : null}
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          className="max-w-md"
        />
        <FormAlert message={message?.text} tone={message?.tone} />
        <Actions>
          <button type="submit" className="btn btn-primary" disabled={busy} aria-busy={busy || undefined}>
            {busy && <Spinner className="size-4" />}
            {w.send}
          </button>
        </Actions>
      </Panel>
    </form>
  )
}

function PasswordPanel({ hasPassword, onChanged }: { hasPassword: boolean; onChanged: () => void }) {
  const { t } = useI18n()
  const w = t.security.password
  const auth = useAuth()
  const notify = useToast()
  const [values, setValues] = useState({ current: '', next: '', confirm: '', nonce: '' })
  const [touched, setTouched] = useState(false)
  const [needsCode, setNeedsCode] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const errors = validatePasswordChange({ ...values, hasPassword }, t.validation)
  const field = (key: keyof typeof values) => (value: string) => setValues((prev) => ({ ...prev, [key]: value }))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setTouched(true)
    if (busy || errors.current || errors.next || errors.confirm) return
    setBusy(true)
    setError(null)
    try {
      if (hasPassword && !needsCode && !(await auth.checkPassword(values.current))) throw new AuthError('wrong-password')
      await auth.changePassword(values.next, needsCode ? values.nonce.trim() : undefined)
      notify(w.changed)
      setValues({ current: '', next: '', confirm: '', nonce: '' })
      setTouched(false)
      setNeedsCode(false)
      onChanged()
    } catch (failure) {
      if (failure instanceof AuthError && failure.code === 'reauth-needed' && !needsCode) {
        // Supabase wants proof of a recent log-in: it emails a code.
        await auth.sendReauthenticationCode().catch(() => undefined)
        setNeedsCode(true)
        setError(null)
      } else setError(authErrorMessage(failure, t.authErrors))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} noValidate>
      <Panel title={hasPassword ? w.title : w.setTitle} intro={hasPassword ? undefined : w.setIntro} id="password-title">
        <div className="grid max-w-md gap-1">
          {hasPassword && (
            <PasswordField
              label={w.current}
              value={values.current}
              onChange={field('current')}
              error={touched ? errors.current : null}
              autoComplete="current-password"
            />
          )}
          <PasswordField
            label={w.new}
            value={values.next}
            onChange={field('next')}
            error={touched ? errors.next : null}
            hint={<PasswordHint password={values.next} />}
            autoComplete="new-password"
          />
          <PasswordField
            label={w.confirm}
            value={values.confirm}
            onChange={field('confirm')}
            error={touched ? errors.confirm : null}
            autoComplete="new-password"
          />
          {needsCode && (
            <>
              <p className="mb-2 text-sm text-brass-200">{w.reauthIntro}</p>
              <TextField label={w.reauthCode} value={values.nonce} onChange={field('nonce')} inputMode="numeric" autoComplete="one-time-code" />
              <button type="button" className="mb-2 self-start text-sm font-semibold text-brass-300 hover:underline" onClick={() => void auth.sendReauthenticationCode()}>
                {w.reauthResend}
              </button>
            </>
          )}
        </div>
        <FormAlert message={error} />
        <Actions>
          <button type="submit" className="btn btn-primary" disabled={busy} aria-busy={busy || undefined}>
            {busy && <Spinner className="size-4" />}
            {hasPassword ? w.change : w.set}
          </button>
        </Actions>
      </Panel>
    </form>
  )
}

function LinkedAccountsPanel({ hasPassword }: { hasPassword: boolean }) {
  const { t } = useI18n()
  const w = t.security.linked
  const auth = useAuth()
  const [identities, setIdentities] = useState<LinkedIdentity[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { listIdentities } = auth

  const load = useCallback(() => {
    listIdentities().then(setIdentities, (failure) => setError(authErrorMessage(failure, t.authErrors)))
  }, [listIdentities, t.authErrors])
  useEffect(load, [load])

  if (!identities) return <Panel title={w.title} id="linked-title">{error ? <FormAlert message={error} /> : <Loading />}</Panel>
  const google = identities.find((identity) => identity.provider === 'google')
  const hasEmail = identities.some((identity) => identity.provider === 'email') || hasPassword
  const onlyOne = identities.length < 2

  const link = async () => {
    setBusy(true)
    setError(null)
    rememberReturnTo(accountPath('security'))
    try {
      await auth.linkGoogle()
    } catch (failure) {
      setError(authErrorMessage(failure, t.authErrors))
      setBusy(false)
    }
  }
  const unlink = async (identity: LinkedIdentity) => {
    setBusy(true)
    setError(null)
    try {
      await auth.unlinkIdentity(identity.id)
      load()
    } catch (failure) {
      setError(authErrorMessage(failure, t.authErrors))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel title={w.title} intro={w.intro} id="linked-title">
      <ul className="flex flex-col divide-y divide-bronze-500/15">
        <li className="flex flex-wrap items-center justify-between gap-3 py-2.5">
          <span className="font-semibold text-parchment-100">{w.email}</span>
          <StatusPill on={hasEmail}>{hasEmail ? w.linked : w.notLinked}</StatusPill>
        </li>
        <li className="flex flex-wrap items-center justify-between gap-3 py-2.5">
          <span className="font-semibold text-parchment-100">
            {w.google}
            {google?.email && <span className="ml-2 text-sm font-normal text-parchment-300">{google.email}</span>}
          </span>
          <span className="flex flex-wrap items-center gap-2">
            <StatusPill on={!!google}>{google ? w.linked : w.notLinked}</StatusPill>
            {google ? (
              <button type="button" className="btn btn-ghost min-h-10 text-sm" disabled={busy || onlyOne} onClick={() => void unlink(google)} title={onlyOne ? w.lastMethod : undefined}>
                {w.unlink}
              </button>
            ) : (
              <button type="button" className="btn btn-ghost min-h-10 text-sm" disabled={busy} onClick={() => void link()}>
                {w.link}
              </button>
            )}
          </span>
        </li>
      </ul>
      {google && onlyOne && <p className="text-sm text-parchment-400">{w.lastMethod}</p>}
      <FormAlert message={error} />
    </Panel>
  )
}

function SignInsPanel() {
  const { t, locale } = useI18n()
  const w = t.security.signIns
  const auth = useAuth()
  const notify = useToast()
  const [records, setRecords] = useState<SignInRecord[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { recentSignIns } = auth

  const load = useCallback(() => {
    recentSignIns().then(setRecords, (failure) => setError(authErrorMessage(failure, t.authErrors)))
  }, [recentSignIns, t.authErrors])
  useEffect(load, [load])

  const signOutOthers = async () => {
    setBusy(true)
    setError(null)
    try {
      await auth.signOutOtherDevices()
      notify(w.signedOutOthers)
      load()
    } catch (failure) {
      setError(authErrorMessage(failure, t.authErrors))
    } finally {
      setBusy(false)
    }
  }
  const when = (iso: string) => new Date(iso).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <Panel title={w.title} intro={w.intro} id="sign-ins-title">
      {!records ? (
        error ? <FormAlert message={error} /> : <Loading />
      ) : (
        <ul className="flex flex-col divide-y divide-bronze-500/15">
          {records.map((record) => {
            const device = describeUserAgent(record.userAgent)
            return (
              <li key={record.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5">
                <span className="font-semibold text-parchment-100">
                  {w.device(device.browser, device.system)}
                  {record.current && (
                    <span className="ml-2 rounded-full border border-verdigris-400/50 px-2 py-0.5 text-xs font-bold tracking-wide text-verdigris-300 uppercase">{w.thisDevice}</span>
                  )}
                </span>
                <span className="text-sm text-parchment-300">
                  {w.signedIn(when(record.signedInAt))} · {w.lastActive(when(record.lastActiveAt))}
                  {record.ip && <span className="ml-2 font-mono text-xs text-parchment-400">{maskIp(record.ip)}</span>}
                </span>
              </li>
            )
          })}
        </ul>
      )}
      <FormAlert message={records ? error : null} />
      <Actions>
        <button type="button" className="btn btn-ghost" disabled={busy || (records?.length ?? 0) < 2} onClick={() => void signOutOthers()}>
          {busy && <Spinner className="size-4" />}
          {w.signOutOthers}
        </button>
      </Actions>
    </Panel>
  )
}
