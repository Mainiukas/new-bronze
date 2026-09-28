import type { PlayerStats } from '../data/achievements'
import {
  AuthError,
  type AuthBackend,
  type AuthUser,
  type EmailList,
  type EmailPreferences,
  type GuestMerge,
  type MatchResult,
  type Profile,
  type ReportReason,
  type SignupConsent,
  type Visibility,
} from './backend'
import { authRedirectUrl } from './redirect'
import { isEmail } from './validation'

/**
 * - unconfigured: no account service set up; guests only.
 * - loading: finding out who's signed in.
 * - guest: nobody signed in.
 * - needs-username: signed in (e.g. with Google for the first time) but no profile yet.
 * - needs-mfa: password (or Google) accepted, but the account has two-factor
 *   authentication and this session hasn't passed it yet.
 * - signed-in: signed in with a profile.
 * - error: signed in, but the profile couldn't be loaded (retry() tries again).
 */
export type AuthStatus = 'unconfigured' | 'loading' | 'guest' | 'needs-username' | 'needs-mfa' | 'signed-in' | 'error'

export interface AuthState {
  status: AuthStatus
  user: AuthUser | null
  profile: Profile | null
  /** Signed in from a password-reset link (PASSWORD_RECOVERY): the reset page may set a new password. */
  passwordRecovery: boolean
}

const GUEST: AuthState = { status: 'guest', user: null, profile: null, passwordRecovery: false }

const SETTLED: AuthStatus[] = ['signed-in', 'needs-username', 'needs-mfa', 'error']

export interface AuthStoreOptions {
  /** Full URL for a return to `route` (a hash route such as /auth/callback). */
  redirectUrl?: (route: string) => string
  /** How long to wait for a new session's profile. */
  settleTimeoutMs?: number
}

/**
 * The account state and actions behind useAuth(), independent of React so it
 * can be tested with a stand-in backend. State changes come from the
 * backend's user feed; actions resolve once the result shows in the state.
 */
