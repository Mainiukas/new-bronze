import { useId, useState } from 'react'
import type { Visibility } from '../../auth/backend'
import { authErrorMessage } from '../../auth/messages'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { useT } from '../../i18n'
import { FormAlert } from '../auth/fields'
import { PrivacySection } from '../settings/AccountSettings'
import { Panel } from './parts'

const OPTIONS: Visibility[] = ['public', 'friends', 'private']

/** Settings → Account → Privacy: who sees the profile and the match history; cookies on this device. */
export function PrivacyTab() {
  const t = useT()
  const w = t.accountPage.privacy
  const auth = useAuth()
  const notify = useToast()
  const profile = auth.profile!
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const current = { profile: profile.profileVisibility ?? 'public', history: profile.historyVisibility ?? 'public' }

  const change = async (which: 'profile' | 'history', value: Visibility) => {
    if (busy) return
    const next = { ...current, [which]: value }
    setBusy(true)
    setError(null)
    try {
      await auth.setPrivacy(next.profile, next.history)
      notify(t.accountPage.saved)
    } catch (failure) {
      setError(authErrorMessage(failure, t.authErrors))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Panel title={t.accountPage.tabs.privacy} intro={w.intro} id="privacy-title">
        <VisibilityChoice label={w.profile} value={current.profile} disabled={busy} onChange={(value) => void change('profile', value)} />
        <VisibilityChoice label={w.history} value={current.history} disabled={busy} onChange={(value) => void change('history', value)} />
        <p className="text-sm text-parchment-400">{w.friendsNote}</p>
        <p className="text-sm text-parchment-400">{w.historyNote}</p>
        <FormAlert message={error} />
      </Panel>
      <Panel title={w.cookies} id="cookies-title">
        <PrivacySection onClose={() => undefined} />
      </Panel>
    </>
  )
}

function VisibilityChoice({ label, value, disabled, onChange }: { label: string; value: Visibility; disabled: boolean; onChange: (value: Visibility) => void }) {
  const w = useT().accountPage.privacy
  const id = useId()
  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={`${id}-desc`}>
      <legend className="mb-1 font-display text-sm font-bold tracking-[0.12em] text-parchment-200 uppercase">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {OPTIONS.map((option) => (
          <label
            key={option}
            className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-3 transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ember-400 ${
              value === option ? 'border-brass-300/70 bg-bronze-500/20' : 'border-bronze-500/30 bg-soot-950/60 hover:border-bronze-300/60'
            } ${disabled ? 'opacity-70' : ''}`}
          >
            <span className="flex items-center gap-2 font-semibold text-parchment-50">
              <input type="radio" name={id} value={option} checked={value === option} disabled={disabled} onChange={() => onChange(option)} className="size-4 accent-bronze-400" />
              {w.options[option]}
            </span>
            <span className="text-sm text-parchment-300">{w.descriptions[option]}</span>
          </label>
        ))}
      </div>
      <span id={`${id}-desc`} className="sr-only">
        {w.descriptions[value]}
      </span>
    </fieldset>
  )
}
