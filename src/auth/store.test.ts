import { describe, expect, it } from 'vitest'
import { EMPTY_STATS, type PlayerStats } from '../data/achievements'
import { AuthError, type AuthBackend, type AuthUser, type Profile, type SignupConsent } from './backend'
import { createAuthStore } from './store'

/** An in-memory account service for the store's tests. */
function stubBackend({ signedInAs = null as AuthUser | null, profiles = [] as Profile[], password = 'Sprocket-42' } = {}) {
  let user = signedInAs
  const listeners = new Set<(user: AuthUser | null, recovery: boolean) => void>()
  let recovery = false
  const emit = () => setTimeout(() => listeners.forEach((listener) => listener(user, recovery)), 0)
  const counted = new Set<string>()
  const accounts: Record<string, AuthUser> = { 'ada@example.com': { id: 'u1', email: 'ada@example.com', displayName: 'Ada Lovelace', avatarUrl: null } }
  const calls: string[] = []
  const backend: AuthBackend = {
    onUserChange(listener) {
      listeners.add(listener)
      setTimeout(() => listener(user, false), 0)
      return () => listeners.delete(listener)
    },
    async signUp({ email, username, consent }) {
      calls.push(`signUp:${email}:${username}:${consent.ageBand}:${consent.marketing}`)
      return { needsConfirmation: true }
    },
    async signInWithPassword(email, pw) {
      if (!accounts[email] || pw !== password) throw new AuthError('invalid-credentials')
      user = accounts[email]
      emit()
    },
    async emailForLogin(username, pw) {
      const profile = profiles.find((p) => p.username.toLowerCase() === username.toLowerCase())
      return profile && pw === password ? (Object.keys(accounts).find((e) => accounts[e].id === profile.id) ?? null) : null
    },
    async signInWithGoogle() {},
    async completeRedirect(params) {
      if (params.get('type') === 'reset') {
        // A password-reset link: Ada, with Supabase's PASSWORD_RECOVERY event.
        user = accounts['ada@example.com']
        recovery = true
      } else {
        user = { id: 'g1', email: 'g@example.com', displayName: 'Grace Hopper', avatarUrl: 'https://example.com/g.png' }
      }
      emit()
    },
    async signOut() {
      user = null
      emit()
    },
    async sendPasswordReset() {},
    async updatePassword() {},
    async getProfile(id) {
      return profiles.find((p) => p.id === id) ?? null
    },
    async createProfile(u, username, consent) {
      calls.push(`createProfile:${username}:${consent.ageBand}`)
      const profile = { id: u.id, username, avatarUrl: u.avatarUrl, createdAt: 'now', stats: EMPTY_STATS }
      profiles.push(profile)
      return profile
    },
    async deleteAccount() {
      calls.push(`delete:${user?.id}`)
      const i = profiles.findIndex((p) => p.id === user?.id)
      if (i >= 0) profiles.splice(i, 1)
      user = null
      emit()
    },
    async exportData() {
      return { profile: profiles.find((p) => p.id === user?.id) ?? null }
    },
    async getEmailPreferences() {
      return { marketing: false, friends: false, tournaments: false, adult: true }
    },
    async setEmailPreferences(prefs) {
      return { ...prefs, adult: true }
    },
    async confirmAdult() {
      return { marketing: false, friends: false, tournaments: false, adult: true }
    },
    async unsubscribe(token, list) {
      calls.push(`unsubscribe:${token}:${list}`)
      return true
    },
    async recordMatchResult({ id, score, won }) {
      calls.push(`match:${id}`)
      const profile = profiles.find((p) => p.id === user?.id)!
      if (!counted.has(id)) {
        counted.add(id)
        const s: PlayerStats = profile.stats
        profile.stats = { ...s, matches: s.matches + 1, wins: s.wins + (won ? 1 : 0), bestScore: Math.max(s.bestScore, score) }
      }
      return { ...profile }
    },
    async mergeGuestStats({ id, stats }) {
      const profile = profiles.find((p) => p.id === user?.id)!
      if (!counted.has(id)) {
        counted.add(id)
        profile.stats = { ...profile.stats, matches: profile.stats.matches + stats.matches, wins: profile.stats.wins + stats.wins }
      }
      return { ...profile }
    },
    async isUsernameAvailable(name) {
      return !profiles.some((p) => p.username.toLowerCase() === name.toLowerCase())
    },
    setRememberMe(remember) {
      calls.push(`remember:${remember}`)
    },
  }
  return { backend, calls }
}

