import { useEffect, useId, useState } from 'react'
import type { EmailPreferences } from '../../auth/backend'
import { authErrorMessage } from '../../auth/messages'
import { useAuth } from '../../hooks/useAuth'
import { consentStore } from '../../legal/consent'
import { AUTH_STORAGE_KEY, CONSENT_STORAGE_KEY } from '../../legal/inventory'
import { readStorage, STORAGE_KEYS } from '../../lib/storage'
import { FormAlert, Spinner } from '../auth/fields'
import { Dialog } from '../Dialog'
import { IconDownload, IconMail, IconShield, IconTrash } from '../icons'

/** Everything Bronze keeps in this browser. */
function deviceData() {
  const consent = (() => {
    try {
      return JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) ?? 'null') as unknown
    } catch {
      return null
    }
  })()
  return {
    settings: readStorage(STORAGE_KEYS.settings) ?? null,
    guestRecord: readStorage(STORAGE_KEYS.stats) ?? null,
    lastGameMode: readStorage(STORAGE_KEYS.gameMode) ?? null,
    lastMap: readStorage(STORAGE_KEYS.map) ?? null,
    lastSeats: readStorage(STORAGE_KEYS.setup) ?? null,
    matchInProgress: readStorage(STORAGE_KEYS.match) ?? null,
    cookieChoices: consent,
  }
}

/** Remove everything Bronze stored in this browser (the session too, which logs you out here). */
function clearDevice() {
  try {
    for (const key of Object.keys(localStorage)) if (key.startsWith('bronze') || key.startsWith(AUTH_STORAGE_KEY)) localStorage.removeItem(key)
    for (const key of Object.keys(sessionStorage)) if (key.startsWith('bronze')) sessionStorage.removeItem(key)
    document.cookie = 'bronze_session_alive=; path=/; max-age=0; SameSite=Lax'
  } catch {
    // Storage unavailable: there's nothing stored.
  }
}