export function createAuthStore(backend: AuthBackend | null, { redirectUrl = authRedirectUrl, settleTimeoutMs = 15000 }: AuthStoreOptions = {}) {
  let state: AuthState = { status: backend ? 'loading' : 'unconfigured', user: null, profile: null, passwordRecovery: false }
  const listeners = new Set<() => void>()
  let loadId = 0
  let unsubscribe: (() => void) | null = null

  const set = (next: AuthState) => {
    state = next
    for (const listener of listeners) listener()
  }

  const need = (): AuthBackend => {
    if (!backend) throw new AuthError('unknown', 'Accounts aren’t configured yet.')
    return backend
  }

  /** A user arrived (or left): look up their profile. */
  async function load(user: AuthUser | null, recovery = false) {
    const id = ++loadId
    if (!user) return set(GUEST)
    const passwordRecovery = recovery || (state.passwordRecovery && state.user?.id === user.id)
    // Same person (a refreshed token, an updated password): keep what's loaded.
    if (state.user?.id === user.id && state.profile) return set({ ...state, user, passwordRecovery })
    set({ status: 'loading', user, profile: null, passwordRecovery })
    try {
      // Two-factor authentication on, and this session hasn't passed it: nothing else until it does.
      const mfa = await need().getMfaState()
      if (id !== loadId) return
      if (mfa.next === 'aal2' && mfa.current !== 'aal2') return set({ status: 'needs-mfa', user, profile: null, passwordRecovery })
      const profile = await need().getProfile(user.id)
      if (id === loadId) set({ status: profile ? 'signed-in' : 'needs-username', user, profile, passwordRecovery })
    } catch {
      if (id === loadId) set({ status: 'error', user, profile: null, passwordRecovery })
    }
  }

  /** A newer copy of the signed-in profile from the server (if it's still the same player). */
  function takeProfile(profile: Profile | null) {
    if (profile && state.profile?.id === profile.id) set({ ...state, profile })
  }

  /** Look up the signed-in user again (after passing 2FA), and wait for the result. */
  async function reload(): Promise<AuthState> {
    const { user } = state
    if (!user) throw new AuthError('unknown', 'Not signed in.')
    set({ ...state, profile: null })
    await load(user)
    return settled()
  }

  /** The signed-in player's user id, or an error. */
  function userId(): string {
    if (!state.user) throw new AuthError('unknown', 'Not signed in.')
    return state.user.id
  }

  /** Resolves when a sign-in has shown up in the state (profile loaded, or known to be missing). */
  function settled(): Promise<AuthState> {
    if (SETTLED.includes(state.status)) return Promise.resolve(state)
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        stop()
        reject(new AuthError('network', 'Signing in took too long.'))
      }, settleTimeoutMs)
      const stop = subscribe(() => {
        if (!SETTLED.includes(state.status)) return
        clearTimeout(timer)
        stop()
        resolve(state)
      })
    })
  }

  function subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  return {
    getState: () => state,
    subscribe,

    /** Follow the backend's signed-in user. Returns a stop function. */
    start() {
      if (backend && !unsubscribe) unsubscribe = backend.onUserChange((user, recovery) => void load(user, recovery))
      return () => {
        unsubscribe?.()
        unsubscribe = null
      }
    },

    retry: () => load(state.user),

    /** Create an account. With email confirmation on, nobody is signed in until the link is followed. */
    async signUp({ username, email, password, consent }: { username: string; email: string; password: string; consent: SignupConsent }) {
      const service = need()
      if (!(await service.isUsernameAvailable(username))) throw new AuthError('username-taken')
      service.setRememberMe(true)
      const result = await service.signUp({ email: email.trim(), password, username, consent, redirectTo: redirectUrl('/auth/callback') })
      if (!result.needsConfirmation) await settled()
      return result
    },

    /** Log in with a username or an email. Wrong details of either kind fail the same way. */
    async signIn(identifier: string, password: string, remember: boolean) {
      const service = need()
      service.setRememberMe(remember)
      const name = identifier.trim()
      const email = isEmail(name) ? name : await service.emailForLogin(name, password)
      if (!email) throw new AuthError('invalid-credentials')
      await service.signInWithPassword(email, password)
      return settled()
    },

    /** Leaves for Google; the return is handled by finishRedirect on /auth/callback. */
    async signInWithGoogle(remember: boolean) {
      const service = need()
      service.setRememberMe(remember)
      await service.signInWithGoogle(redirectUrl('/auth/callback'))
    },

    /** Finish a return from Google or an email link, given the page's query parameters. */
    async finishRedirect(params: URLSearchParams) {
      await need().completeRedirect(params)
      const result = await settled()
      // A reset link opened as a token_hash link (another device) has no PASSWORD_RECOVERY event: the URL says so.
      if (params.get('type') === 'recovery' && !state.passwordRecovery) set({ ...state, passwordRecovery: true })
      return { ...result, passwordRecovery: state.passwordRecovery }
    },

    async signOut() {
      await need().signOut()
      loadId++
      set(GUEST)
    },

    /** Email a reset link (to #/auth/reset). Answers the same whether or not the address has an account. */
    resetPassword: (email: string) => need().sendPasswordReset(email.trim(), redirectUrl('/auth/reset')),

    async updatePassword(password: string) {
      await need().updatePassword(password)
      if (state.passwordRecovery) set({ ...state, passwordRecovery: false })
    },

    /** Create the profile for a signed-in user who has none (first Google sign-in), with their age answer and consents. */
    async chooseUsername(username: string, consent: SignupConsent) {
      const { user } = state
      if (!user) throw new AuthError('unknown', 'Not signed in.')
      const profile = await need().createProfile(user, username.trim(), consent)
      loadId++
      set({ ...state, status: 'signed-in', user, profile })
      return profile
    },

    /** A first Google sign-in turned down before accepting the Terms: delete the unfinished account, then log out. */
    async declineSignup() {
      await need().deleteAccount()
      loadId++
      set(GUEST)
    },

    /** Delete the signed-in account and everything stored with it on the server, then log out here. */
    async deleteAccount() {
      if (!state.user) throw new AuthError('unknown', 'Not signed in.')
      await need().deleteAccount()
      loadId++
      set(GUEST)
    },

    exportData: () => need().exportData(),
    getEmailPreferences: (): Promise<EmailPreferences> => need().getEmailPreferences(),
    setEmailPreferences: (preferences: Omit<EmailPreferences, 'adult'>) => need().setEmailPreferences(preferences),
    confirmAdult: () => need().confirmAdult(),
    unsubscribe: (token: string, list: EmailList | 'all') => need().unsubscribe(token, list),

    isUsernameAvailable: (username: string) => need().isUsernameAvailable(username.trim()),

    /**
     * A finished match for the signed-in player: `shown` (their stats with it
     * added) is shown at once; the server adds it to their record, once per
     * result id, and its answer replaces what's shown. Rejects if saving fails.
     */
    async recordMatchResult(result: MatchResult, shown?: PlayerStats) {
      const { profile } = state
      if (!profile) throw new AuthError('unknown', 'Not signed in.')
      if (shown) set({ ...state, profile: { ...profile, stats: shown } })
      takeProfile(await need().recordMatchResult(result))
    },

    /** Move a guest record into the signed-in account (once per merge id). */
    async mergeGuestStats(merge: GuestMerge, shown?: PlayerStats) {
      const { profile } = state
      if (!profile) throw new AuthError('unknown', 'Not signed in.')
      if (shown) set({ ...state, profile: { ...profile, stats: shown } })
      takeProfile(await need().mergeGuestStats(merge))
    },

    // ------------------------------------------------------------ two-factor at log-in
    /** Pass 2FA with a 6-digit code from the authenticator app (or the given method). */
    async verifyMfa(code: string, factorId?: string) {
      const service = need()
      const id = factorId ?? (await service.getMfaState()).factors.find((factor) => factor.verified && factor.type === 'totp')?.id
      if (!id) throw new AuthError('unknown', 'No authenticator app is set up.')
      await service.verifyMfaCode(id, code)
      return reload()
    },
    /** Sends an SMS code for a phone method; returns the challenge to verify. */
    sendMfaSms: (factorId: string) => need().sendMfaSms(factorId),
    async verifyMfaSms(factorId: string, challengeId: string, code: string) {
      await need().verifyMfaSms(factorId, challengeId, code)
      return reload()
    },
    /** A recovery code instead: a right one turns 2FA off, so the player gets in (and should set it up again). */
    async useRecoveryCode(code: string) {
      const service = need()
      if (!(await service.useRecoveryCode(code))) throw new AuthError('invalid-code')
      await service.refreshSession()
      return reload()
    },

    // ------------------------------------------------------------ profiles
    getPublicProfile: (username: string) => need().getPublicProfile(username),
    getMatchHistory: (username: string, page: number) => need().getMatchHistory(username, page),
    reportUser: (username: string, reason: ReportReason, details: string) => need().reportUser(username, reason, details),
    getAccount: () => need().getAccount(),
    async updateProfileDetails(bio: string, country: string | null) {
      takeProfile(await need().updateProfileDetails(bio, country))
    },
    async setAvatar(value: string | null) {
      takeProfile(await need().setAvatar(value))
    },
    /** Upload an image (already resized) and make it the avatar. */
    async uploadAvatar(image: Blob) {
      const url = await need().uploadAvatar(userId(), image)
      takeProfile(await need().setAvatar(url))
    },
    async setPrivacy(profile: Visibility, history: Visibility) {
      takeProfile(await need().setPrivacy(profile, history))
    },
    async changeUsername(username: string, password: string | null) {
      await need().changeUsername(username.trim(), password)
      takeProfile(await need().getProfile(userId()))
    },
    async refreshProfile() {
      takeProfile(await need().getProfile(userId()))
    },

    // ------------------------------------------------------------ security
    checkPassword: (password: string) => need().checkPassword(password),
    /** Confirmation links go to the old and the new address; the change shows as pending until then. */
    changeEmail: (email: string) => need().changeEmail(email.trim(), redirectUrl('/auth/callback')),
    /** Change (or set) the password, then sign out every other device. */
    async changePassword(password: string, nonce?: string) {
      await need().changePassword(password, nonce)
      await need()
        .signOutOtherDevices()
        .catch(() => undefined)
    },
    sendReauthenticationCode: () => need().sendReauthenticationCode(),
    signOutOtherDevices: () => need().signOutOtherDevices(),
    resendVerificationEmail() {
      const email = state.user?.email
      if (!email) throw new AuthError('unknown', 'No email address.')
      return need().resendVerificationEmail(email, redirectUrl('/auth/callback'))
    },
    recentSignIns: () => need().recentSignIns(),
    listIdentities: () => need().listIdentities(),
    linkGoogle: () => need().linkGoogle(redirectUrl('/auth/callback')),
    unlinkIdentity: (identityId: string) => need().unlinkIdentity(identityId),
    serviceSettings: () => need().serviceSettings(),

    // ------------------------------------------------------------ two-factor settings
    getMfaState: () => need().getMfaState(),
    enrollTotp: () => need().enrollTotp(),
    /** Confirm a new method with its first code. */
    confirmMfaFactor: (factorId: string, code: string) => need().verifyMfaCode(factorId, code),
    /** Confirm a new SMS method with the code it was sent. */
    confirmMfaSmsFactor: (factorId: string, challengeId: string, code: string) => need().verifyMfaSms(factorId, challengeId, code),
    enrollPhoneFactor: (phone: string) => need().enrollPhoneFactor(phone),
    removeMfaFactor: (factorId: string) => need().removeMfaFactor(factorId),
    regenerateRecoveryCodes: () => need().regenerateRecoveryCodes(),
    clearRecoveryCodes: () => need().clearRecoveryCodes(),

    // ------------------------------------------------------------ phone and card
    notePhoneAttempt: () => need().notePhoneAttempt(),
    startPhoneVerification: (phone: string) => need().startPhoneVerification(phone),
    async confirmPhone(phone: string, code: string) {
      await need().confirmPhone(phone, code)
      takeProfile(await need().getProfile(userId()))
    },
    startCardVerification: () => need().startCardVerification(),
    async removeCardVerification() {
      takeProfile(await need().removeCardVerification())
    },
  }
}

export type AuthStore = ReturnType<typeof createAuthStore>
