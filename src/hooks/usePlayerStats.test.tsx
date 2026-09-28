// @vitest-environment jsdom
import { act, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import type { AuthBackend, AuthUser, GuestMerge, Profile } from '../auth/backend'
import { EMPTY_STATS, mergeStats, type PlayerStats } from '../data/achievements'
import en from '../i18n/en'
import { STORAGE_KEYS } from '../lib/storage'
import { usePlayerStats } from './usePlayerStats'
import { ToastContext } from './useToast'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const guest: PlayerStats = { ...EMPTY_STATS, matches: 3, wins: 1, bestScore: 28, mapsPlayed: ['pennine-mills'], unlocked: { 'first-shift': '2026-01-02T00:00:00.000Z' } }

/** A signed-in player whose server adds each merge id once; the first `failures` merges fail (connection lost). */
function server(id: string, failures = 0) {
  const user: AuthUser = { id, email: `${id}@example.com`, displayName: null, avatarUrl: null }
  let profile: Profile = { id, username: `P_${id}`, avatarUrl: null, createdAt: 'then', stats: { ...EMPTY_STATS, matches: 5, wins: 2 } }
  const merges: GuestMerge[] = []
  const applied = new Set<string>()
  const backend = {
    onUserChange(callback: (user: AuthUser | null, recovery: boolean) => void) {
      setTimeout(() => callback(user, false), 0)
      return () => undefined
    },
    getProfile: async () => profile,
    async mergeGuestStats(merge: GuestMerge) {
      merges.push(merge)
      if (failures-- > 0) throw new TypeError('Failed to fetch')
      if (!applied.has(merge.id)) {
        applied.add(merge.id)
        profile = { ...profile, stats: mergeStats(profile.stats, merge.stats) }
      }
      return profile
    },
  } as unknown as AuthBackend
  return { backend, merges }
}

let shown: { stats: PlayerStats } | null = null
function Probe() {
  const stats = usePlayerStats()
  useEffect(() => {
    shown = stats
  })
  return null
}

let root: ReturnType<typeof createRoot> | null = null
const toasts: string[] = []

async function render(backend: AuthBackend) {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () =>
    root!.render(
      <ToastContext.Provider value={(message) => void toasts.push(message)}>
        <AuthProvider backend={backend}>
          <Probe />
        </AuthProvider>
      </ToastContext.Provider>,
    ),
  )
}

const tick = () => act(() => new Promise((resolve) => setTimeout(resolve, 10)))
/** Wait (up to 2 s) until `check` holds, so a slow machine doesn't fail the test. */
async function until(check: () => boolean) {
  const end = Date.now() + 2000
  while (!check() && Date.now() < end) await tick()
}

afterEach(() => {
  act(() => root?.unmount())
  root = null
  shown = null
  toasts.length = 0
  localStorage.clear()
})

describe('usePlayerStats() when signed in', () => {
  it('moves this device’s guest record into the account once, then clears it', async () => {
    localStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(guest))
    const { backend, merges } = server('a1')
    await render(backend)
    await until(() => shown?.stats.matches === 8 && localStorage.getItem(`${STORAGE_KEYS.stats}.pending.a1`) === null)
    expect(merges).toHaveLength(1)
    expect(merges[0].stats).toMatchObject({ matches: 3, wins: 1 })
    expect(shown?.stats).toMatchObject({ matches: 8, wins: 3, bestScore: 28 })
    expect(localStorage.getItem(STORAGE_KEYS.stats)).toBeNull()
    expect(localStorage.getItem(`${STORAGE_KEYS.stats}.pending.a1`)).toBeNull()
    expect(toasts).toContain(en.stats.guestMoved)
  })

  it('keeps a result it couldn’t save, and sends it again (same id) when back online, counted once', async () => {
    localStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(guest))
    const { backend, merges } = server('b2', 1)
    await render(backend)
    await until(() => toasts.includes(en.stats.saveFailed))
    expect(merges).toHaveLength(1)
    const waiting = JSON.parse(localStorage.getItem(`${STORAGE_KEYS.stats}.pending.b2`) ?? '[]') as unknown[]
    expect(waiting).toHaveLength(1)
    expect(toasts).toContain(en.stats.saveFailed)

    await act(async () => void window.dispatchEvent(new Event('online')))
    await until(() => localStorage.getItem(`${STORAGE_KEYS.stats}.pending.b2`) === null)
    expect(merges).toHaveLength(2)
    expect(merges[1].id).toBe(merges[0].id)
    expect(shown?.stats).toMatchObject({ matches: 8, wins: 3 })
    expect(localStorage.getItem(`${STORAGE_KEYS.stats}.pending.b2`)).toBeNull()
  })
})