function download(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const row = 'flex flex-wrap items-center justify-between gap-x-4 gap-y-2'
const note = 'block text-sm text-parchment-400'

/**
 * Settings → Account: download or delete your data. Signed in: the account's
 * data from the server plus this device's; guests: this device only.
 */
export function AccountSection({ onDone, notify }: { onDone: () => void; notify: (message: string) => void }) {
  const auth = useAuth()
  const [busy, setBusy] = useState<'export' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [clearing, setClearing] = useState(false)
  const profile = auth.signedIn ? auth.profile : null

  const exportData = async () => {
    setBusy('export')
    setError(null)
    try {
      const account = profile ? await auth.exportData() : null
      const stamp = new Date().toISOString().slice(0, 10)
      download(`bronze-data-${profile?.username ?? 'guest'}-${stamp}.json`, {
        exportedAt: new Date().toISOString(),
        note: 'Everything Bronze stores about you. Matches are played in your browser, so there is no match history on the server.',
        account,
        device: deviceData(),
      })
      notify('Your data is downloading.')
    } catch (failure) {
      setError(authErrorMessage(failure))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {profile ? (
        <p className="text-sm text-parchment-300">
          Logged in as <strong className="text-parchment-50">{profile.username}</strong>
          {auth.user?.email ? ` (${auth.user.email})` : ''}.
        </p>
      ) : (
        <p className="text-sm text-parchment-300">
          You’re playing as a guest: nothing about you is stored on our servers. Your settings, record and match stay in this browser.
        </p>
      )}
      <div className={row}>
        <div>
          <span className="block font-medium text-parchment-100">Download my data</span>
          <span className={note}>{profile ? 'Your profile, record, consents and email choices, plus this device’s data, as a file.' : 'What Bronze keeps in this browser, as a file.'}</span>
        </div>
        <button type="button" className="btn btn-ghost" onClick={() => void exportData()} disabled={busy !== null} aria-busy={busy === 'export' || undefined}>
          {busy === 'export' ? <Spinner className="size-4" /> : <IconDownload className="size-4" />}
          Download
        </button>
      </div>
      {profile && (
        <div className={row}>
          <div>
            <span className="block font-medium text-parchment-100">Delete my account</span>
            <span className={note}>Deletes your account and everything stored with it. It can’t be undone.</span>
          </div>
          <button type="button" className="btn border border-rust-400/60 bg-rust-500/15 text-rust-300 hover:bg-rust-500/25" onClick={() => setDeleting(true)}>
            <IconTrash className="size-4" />
            Delete
          </button>
        </div>
      )}
      <div className={row}>
        <div>
          <span className="block font-medium text-parchment-100">Clear this device</span>
          <span className={note}>Removes everything Bronze stored in this browser{profile ? ', and logs you out here' : ''}. Your account stays.</span>
        </div>
        {clearing ? (
          <div className="flex gap-2">
            <button
              type="button"
              className="btn border border-rust-400/60 bg-rust-500/15 text-rust-300 hover:bg-rust-500/25"
              onClick={() => {
                clearDevice()
                window.location.reload()
              }}
            >
              Clear
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setClearing(false)}>
              Keep
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={() => setClearing(true)}>
            Clear…
          </button>
        )}
      </div>
      <FormAlert message={error} />
      {profile && (
        <DeleteAccountDialog
          open={deleting}
          username={profile.username}
          onClose={() => setDeleting(false)}
          onDeleted={() => {
            setDeleting(false)
            onDone()
            notify('Your account and its data have been deleted. You’re now playing as a guest.')
          }}
        />
      )}
    </div>
  )
}

/** Type your username to confirm, then the account is deleted and you're logged out. */
function DeleteAccountDialog({ open, username, onClose, onDeleted }: { open: boolean; username: string; onClose: () => void; onDeleted: () => void }) {
  const auth = useAuth()
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputId = useId()
  const matches = typed.trim().toLowerCase() === username.toLowerCase()

  const confirm = async () => {
    if (!matches || busy) return
    setBusy(true)
    setError(null)
    try {
      await auth.deleteAccount()
      try {
        for (const key of Object.keys(localStorage)) if (key.startsWith(`${STORAGE_KEYS.stats}.pending.`)) localStorage.removeItem(key)
      } catch {
        // Nothing stored.
      }
      setTyped('')
      onDeleted()
    } catch (failure) {
      setError(authErrorMessage(failure))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} labelledBy="delete-account-title">
      <form
        className="plate rivets flex flex-col gap-4 border-rust-400/40 bg-soot-900/95 p-5 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault()
          void confirm()
        }}
      >
        <h2 id="delete-account-title" className="font-display text-2xl font-extrabold tracking-[0.1em] text-parchment-50 uppercase">
          Delete your account?
        </h2>
        <div className="flex flex-col gap-2 text-sm text-parchment-200">
          <p>This deletes, straight away and for good:</p>
          <ul className="ml-5 list-disc">
            <li>your login (email address and password, or your Google sign-in),</li>
            <li>your username, avatar, record and achievements,</li>
            <li>your age answer, consents and email choices.</li>
          </ul>
          <p>Matches are played in your browser, so no match history is kept on our servers. Your guest data in this browser stays until you clear it.</p>
        </div>
        <div>
          <label htmlFor={inputId} className="mb-1.5 block text-sm text-parchment-200">
            Type your username, <strong className="text-parchment-50">{username}</strong>, to confirm
          </label>
          <input
            id={inputId}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="h-12 w-full rounded-lg border border-bronze-500/35 bg-soot-950/75 px-3.5 text-parchment-50 outline-none focus:border-ember-400/80"
          />
        </div>
        <FormAlert message={error} />
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn btn-ghost min-h-11" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn min-h-11 border border-rust-400/70 bg-rust-500/25 text-rust-300 hover:bg-rust-500/35" disabled={!matches || busy} aria-busy={busy || undefined}>
            {busy && <Spinner className="size-4" />}
            Delete my account
          </button>
        </div>
      </form>
    </Dialog>
  )
}

