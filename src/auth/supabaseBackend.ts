import { isAuthError, type EmailOtpType, type User } from '@supabase/supabase-js'
import { parseStats } from '../data/achievements'
import { TERMS_VERSION } from '../legal/operator'
import { createSupabaseClient, SESSION_STORAGE_KEY, type BronzeSupabase, type ProfileRow, type SettingsRow } from '../lib/supabase'
import { AuthError, type AuthBackend, type AuthErrorCode, type AuthUser, type EmailPreferences, type Profile } from './backend'

/**
 * Accounts on Supabase Auth, with player profiles in the `profiles` table
 * (supabase/migrations/001_accounts.sql, SETUP.md). Wins, matches and the
 * best score are changed only by the server (record_match_result,
 * merge_guest_stats); the browser never writes them.
 */

const REMEMBER_KEY = 'bronze.auth.remember'
/** A cookie with no expiry: the browser drops it on closing, which is how "Remember me" off ends the session. */
const ALIVE_COOKIE = 'bronze_session_alive'

/** The columns other signed-in players may read (the private ones have no grant). */
const PROFILE_COLUMNS = 'id, username, avatar, wins, matches, best_score, goods_shipped, maps_played, achievements, created_at, needs_username'

const toPreferences = (rows: SettingsRow[] | null): EmailPreferences => {
  const row = rows?.[0]
  return { adult: !!row?.is_adult, marketing: !!row?.email_marketing, friends: !!row?.email_friends, tournaments: !!row?.email_tournaments }
}

function safely<T>(run: () => T): T | undefined {
  try {
    return run()
  } catch {
    return undefined
  }
}

/** "Remember me" was off and the browser has been closed since: forget that session. */
function expireForgottenSession() {
  const remember = safely(() => localStorage.getItem(REMEMBER_KEY)) !== '0'
  const alive = safely(() => document.cookie.split('; ').includes(`${ALIVE_COOKIE}=1`))
  if (!remember && !alive) {
    safely(() => localStorage.removeItem(SESSION_STORAGE_KEY))
    safely(() => localStorage.removeItem(`${SESSION_STORAGE_KEY}-user`))
  }
  markBrowserSession()
}

function markBrowserSession() {
  safely(() => (document.cookie = `${ALIVE_COOKIE}=1; path=/; SameSite=Lax`))
}

const toAuthUser = (user: User): AuthUser => {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null)
  return {
    id: user.id,
    email: user.email ?? null,
    displayName: text(meta.full_name) ?? text(meta.name),
    avatarUrl: text(meta.avatar_url) ?? text(meta.picture),
  }
}

/** A profile row as the app's Profile. Null while the player has no chosen username yet. */
const toProfile = (row: ProfileRow | null | undefined): Profile | null =>
  !row || row.needs_username
    ? null
    : {
        id: row.id,
        username: row.username,
        avatarUrl: row.avatar,
        createdAt: row.created_at,
        stats: parseStats({
          matches: row.matches,
          wins: row.wins,
          bestScore: row.best_score,
          goodsShipped: row.goods_shipped,
          mapsPlayed: row.maps_played ?? [],
          unlocked: row.achievements ?? {},
        })!,
      }

const CODES: Record<string, AuthErrorCode> = {
  invalid_credentials: 'invalid-credentials',
  email_not_confirmed: 'email-not-confirmed',
  user_already_exists: 'email-taken',
  email_exists: 'email-taken',
  over_request_rate_limit: 'rate-limited',
  over_email_send_rate_limit: 'rate-limited',
  weak_password: 'weak-password',
  same_password: 'same-password',
  otp_expired: 'link-invalid',
  flow_state_not_found: 'link-invalid',
  flow_state_expired: 'link-invalid',
  bad_code_verifier: 'link-invalid',
}

