// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import type { AuthBackend, AuthUser, Profile } from '../auth/backend'
import { AuthProvider } from '../auth/AuthProvider'
import { EMPTY_STATS } from '../data/achievements'
import { useAuth } from './useAuth'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const ada: Profile = { id: 'u1', username: 'Ada', avatarUrl: null, createdAt: 'then', stats: { ...EMPTY_STATS, wins: 2, matches: 5 } }
const adaUser: AuthUser = { id: 'u1', email: 'ada@example.com', displayName: null, avatarUrl: null }

/** A backend that reports `user` once asked, and answers the profile when `release` is called. */
function backendFor(user: AuthUser | null) {
  let release = () => {}
  const profileReady = new Promise<void>((resolve) => (release = resolve))
  const backend = {
    onUserChange(callback: (user: AuthUser | null, recovery: boolean) => void) {
      setTimeout(() => callback(user, false), 0)
      return () => undefined
    },
    async getProfile() {
      await profileReady
      return ada
    },
    async signOut() {},
  } as unknown as AuthBackend
  return { backend, release: () => release() }
}

/** Prints what useAuth() says, as the screens would read it. */
function Probe() {
  const auth = useAuth()
  const summary = [
    auth.configured ? 'configured' : 'not-configured',
    auth.loading ? 'loading' : 'ready',
    auth.signedIn ? `signed-in:${auth.profile?.username}:${auth.profile?.stats.wins}/${auth.profile?.stats.matches}` : 'guest',
  ]
  return <p>{summary.join(' ')}</p>
}

let root: ReturnType<typeof createRoot> | null = null
const container = () => document.body.querySelector('p')?.textContent

async function render(backend: AuthBackend | null) {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<AuthProvider backend={backend}><Probe /></AuthProvider>))
}

const tick = () => act(() => new Promise((resolve) => setTimeout(resolve, 5)))
/** Wait (up to 2 s) until the screen says `expected`, so a slow machine doesn't fail the test. */
async function until(expected: string) {
  const end = Date.now() + 2000
  while (container() !== expected && Date.now() < end) await tick()
}

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.innerHTML = ''
})

describe('useAuth()', () => {
  it('is guest-only, not loading, when accounts aren’t configured', async () => {
    await render(null)
    expect(container()).toBe('not-configured ready guest')
  })

  it('is loading until the service answers, then a guest', async () => {
    const { backend } = backendFor(null)
    await render(backend)
    expect(container()).toBe('configured loading guest')
    await until('configured ready guest')
    expect(container()).toBe('configured ready guest')
  })

  it('is loading while a restored session’s profile loads, then logged in with the real record', async () => {
    const { backend, release } = backendFor(adaUser)
    await render(backend)
    await tick()
    expect(container()).toBe('configured loading guest')
    release()
    await until('configured ready signed-in:Ada:2/5')
    expect(container()).toBe('configured ready signed-in:Ada:2/5')
  })
})
