import { describe, expect, it, vi } from 'vitest'
import { AuthError, type AuthBackend } from './backend'
import { createLazyBackend } from './lazyBackend'

/** A backend that records the order of calls. */
function recorder(log: string[]): AuthBackend {
  // Only what these tests call; the rest of AuthBackend isn't needed.
  const call = (name: string) => async () => {
    log.push(name)
  }
  return {
    onUserChange: (callback: (user: null, recovery: boolean) => void) => {
      log.push('onUserChange')
      callback(null, false)
      return () => log.push('unsubscribed')
    },
    signUp: async () => {
      log.push('signUp')
      return { needsConfirmation: false }
    },
    signInWithPassword: call('signInWithPassword'),
    emailForLogin: async () => null,
    signInWithGoogle: call('signInWithGoogle'),
    completeRedirect: call('completeRedirect'),
    signOut: call('signOut'),
    sendPasswordReset: call('sendPasswordReset'),
    updatePassword: call('updatePassword'),
    getProfile: async () => null,
    createProfile: async () => {
      throw new Error('unused')
    },
    deleteAccount: call('deleteAccount'),
    exportData: async () => ({}),
    getEmailPreferences: async () => ({ adult: false, marketing: false, friends: false, tournaments: false }),
    setEmailPreferences: async () => ({ adult: false, marketing: false, friends: false, tournaments: false }),
    confirmAdult: async () => ({ adult: true, marketing: false, friends: false, tournaments: false }),
    unsubscribe: async () => true,
    recordMatchResult: async () => null,
    mergeGuestStats: async () => null,
    isUsernameAvailable: async () => true,
    setRememberMe: (remember: boolean) => void log.push(`remember:${remember}`),
  } as unknown as AuthBackend
}

describe('lazy account backend', () => {
  it('loads once, on first use, and runs calls in the order they were made', async () => {
    const log: string[] = []
    const load = vi.fn(async () => recorder(log))
    const backend = createLazyBackend(load)
    expect(load).not.toHaveBeenCalled()

    const seen: (string | null)[] = []
    backend.onUserChange((user) => seen.push(user?.id ?? null))
    backend.setRememberMe(false)
    await backend.signInWithGoogle('https://example.test/#/auth/callback')
    expect(load).toHaveBeenCalledTimes(1)
    expect(log).toEqual(['onUserChange', 'remember:false', 'signInWithGoogle'])
    expect(seen).toEqual([null])
  })

  it('stops listening even when stopped before the code has loaded', async () => {
    const log: string[] = []
    let finish: (backend: AuthBackend) => void = () => undefined
    const backend = createLazyBackend(() => new Promise((resolve) => (finish = resolve)))
    const stop = backend.onUserChange(() => log.push('called'))
    stop()
    finish(recorder(log))
    await new Promise((resolve) => setTimeout(resolve))
    expect(log).toEqual([])
  })

  it('treats a failed load as a guest, and calls fail as network errors', async () => {
    const backend = createLazyBackend(() => Promise.reject(new Error('offline')))
    const seen: unknown[] = []
    backend.onUserChange((user) => seen.push(user))
    await expect(backend.signOut()).rejects.toMatchObject({ code: 'network' })
    await expect(backend.signOut()).rejects.toBeInstanceOf(AuthError)
    expect(seen).toEqual([null])
  })
})
