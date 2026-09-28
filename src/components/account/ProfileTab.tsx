import { useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router'
import { AuthError } from '../../auth/backend'
import { authErrorMessage } from '../../auth/messages'
import { rememberReturnTo } from '../../auth/redirect'
import { canChangeUsername, nextUsernameChange, validateUsernameChange } from '../../auth/validation'
import { PRESET_AVATARS, PRESET_PREFIX, presetAvatar } from '../../data/avatars'
import { countriesByName, countryFlag } from '../../data/countries'
import { accountPath, profilePath } from '../../data/navigation'
import { useAccountDetails } from '../../hooks/useAccountDetails'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { useI18n } from '../../i18n'
import { checkAvatarFile, squareAvatar } from '../../lib/image'
import { FormAlert, PasswordField, Spinner, TextField, UsernameStatus } from '../auth/fields'
import { useUsernameCheck } from '../auth/useUsernameCheck'
import { IconCheck, IconChevronDown } from '../icons'
import { Avatar } from '../ProfileChip'
import { Actions, Panel, selectClass, textareaClass } from './parts'

const BIO_MAX = 160

/** Settings → Account → Profile: avatar, bio and country, and the username. */
export function ProfileTab() {
  const { t } = useI18n()
  const auth = useAuth()
  const { details, error, reload } = useAccountDetails()
  const profile = auth.profile!
  return (
    <>
      <AvatarPanel />
      <AboutPanel key={`${profile.bio}|${profile.country}`} />
      {details ? (
        <UsernamePanel hasPassword={details.hasPassword} changedAt={details.usernameChangedAt} onChanged={reload} />
      ) : (
        error && <FormAlert message={error} />
      )}
      <p className="text-center">
        <Link to={profilePath(profile.username)} className="font-semibold text-brass-300 underline-offset-2 hover:underline">
          {t.accountPage.profile.viewProfile} →
        </Link>
      </p>
    </>
  )
}

function AvatarPanel() {
  const { t } = useI18n()
  const w = t.accountPage.profile
  const auth = useAuth()
  const notify = useToast()
  const profile = auth.profile!
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const groupId = useId()
  const chosen = profile.chosenAvatar ?? null

  const choose = async (value: string | null) => {
    if (busy) return
    setBusy(value ?? 'none')
    setError(null)
    try {
      await auth.setAvatar(value)
      notify(w.avatarSaved)
    } catch (failure) {
      setError(authErrorMessage(failure, t.authErrors))
    } finally {
      setBusy(null)
    }
  }

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || busy) return
    const problem = checkAvatarFile(file)
    if (problem) return setError(problem === 'too-large' ? w.tooLarge : w.wrongType)
    setBusy('upload')
    setError(null)
    try {
      const image = await squareAvatar(file).catch(() => {
        throw new AuthError('invalid-input', w.unreadable)
      })
      await auth.uploadAvatar(image)
      notify(w.avatarSaved)
    } catch (failure) {
      setError(failure instanceof AuthError && failure.message === w.unreadable ? w.unreadable : authErrorMessage(failure, t.authErrors))
    } finally {
      setBusy(null)
    }
  }

  const option = (value: string | null, label: string, picture: string | null) => {
    const selected = value === chosen || (value === null && !chosen)
    return (
      <button
        key={value ?? 'none'}
        type="button"
        role="radio"
        aria-checked={selected}
        aria-label={label}
        title={label}
        disabled={!!busy}
        onClick={() => void choose(value)}
        className={`relative grid place-items-center rounded-full p-1 transition focus-visible:outline-ember-400 disabled:opacity-60 ${
          selected ? 'bg-brass-300/25 shadow-[0_0_0_2px_rgb(240_215_138/0.8)]' : 'hover:bg-bronze-500/20'
        }`}
      >
        <Avatar name={profile.username} url={picture} className="size-14 text-2xl" />
        {selected && (
          <span aria-hidden="true" className="absolute -right-0.5 -bottom-0.5 grid size-6 place-items-center rounded-full border-2 border-soot-950 bg-brass-300 text-soot-950">
            <IconCheck className="size-3.5" strokeWidth={3} />
          </span>
        )}
        {busy === (value ?? 'none') && <Spinner className="absolute size-6 text-parchment-50" />}
      </button>
    )
  }

  // The photo from Google (if any) stays available as "no chosen avatar".
  const uploaded = chosen && !presetAvatar(chosen) ? chosen : null

  return (
    <Panel title={w.avatar} intro={w.avatarIntro} id="avatar-title" aside={<Avatar name={profile.username} url={profile.avatarUrl} className="size-20 text-4xl" />}>
      <div>
        <p id={groupId} className="mb-2 font-display text-sm font-bold tracking-[0.12em] text-parchment-200 uppercase">
          {w.presets}
        </p>
        <div role="radiogroup" aria-labelledby={groupId} className="flex flex-wrap gap-2">
          {option(null, w.noAvatar, null)}
          {uploaded && option(uploaded, w.upload, uploaded)}
          {PRESET_AVATARS.map((preset) => option(`${PRESET_PREFIX}${preset.id}`, w.presetNames[preset.id] ?? preset.id, `${PRESET_PREFIX}${preset.id}`))}
        </div>
      </div>
      <Actions>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(event) => void upload(event)} />
        <button type="button" className="btn btn-ghost" disabled={!!busy} onClick={() => fileRef.current?.click()} aria-busy={busy === 'upload' || undefined}>
          {busy === 'upload' && <Spinner className="size-4" />}
          {busy === 'upload' ? w.uploading : w.upload}
        </button>
        <span className="text-sm text-parchment-400">{w.uploadHint}</span>
      </Actions>
      <FormAlert message={error} />
    </Panel>
  )
}