const LIST_TEXT: Record<'marketing' | 'friends' | 'tournaments', { label: string; description: string }> = {
  marketing: { label: 'News about Bronze', description: 'New features and events. Only with your consent, and never to under-18s.' },
  friends: { label: 'Friend emails', description: 'When someone sends you a friend request.' },
  tournaments: { label: 'Tournament emails', description: 'Reminders for tournaments you’ve joined.' },
}

/**
 * Settings → Notifications: which optional emails you want. All start off.
 * Bronze sends none of them yet; the choice is kept for when it does, and
 * every such email will carry a one-click unsubscribe link.
 */
export function NotificationsSection() {
  const auth = useAuth()
  const [prefs, setPrefs] = useState<EmailPreferences | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const signedIn = auth.signedIn
  const { getEmailPreferences } = auth

  useEffect(() => {
    if (!signedIn) return
    let alive = true
    getEmailPreferences().then(
      (p) => alive && setPrefs(p),
      (failure) => alive && setError(authErrorMessage(failure)),
    )
    return () => {
      alive = false
    }
  }, [signedIn, getEmailPreferences])

  if (!signedIn) return <p className="text-sm text-parchment-300">Log in to choose which emails you get. Guests never get emails.</p>
  if (!prefs) return error ? <FormAlert message={error} /> : <p className="flex items-center gap-2 text-sm text-parchment-300" role="status"><Spinner className="size-4" /> Loading your email choices…</p>

  const change = async (next: Omit<EmailPreferences, 'adult'>) => {
    setSaving(true)
    setError(null)
    try {
      setPrefs(await auth.setEmailPreferences(next))
    } catch (failure) {
      setError(authErrorMessage(failure))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-parchment-300">
        Account emails (confirming your address, resetting your password) are always sent. Everything else is up to you; Bronze doesn’t send any of it yet.
      </p>
      {(['marketing', 'friends', 'tournaments'] as const).map((list) => {
        const locked = list === 'marketing' && !prefs.adult
        const labelId = `email-${list}-label`
        return (
          <div key={list} className="flex items-center justify-between gap-4">
            <div>
              <span id={labelId} className="block font-medium text-parchment-100">
                <IconMail className="mr-1.5 inline size-4 align-[-2px] text-bronze-300" />
                {LIST_TEXT[list].label}
              </span>
              <span id={`${labelId}-desc`} className={note}>
                {locked ? 'Available from 18.' : LIST_TEXT[list].description}
              </span>
            </div>
            {locked ? (
              <button type="button" className="btn btn-ghost text-sm" disabled={saving} onClick={() => void auth.confirmAdult().then(setPrefs, (f) => setError(authErrorMessage(f)))}>
                I’m 18 or over now
              </button>
            ) : (
              <button
                type="button"
                role="switch"
                aria-checked={prefs[list]}
                aria-labelledby={labelId}
                aria-describedby={`${labelId}-desc`}
                disabled={saving}
                onClick={() => void change({ marketing: prefs.marketing, friends: prefs.friends, tournaments: prefs.tournaments, [list]: !prefs[list] })}
                className={`relative h-7 w-13 shrink-0 rounded-full border transition-colors disabled:opacity-60 ${prefs[list] ? 'border-bronze-300/70 bg-bronze-600' : 'border-bronze-500/40 bg-soot-700'}`}
              >
                <span aria-hidden="true" className={`absolute top-1/2 left-0.5 size-5.5 -translate-y-1/2 rounded-full bg-parchment-100 shadow transition-transform motion-reduce:transition-none ${prefs[list] ? 'translate-x-6' : ''}`} />
              </button>
            )}
          </div>
        )
      })}
      <FormAlert message={error} />
    </div>
  )
}

/** Settings → Privacy: reopen the cookie choices (the settings dialog closes first so the banner can be used). */
export function PrivacySection({ onClose }: { onClose: () => void }) {
  return (
    <div className={row}>
      <div>
        <span className="block font-medium text-parchment-100">Cookie settings</span>
        <span className={note}>Change what Bronze may store in this browser.</span>
      </div>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => {
          onClose()
          window.setTimeout(() => consentStore.reopen())
        }}
      >
        <IconShield className="size-4" />
        Open
      </button>
    </div>
  )
}