const ada: Profile = { id: 'u1', username: 'Ada', avatarUrl: null, createdAt: 'then', stats: { ...EMPTY_STATS, wins: 2, matches: 5 } }
const adaUser: AuthUser = { id: 'u1', email: 'ada@example.com', displayName: null, avatarUrl: null }
const settle = () => new Promise((resolve) => setTimeout(resolve, 5))
const adult: SignupConsent = { ageBand: '18+', termsVersion: 'test', marketing: false }
const options = { redirectUrl: (route: string) => `https://bronze.test/#${route}` }

describe('auth store', () => {
  it('is guest-only when no account service is configured', async () => {
    const store = createAuthStore(null)
    store.start()
    expect(store.getState().status).toBe('unconfigured')
    await expect(store.signIn('ada@example.com', 'Sprocket-42', true)).rejects.toThrow(/configured/)
  })

  it('starts as a guest when nobody is signed in', async () => {
    const store = createAuthStore(stubBackend().backend, options)
    expect(store.getState().status).toBe('loading')
    store.start()
    await settle()
    expect(store.getState()).toEqual({ status: 'guest', user: null, profile: null, passwordRecovery: false })
  })

  it('restores a signed-in session with its profile', async () => {
    const store = createAuthStore(stubBackend({ signedInAs: adaUser, profiles: [ada] }).backend, options)
    store.start()
    await settle()
    expect(store.getState().status).toBe('signed-in')
    expect(store.getState().profile?.username).toBe('Ada')
  })

  it('logs in by username or email, and out again', async () => {
    const { backend, calls } = stubBackend({ profiles: [ada] })
    const store = createAuthStore(backend, options)
    store.start()
    await settle()

    const state = await store.signIn('ada', 'Sprocket-42', false)
    expect(state.status).toBe('signed-in')
    expect(state.profile?.stats.wins).toBe(2)
    expect(calls).toContain('remember:false')

    await store.signOut()
    expect(store.getState().status).toBe('guest')
    await settle()
    expect(store.getState().status).toBe('guest')

    expect((await store.signIn('ada@example.com', 'Sprocket-42', true)).status).toBe('signed-in')
  })

  it('fails wrong usernames and wrong passwords the same way', async () => {
    const store = createAuthStore(stubBackend({ profiles: [ada] }).backend, options)
    store.start()
    await settle()
    await expect(store.signIn('nobody', 'Sprocket-42', true)).rejects.toMatchObject({ code: 'invalid-credentials' })
    await expect(store.signIn('ada', 'wrong-password', true)).rejects.toMatchObject({ code: 'invalid-credentials' })
    await expect(store.signIn('ada@example.com', 'wrong-password', true)).rejects.toMatchObject({ code: 'invalid-credentials' })
    expect(store.getState().status).toBe('guest')
  })

  it('asks a first-time Google user for a username, then signs them in', async () => {
    const store = createAuthStore(stubBackend({ profiles: [ada] }).backend, options)
    store.start()
    await settle()
    const state = await store.finishRedirect(new URLSearchParams('code=abc'))
    expect(state.status).toBe('needs-username')
    expect(state.user?.displayName).toBe('Grace Hopper')

    const profile = await store.chooseUsername('Grace_H', { ageBand: '14-17', termsVersion: 'test', marketing: false })
    expect(profile.avatarUrl).toBe('https://example.com/g.png')
    expect(store.getState().status).toBe('signed-in')
    expect(await store.isUsernameAvailable('grace_h')).toBe(false)
  })

  it('refuses a taken username at registration', async () => {
    const { backend, calls } = stubBackend({ profiles: [ada] })
    const store = createAuthStore(backend, options)
    await expect(store.signUp({ username: 'ADA', email: 'x@example.com', password: 'Sprocket-42', consent: adult })).rejects.toMatchObject({ code: 'username-taken' })
    expect(await store.signUp({ username: 'Brunel', email: 'ib@example.com', password: 'Sprocket-42', consent: adult })).toEqual({ needsConfirmation: true })
    expect(calls).toContain('signUp:ib@example.com:Brunel:18+:false')
  })

  it('adds a finished match on the server, once per result id, showing it at once', async () => {
    const profiles = [{ ...ada }]
    const store = createAuthStore(stubBackend({ signedInAs: adaUser, profiles }).backend, options)
    store.start()
    await settle()
    const result = { id: 'r1', score: 40, won: true, goodsShipped: 3, mapId: 'black-country', achievements: [] }
    const sent = store.recordMatchResult(result, { ...ada.stats, wins: 3, matches: 6 })
    expect(store.getState().profile?.stats.matches).toBe(6)
    await sent
    expect(profiles[0].stats).toMatchObject({ wins: 3, matches: 6, bestScore: 40 })
    // A retry of the same result changes nothing.
    await store.recordMatchResult(result)
    expect(store.getState().profile?.stats).toMatchObject({ wins: 3, matches: 6 })
  })

  it('moves a guest record into the account once', async () => {
    const profiles = [{ ...ada }]
    const store = createAuthStore(stubBackend({ signedInAs: adaUser, profiles }).backend, options)
    store.start()
    await settle()
    const merge = { id: 'm1', stats: { ...EMPTY_STATS, matches: 4, wins: 1 } }
    await store.mergeGuestStats(merge)
    await store.mergeGuestStats(merge)
    expect(store.getState().profile?.stats).toMatchObject({ matches: 9, wins: 3 })
  })

  it('lets a password-reset link set a new password (PASSWORD_RECOVERY)', async () => {
    const store = createAuthStore(stubBackend({ profiles: [ada] }).backend, options)
    store.start()
    await settle()
    const state = await store.finishRedirect(new URLSearchParams('code=abc&type=reset'))
    expect(state).toMatchObject({ status: 'signed-in', passwordRecovery: true })
    await store.updatePassword('New-Sprocket-43')
    expect(store.getState().passwordRecovery).toBe(false)
  })

  it('deletes a first-time Google sign-in that is turned down, leaving a guest', async () => {
    const { backend, calls } = stubBackend({ profiles: [ada] })
    const store = createAuthStore(backend, options)
    store.start()
    await settle()
    await store.finishRedirect(new URLSearchParams('code=abc'))
    expect(store.getState().status).toBe('needs-username')
    await store.declineSignup()
    expect(calls).toContain('delete:g1')
    expect(store.getState()).toEqual({ status: 'guest', user: null, profile: null, passwordRecovery: false })
  })

  it('deletes the signed-in account and its profile', async () => {
    const profiles = [{ ...ada }]
    const { backend, calls } = stubBackend({ signedInAs: adaUser, profiles })
    const store = createAuthStore(backend, options)
    store.start()
    await settle()
    await store.deleteAccount()
    expect(calls).toContain('delete:u1')
    expect(profiles).toEqual([])
    expect(store.getState().status).toBe('guest')
    await settle()
    expect(store.getState().status).toBe('guest')
  })

  it('unsubscribes from an email link without being logged in', async () => {
    const { backend, calls } = stubBackend()
    const store = createAuthStore(backend, options)
    expect(await store.unsubscribe('0f8fad5b-d9cb-469f-a165-70867728950e', 'marketing')).toBe(true)
    expect(calls).toContain('unsubscribe:0f8fad5b-d9cb-469f-a165-70867728950e:marketing')
  })
})