function AboutPanel() {
  const { t, locale } = useI18n()
  const w = t.accountPage.profile
  const auth = useAuth()
  const notify = useToast()
  const profile = auth.profile!
  const [bio, setBio] = useState(profile.bio ?? '')
  const [country, setCountry] = useState(profile.country ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bioId = useId()
  const countryId = useId()
  const countries = countriesByName(locale)

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await auth.updateProfileDetails(bio, country || null)
      notify(w.detailsSaved)
    } catch (failure) {
      setError(authErrorMessage(failure, t.authErrors))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={(event) => void save(event)}>
      <Panel title={w.about} id="about-title">
        <div>
          <label htmlFor={bioId} className="mb-1.5 block font-display text-sm font-bold tracking-[0.12em] text-parchment-200 uppercase">
            {w.bio}
          </label>
          <textarea id={bioId} value={bio} maxLength={BIO_MAX} rows={3} onChange={(event) => setBio(event.target.value)} aria-describedby={`${bioId}-hint`} className={textareaClass} />
          <p id={`${bioId}-hint`} className="mt-1 text-sm text-parchment-400" aria-live="polite">
            {w.bioHint(BIO_MAX - bio.length)}
          </p>
        </div>
        <div className="max-w-sm">
          <label htmlFor={countryId} className="mb-1.5 block font-display text-sm font-bold tracking-[0.12em] text-parchment-200 uppercase">
            {w.country}
          </label>
          <div className="relative">
            <select id={countryId} value={country} onChange={(event) => setCountry(event.target.value)} className={selectClass}>
              <option value="">{w.noCountry}</option>
              {countries.map((item) => (
                <option key={item.code} value={item.code}>
                  {countryFlag(item.code)} {item.name}
                </option>
              ))}
            </select>
            <IconChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-bronze-300" />
          </div>
        </div>
        <FormAlert message={error} />
        <Actions>
          <button type="submit" className="btn btn-primary" disabled={busy} aria-busy={busy || undefined}>
            {busy && <Spinner className="size-4" />}
            {t.accountPage.save}
          </button>
        </Actions>
      </Panel>
    </form>
  )
}

function UsernamePanel({ hasPassword, changedAt, onChanged }: { hasPassword: boolean; changedAt: string | null; onChanged: () => void }) {
  const { t, locale } = useI18n()
  const w = t.accountPage.profile
  const auth = useAuth()
  const notify = useToast()
  const current = auth.profile!.username
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const check = useUsernameCheck(name, auth.isUsernameAvailable, name.trim() !== current)
  const allowed = canChangeUsername(changedAt)
  const next = nextUsernameChange(changedAt)
  const nameError = name ? validateUsernameChange(current, name, t.validation) : null

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setTouched(true)
    if (busy || nameError || !name || check === 'taken' || (hasPassword && !password)) return
    setBusy(true)
    setError(null)
    try {
      await auth.changeUsername(name, hasPassword ? password : null)
      notify(w.changed(name.trim()))
      setName('')
      setPassword('')
      setTouched(false)
      onChanged()
    } catch (failure) {
      if (failure instanceof AuthError && failure.code === 'too-soon' && failure.detail) {
        setError(w.nextChange(new Date(failure.detail).toLocaleDateString(locale, { dateStyle: 'long' })))
      } else setError(authErrorMessage(failure, t.authErrors))
    } finally {
      setBusy(false)
    }
  }

  const relogin = async () => {
    rememberReturnTo(accountPath('profile'))
    try {
      await auth.signInWithGoogle(true)
    } catch (failure) {
      setError(authErrorMessage(failure, t.authErrors))
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} noValidate>
      <Panel title={w.username} intro={w.usernameIntro} id="username-title">
        <p className="text-parchment-100">{w.currentUsername(current)}</p>
        {!allowed && next ? (
          <p className="rounded-lg border border-bronze-500/30 bg-soot-950/60 px-3 py-2.5 text-sm text-parchment-200">
            {w.nextChange(next.toLocaleDateString(locale, { dateStyle: 'long' }))}
          </p>
        ) : (
          <>
            <TextField
              label={w.newUsername}
              value={name}
              onChange={setName}
              onBlur={() => setTouched(true)}
              error={(touched && nameError) || (check === 'taken' ? t.authErrors['username-taken'] : null)}
              aside={<UsernameStatus status={check} />}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={20}
              className="max-w-sm"
            />
            {hasPassword ? (
              <PasswordField
                label={w.confirmWithPassword}
                value={password}
                onChange={setPassword}
                error={touched && !password ? t.validation.enterCurrentPassword : null}
                autoComplete="current-password"
                className="max-w-sm"
              />
            ) : (
              <div className="flex flex-col gap-2 rounded-lg border border-bronze-500/30 bg-soot-950/60 p-3 text-sm text-parchment-200">
                <p>{w.reloginGoogle}</p>
                <button type="button" className="btn btn-ghost self-start" onClick={() => void relogin()}>
                  {w.reloginButton}
                </button>
              </div>
            )}
            <FormAlert message={error} />
            <Actions>
              <button type="submit" className="btn btn-primary" disabled={busy} aria-busy={busy || undefined}>
                {busy && <Spinner className="size-4" />}
                {w.change}
              </button>
            </Actions>
          </>
        )}
      </Panel>
    </form>
  )
}