/** Supabase's errors, as the forms' error codes. */
function toAuthError(error: unknown): AuthError {
  if (error instanceof AuthError) return error
  if (isAuthError(error)) {
    if (error.code && CODES[error.code]) return new AuthError(CODES[error.code], error.message)
    if (error.name === 'AuthPKCECodeVerifierMissingError' || error.name === 'AuthPKCEGrantCodeExchangeError') return new AuthError('link-invalid', error.message)
    if (error.name === 'AuthRetryableFetchError' || error.status === 0) return new AuthError('network', error.message)
    if (error.status === 429) return new AuthError('rate-limited', error.message)
    // The new-user trigger failed; the likeliest cause is a username taken a moment ago.
    if (/database error saving new user/i.test(error.message)) return new AuthError('username-taken', error.message)
    return new AuthError('unknown', error.message)
  }
  const message = typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : String(error)
  if (error instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(message)) return new AuthError('network', message)
  return new AuthError('unknown', message)
}

/** Connect to the configured project. Null when accounts aren't configured. */
export async function loadSupabaseBackend(): Promise<AuthBackend | null> {
  expireForgottenSession()
  const client = await createSupabaseClient()
  return client ? createSupabaseBackend(client) : null
}

/** The account backend on a Supabase client (a real one, or a stand-in in tests). */
export function createSupabaseBackend(client: BronzeSupabase): AuthBackend {
  const auth = client.auth

  const getProfile = async (userId: string): Promise<Profile | null> => {
    const { data, error } = await client.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).maybeSingle()
    if (error) throw toAuthError(error)
    return toProfile(data as ProfileRow | null)
  }

  return {
    onUserChange(callback) {
      const { data } = auth.onAuthStateChange((event, session) => {
        // Supabase asks that other auth calls not run inside this callback: hand off first.
        setTimeout(() => callback(session ? toAuthUser(session.user) : null, event === 'PASSWORD_RECOVERY'), 0)
      })
      return () => data.subscription.unsubscribe()
    },

    async signUp({ email, password, username, consent, redirectTo }) {
      // The new-user trigger (001_accounts.sql) makes the profile and records the age answer and consents, with the server's time.
      const metadata = { username, age_band: consent.ageBand, terms_version: consent.termsVersion, marketing: consent.marketing && consent.ageBand === '18+' }
      const { data, error } = await auth.signUp({ email, password, options: { data: metadata, emailRedirectTo: redirectTo } })
      if (error) throw toAuthError(error)
      // With email confirmation on, Supabase answers for an address that's already registered
      // with a user that has no identities (and sends no email) instead of an error.
      if (data.user && data.user.identities?.length === 0) throw new AuthError('email-taken')
      return { needsConfirmation: !data.session }
    },

    async signInWithPassword(email, password) {
      const { error } = await auth.signInWithPassword({ email, password })
      if (error) throw toAuthError(error)
    },

    async emailForLogin(username, password) {
      const { data, error } = await client.rpc('email_for_username', { name: username, password })
      if (error) throw toAuthError(error)
      return typeof data === 'string' && data ? data : null
    },

    async signInWithGoogle(redirectTo) {
      const { error } = await auth.signInWithOAuth({ provider: 'google', options: { redirectTo, queryParams: { prompt: 'select_account' } } })
      if (error) throw toAuthError(error)
    },

    async completeRedirect(params) {
      const failure = params.get('error_description') ?? params.get('error')
      if (failure) {
        const errorCode = params.get('error_code')
        // access_denied with no further code: the player said no on Google's page.
        const code = errorCode === 'otp_expired' ? 'link-invalid' : params.get('error') === 'access_denied' && !errorCode ? 'cancelled' : 'unknown'
        throw new AuthError(code, failure)
      }
      const code = params.get('code')
      const tokenHash = params.get('token_hash')
      const type = params.get('type') as EmailOtpType | null
      if (code) {
        // Reads the flow id (sb_flow_id) from the page URL, so run this before tidying the URL.
        const { error } = await auth.exchangeCodeForSession(code)
        if (error) throw toAuthError(error)
      } else if (tokenHash && type) {
        const { error } = await auth.verifyOtp({ token_hash: tokenHash, type })
        if (error) throw toAuthError(error)
      } else {
        const { data } = await auth.getSession()
        if (!data.session) throw new AuthError('link-invalid')
      }
    },

    async signOut() {
      // "local": this browser only. It clears the stored session even when the server can't be reached.
      await auth.signOut({ scope: 'local' })
    },

    async sendPasswordReset(email, redirectTo) {
      const { error } = await auth.resetPasswordForEmail(email, { redirectTo })
      if (error) throw toAuthError(error)
    },

    async updatePassword(password) {
      const { error } = await auth.updateUser({ password })
      if (error) throw toAuthError(error)
    },

    getProfile,

    async createProfile(user, username, consent) {
      const { data, error } = await client.rpc('finish_signup', {
        p_username: username,
        p_age_band: consent.ageBand,
        p_marketing: consent.marketing && consent.ageBand === '18+',
        p_terms_version: consent.termsVersion,
      })
      if (error) throw error.code === '23505' ? new AuthError('username-taken', error.message) : toAuthError(error)
      const profile = toProfile((data as ProfileRow[] | null)?.[0])
      if (!profile) throw new AuthError('unknown', `No profile for ${user.id} after choosing a username.`)
      return profile
    },

    async deleteAccount() {
      const { error } = await client.rpc('delete_my_account')
      if (error) throw toAuthError(error)
      // The account is gone on the server: clear this browser's session too.
      await auth.signOut({ scope: 'local' })
    },

    async exportData() {
      const { data, error } = await client.rpc('export_my_data')
      if (error) throw toAuthError(error)
      return (data ?? {}) as Record<string, unknown>
    },

    async getEmailPreferences() {
      const { data, error } = await client.rpc('email_preferences')
      if (error) throw toAuthError(error)
      return toPreferences(data as SettingsRow[])
    },

    async setEmailPreferences({ marketing, friends, tournaments }) {
      const { data, error } = await client.rpc('set_email_preferences', { p_marketing: marketing, p_friends: friends, p_tournaments: tournaments, p_version: TERMS_VERSION })
      if (error) throw toAuthError(error)
      return toPreferences(data as SettingsRow[])
    },

    async confirmAdult() {
      const { data, error } = await client.rpc('confirm_adult')
      if (error) throw toAuthError(error)
      return toPreferences(data as SettingsRow[])
    },

    async unsubscribe(token, list) {
      const { data, error } = await client.rpc('unsubscribe', { p_token: token, p_list: list })
      if (error) throw toAuthError(error)
      return data === true
    },

    async recordMatchResult({ id, score, won, goodsShipped, mapId, achievements }) {
      const { data, error } = await client.rpc('record_match_result', {
        score,
        won,
        p_match_id: id,
        p_goods_shipped: goodsShipped,
        p_map_id: mapId,
        p_achievements: achievements,
      })
      if (error) throw toAuthError(error)
      return toProfile((data as ProfileRow[] | null)?.[0])
    },

    async mergeGuestStats({ id, stats }) {
      const { data, error } = await client.rpc('merge_guest_stats', {
        p_merge_id: id,
        p_matches: stats.matches,
        p_wins: stats.wins,
        p_best_score: stats.bestScore,
        p_goods_shipped: stats.goodsShipped,
        p_maps_played: stats.mapsPlayed,
        p_achievements: stats.unlocked,
      })
      if (error) throw toAuthError(error)
      return toProfile((data as ProfileRow[] | null)?.[0])
    },

    async isUsernameAvailable(username) {
      const { data, error } = await client.rpc('is_username_available', { name: username })
      if (error) throw toAuthError(error)
      return data === true
    },

    setRememberMe(remember) {
      safely(() => localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0'))
      markBrowserSession()
    },
  }
}
