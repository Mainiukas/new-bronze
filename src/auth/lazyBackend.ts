import { AuthError, type AuthBackend } from './backend'

/**
 * An account backend whose code loads on first use (`load`), so the first
 * page doesn't wait for it. Every call waits for the real backend and then
 * runs unchanged, in the order it was made. If loading fails, or the real
 * one turns out not to be configured, calls fail with a network error and
 * the player is treated as a guest.
 */
export function createLazyBackend(load: () => Promise<AuthBackend | null>): AuthBackend {
  let loading: Promise<AuthBackend | null> | null = null
  const ready = () => (loading ??= load().catch(() => null))
  const real = async () => {
    const backend = await ready()
    if (!backend) throw new AuthError('network', 'The account service couldn’t be loaded.')
    return backend
  }

  return {
    onUserChange(callback) {
      let stop: (() => void) | null = null
      let stopped = false
      void ready().then((backend) => {
        if (stopped) return
        if (backend) stop = backend.onUserChange(callback)
        else callback(null)
      })
      return () => {
        stopped = true
        stop?.()
      }
    },
    signUp: async (input) => (await real()).signUp(input),
    signInWithPassword: async (email, password) => (await real()).signInWithPassword(email, password),
    emailForLogin: async (username, password) => (await real()).emailForLogin(username, password),
    signInWithGoogle: async (redirectTo) => (await real()).signInWithGoogle(redirectTo),
    completeRedirect: async (params) => (await real()).completeRedirect(params),
    signOut: async () => (await real()).signOut(),
    sendPasswordReset: async (email, redirectTo) => (await real()).sendPasswordReset(email, redirectTo),
    updatePassword: async (password) => (await real()).updatePassword(password),
    getProfile: async (userId) => (await real()).getProfile(userId),
    createProfile: async (user, username, consent) => (await real()).createProfile(user, username, consent),
    deleteAccount: async () => (await real()).deleteAccount(),
    exportData: async () => (await real()).exportData(),
    getEmailPreferences: async () => (await real()).getEmailPreferences(),
    setEmailPreferences: async (preferences) => (await real()).setEmailPreferences(preferences),
    confirmAdult: async () => (await real()).confirmAdult(),
    unsubscribe: async (token, list) => (await real()).unsubscribe(token, list),
    saveStats: async (userId, stats) => (await real()).saveStats(userId, stats),
    isUsernameAvailable: async (username) => (await real()).isUsernameAvailable(username),
    setRememberMe(remember) {
      // Runs before any call made after it (they all wait on the same load).
      void ready().then((backend) => backend?.setRememberMe(remember))
    },
  }
}
