import { isAuthError, type EmailOtpType, type Factor, type User } from '@supabase/supabase-js'
import { parseStats } from '../data/achievements'
import { TERMS_VERSION } from '../legal/operator'
import { createSupabaseClient, SESSION_STORAGE_KEY, SUPABASE_ANON_KEY, SUPABASE_URL, type BronzeSupabase, type ProfileRow, type SettingsRow } from '../lib/supabase'
import {
  AuthError,
  type AccountDetails,
  type AuthBackend,
  type AuthErrorCode,
  type AuthUser,
  type EmailPreferences,
  type MatchHistoryPage,
  type MfaFactor,
  type Profile,
  type PublicProfile,
  type Visibility,
} from './backend'

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
const PROFILE_COLUMNS =
  'id, username, avatar, avatar_url, bio, country, wins, matches, best_score, goods_shipped, maps_played, achievements, created_at, needs_username, profile_visibility, history_visibility, phone_verified, card_verified'

/** Avatar images live in the public `avatars` bucket, in a folder per player. */
const AVATAR_BUCKET = 'avatars'

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
  const providers = user.identities?.map((identity) => identity.provider) ?? (user.app_metadata?.providers as string[] | undefined) ?? []
  return {
    id: user.id,
    email: user.email ?? null,
    displayName: text(meta.full_name) ?? text(meta.name),
    avatarUrl: text(meta.avatar_url) ?? text(meta.picture),
    emailVerified: !!user.email_confirmed_at,
    pendingEmail: user.new_email ?? null,
    phone: user.phone_confirmed_at ? text(user.phone) : null,
    pendingPhone: text(user.new_phone),
    providers: [...new Set(providers)],
  }
}

const visibility = (value: unknown): Visibility => (value === 'friends' || value === 'private' ? value : 'public')
const text = (value: unknown) => (typeof value === 'string' && value ? value : null)
const number = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : Number(value) || 0)

/** A profile row as the app's Profile. Null while the player has no chosen username yet. */
const toProfile = (row: ProfileRow | null | undefined): Profile | null =>
  !row || row.needs_username
    ? null
    : {
        id: row.id,
        username: row.username,
        avatarUrl: row.avatar_url ?? row.avatar,
        chosenAvatar: row.avatar_url ?? null,
        bio: row.bio ?? null,
        country: row.country ?? null,
        profileVisibility: visibility(row.profile_visibility),
        historyVisibility: visibility(row.history_visibility),
        phoneVerified: !!row.phone_verified,
        cardVerified: !!row.card_verified,
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
  reauthentication_needed: 'reauth-needed',
  reauthentication_not_valid: 'invalid-code',
  mfa_verification_failed: 'invalid-code',
  mfa_challenge_expired: 'invalid-code',
  mfa_factor_not_found: 'invalid-code',
  insufficient_aal: 'mfa-required',
  phone_provider_disabled: 'unavailable',
  sms_send_failed: 'unavailable',
  mfa_phone_enroll_not_enabled: 'unavailable',
  mfa_phone_verify_not_enabled: 'unavailable',
  mfa_totp_enroll_not_enabled: 'unavailable',
  manual_linking_disabled: 'unavailable',
  identity_already_exists: 'identity-taken',
  phone_exists: 'identity-taken',
  single_identity_not_deletable: 'last-identity',
  email_address_invalid: 'invalid-input',
  validation_failed: 'invalid-input',
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
  // Errors raised by the database functions (002_profiles_security.sql): their message is the code.
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
  const hint = typeof error === 'object' && error !== null && 'hint' in error && typeof error.hint === 'string' ? error.hint : null
  if (code === 'PT429' || message === 'rate-limited') return new AuthError('rate-limited', message)
  if (code === '23505' || message === 'username-taken') return new AuthError('username-taken', message)
  const known: Record<string, AuthErrorCode> = {
    'too-soon': 'too-soon',
    'wrong-password': 'wrong-password',
    'reauth-needed': 'reauth-needed',
    'mfa-required': 'mfa-required',
    'same-username': 'same-username',
    'invalid-username': 'invalid-input',
    'bio-too-long': 'invalid-input',
    'invalid-country': 'invalid-input',
    'invalid-avatar': 'invalid-input',
    'invalid-visibility': 'invalid-input',
    'invalid-reason': 'invalid-input',
    'invalid-target': 'invalid-input',
  }
  if (known[message]) return new AuthError(known[message], message, hint)
  return new AuthError('unknown', message)
}

/** A one-time code check failed: wrong or expired code, not a broken link. */
function codeError(error: unknown): AuthError {
  const mapped = toAuthError(error)
  return mapped.code === 'link-invalid' || mapped.code === 'invalid-credentials' ? new AuthError('invalid-code', mapped.message) : mapped
}

const toFactor = (factor: Factor): MfaFactor => ({
  id: factor.id,
  type: factor.factor_type === 'phone' ? 'phone' : 'totp',
  verified: factor.status === 'verified',
  phone: (factor as Factor & { phone?: string }).phone ?? null,
})

const toPublicProfile = (row: Record<string, unknown>): PublicProfile => {
  const stats = row.stats as Record<string, unknown> | undefined
  const summary = row.summary as Record<string, unknown> | undefined
  return {
    username: String(row.username),
    avatarUrl: text(row.avatar),
    private: row.private === true,
    isSelf: row.is_self === true,
    createdAt: text(row.created_at) ?? undefined,
    bio: text(row.bio),
    country: text(row.country),
    phoneVerified: row.phone_verified === true,
    cardVerified: row.card_verified === true,
    historyVisible: row.history_visible === true,
    stats: stats
      ? parseStats({
          matches: stats.matches,
          wins: stats.wins,
          bestScore: stats.best_score,
          goodsShipped: stats.goods_shipped,
          mapsPlayed: stats.maps_played ?? [],
          unlocked: stats.achievements ?? {},
        })
      : undefined,
    summary: summary
      ? {
          recordedMatches: number(summary.recorded_matches),
          averageScore: summary.average_score === null || summary.average_score === undefined ? null : number(summary.average_score),
          links: number(summary.links),
          industries: number(summary.industries),
          favouriteMode: text(summary.favourite_mode),
          favouriteMap: text(summary.favourite_map),
        }
      : undefined,
  }
}

const toAccount = (row: Record<string, unknown>): AccountDetails => ({
  bio: text(row.bio),
  country: text(row.country),
  chosenAvatar: text(row.avatar_url),
  profileVisibility: visibility(row.profile_visibility),
  historyVisibility: visibility(row.history_visibility),
  phoneVerified: row.phone_verified === true,
  cardVerified: row.card_verified === true,
  cardVerifiedAt: text(row.card_verified_at),
  cardBrand: text(row.card_brand),
  cardLast4: text(row.card_last4),
  usernameChangedAt: text(row.username_changed_at),
  nextUsernameChangeAt: text(row.next_username_change_at),
  hasPassword: row.has_password === true,
  lastSignInAt: text(row.last_sign_in_at),
  recoveryCodesLeft: number(row.recovery_codes_left),
})

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
      // Storage files can only be removed through its API: the avatar images first (best effort).
      const { data: session } = await auth.getSession()
      const userId = session.session?.user.id
      if (userId) {
        const { data: files } = await client.storage.from(AVATAR_BUCKET).list(userId)
        if (files?.length) await client.storage.from(AVATAR_BUCKET).remove(files.map((file) => `${userId}/${file.name}`))
      }
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

    async recordMatchResult({ id, score, won, goodsShipped, mapId, achievements, modeId, players, placement, links, industries }) {
      const { data, error } = await client.rpc('record_match_result', {
        score,
        won,
        p_match_id: id,
        p_goods_shipped: goodsShipped,
        p_map_id: mapId,
        p_achievements: achievements,
        ...(modeId !== undefined ? { p_mode_id: modeId } : {}),
        ...(players !== undefined ? { p_players: players } : {}),
        ...(placement !== undefined ? { p_placement: placement } : {}),
        ...(links !== undefined ? { p_links: links } : {}),
        ...(industries !== undefined ? { p_industries: industries } : {}),
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

    // ------------------------------------------------------------ profiles
    async getPublicProfile(username) {
      const { data, error } = await client.rpc('get_public_profile', { p_username: username })
      if (error) throw toAuthError(error)
      if (!data) return { kind: 'missing' }
      if (typeof data.redirect === 'string') return { kind: 'renamed', username: data.redirect }
      return { kind: 'found', profile: toPublicProfile(data) }
    },

    async getMatchHistory(username, page) {
      const { data, error } = await client.rpc('get_match_history', { p_username: username, p_page: page })
      if (error) throw toAuthError(error)
      if (!data) return null
      const items = Array.isArray(data.items) ? (data.items as Record<string, unknown>[]) : []
      const result: MatchHistoryPage = {
        total: number(data.total),
        page: number(data.page),
        pageSize: number(data.page_size) || 10,
        items: items.map((item) => ({
          finishedAt: String(item.finished_at),
          mapId: text(item.map_id),
          modeId: text(item.mode_id),
          players: item.players === null ? null : number(item.players),
          placement: item.placement === null ? null : number(item.placement),
          score: number(item.score),
          won: item.won === true,
        })),
      }
      return result
    },

    async reportUser(username, reason, details) {
      const { error } = await client.rpc('report_user', { p_username: username, p_reason: reason, p_details: details.trim() || null })
      if (error) throw toAuthError(error)
    },

    async getAccount() {
      const { data, error } = await client.rpc('my_account')
      if (error) throw toAuthError(error)
      if (!data) throw new AuthError('unknown', 'No account details.')
      return toAccount(data)
    },

    async updateProfileDetails(bio, country) {
      const { data, error } = await client.rpc('update_profile_details', { p_bio: bio, p_country: country })
      if (error) throw toAuthError(error)
      return toProfile((data as ProfileRow[] | null)?.[0])
    },

    async setAvatar(value) {
      const { data, error } = await client.rpc('set_avatar', { p_value: value })
      if (error) throw toAuthError(error)
      return toProfile((data as ProfileRow[] | null)?.[0])
    },

    async uploadAvatar(userId, image) {
      const bucket = client.storage.from(AVATAR_BUCKET)
      const extension = image.type === 'image/webp' ? 'webp' : image.type === 'image/png' ? 'png' : 'jpg'
      const name = `avatar-${Date.now()}.${extension}`
      const { error } = await bucket.upload(`${userId}/${name}`, image, { contentType: image.type, cacheControl: '31536000', upsert: false })
      if (error) throw toAuthError(error)
      // Keep only the new one.
      const { data: files } = await bucket.list(userId)
      const old = (files ?? []).filter((file) => file.name !== name).map((file) => `${userId}/${file.name}`)
      if (old.length) await bucket.remove(old)
      return bucket.getPublicUrl(`${userId}/${name}`).data.publicUrl
    },

    async setPrivacy(profile, history) {
      const { data, error } = await client.rpc('set_privacy', { p_profile: profile, p_history: history })
      if (error) throw toAuthError(error)
      return toProfile((data as ProfileRow[] | null)?.[0])
    },

    async changeUsername(username, password) {
      const { data, error } = await client.rpc('change_username', { p_username: username, p_password: password })
      if (error) throw toAuthError(error)
      if (data === 'wrong-password') throw new AuthError('wrong-password')
    },

    // ------------------------------------------------------------ security
    async checkPassword(password) {
      const { data, error } = await client.rpc('check_my_password', { p_password: password })
      if (error) throw toAuthError(error)
      return data === true
    },

    async changeEmail(email, redirectTo) {
      const { error } = await auth.updateUser({ email }, { emailRedirectTo: redirectTo })
      if (error) throw toAuthError(error)
    },

    async changePassword(password, nonce) {
      const { error } = await auth.updateUser(nonce ? { password, nonce } : { password })
      if (error) throw nonce ? codeError(error) : toAuthError(error)
    },

    async sendReauthenticationCode() {
      const { error } = await auth.reauthenticate()
      if (error) throw toAuthError(error)
    },

    async signOutOtherDevices() {
      const { error } = await auth.signOut({ scope: 'others' })
      if (error) throw toAuthError(error)
    },

    async resendVerificationEmail(email, redirectTo) {
      const { error } = await auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirectTo } })
      if (error) throw toAuthError(error)
    },

    async recentSignIns() {
      const { data, error } = await client.rpc('recent_sign_ins')
      if (error) throw toAuthError(error)
      return (data ?? []).map((row) => ({
        id: row.id,
        signedInAt: row.signed_in_at,
        lastActiveAt: row.last_active_at,
        userAgent: row.user_agent,
        ip: row.ip,
        current: row.current,
      }))
    },

    async listIdentities() {
      const { data, error } = await auth.getUserIdentities()
      if (error) throw toAuthError(error)
      return data.identities.map((identity) => ({
        id: identity.identity_id,
        provider: identity.provider,
        email: text((identity.identity_data as Record<string, unknown> | undefined)?.email),
      }))
    },

    async linkGoogle(redirectTo) {
      const { error } = await auth.linkIdentity({ provider: 'google', options: { redirectTo } })
      if (error) throw toAuthError(error)
    },

    async unlinkIdentity(identityId) {
      const { data, error } = await auth.getUserIdentities()
      if (error) throw toAuthError(error)
      const identity = data.identities.find((item) => item.identity_id === identityId)
      if (!identity) throw new AuthError('unknown', 'That sign-in method is already gone.')
      if (data.identities.length < 2) throw new AuthError('last-identity')
      const { error: unlinkError } = await auth.unlinkIdentity(identity)
      if (unlinkError) throw toAuthError(unlinkError)
    },

    async serviceSettings() {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_ANON_KEY } })
      if (!response.ok) throw new AuthError('network', `Settings: ${response.status}`)
      const settings = (await response.json()) as { external?: Record<string, boolean> }
      return { phone: settings.external?.phone === true, google: settings.external?.google === true }
    },

    // ------------------------------------------------------------ two-factor
    async getMfaState() {
      const [{ data: level, error: levelError }, { data: factors, error: factorsError }] = await Promise.all([
        auth.mfa.getAuthenticatorAssuranceLevel(),
        auth.mfa.listFactors(),
      ])
      if (levelError) throw toAuthError(levelError)
      if (factorsError) throw toAuthError(factorsError)
      return {
        current: level.currentLevel === 'aal2' ? 'aal2' : level.currentLevel === 'aal1' ? 'aal1' : null,
        next: level.nextLevel === 'aal2' ? 'aal2' : level.nextLevel === 'aal1' ? 'aal1' : null,
        factors: (factors?.all ?? []).map(toFactor),
      }
    },

    async enrollTotp() {
      // An unfinished set-up from before would block a new one: remove it first.
      const { data: existing } = await auth.mfa.listFactors()
      for (const factor of existing?.all ?? []) {
        if (factor.factor_type === 'totp' && factor.status !== 'verified') await auth.mfa.unenroll({ factorId: factor.id })
      }
      const { data, error } = await auth.mfa.enroll({ factorType: 'totp', friendlyName: `Authenticator app ${new Date().toISOString().slice(0, 16)}` })
      if (error) throw toAuthError(error)
      return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret }
    },

    async verifyMfaCode(factorId, code) {
      const { error } = await auth.mfa.challengeAndVerify({ factorId, code: code.trim() })
      if (error) throw codeError(error)
    },

    async sendMfaSms(factorId) {
      const { data, error } = await auth.mfa.challenge({ factorId })
      if (error) throw toAuthError(error)
      return data.id
    },

    async verifyMfaSms(factorId, challengeId, code) {
      const { error } = await auth.mfa.verify({ factorId, challengeId, code: code.trim() })
      if (error) throw codeError(error)
    },

    async enrollPhoneFactor(phone) {
      const { data: existing } = await auth.mfa.listFactors()
      for (const factor of existing?.all ?? []) {
        if (factor.factor_type === 'phone' && factor.status !== 'verified') await auth.mfa.unenroll({ factorId: factor.id })
      }
      const { data, error } = await auth.mfa.enroll({ factorType: 'phone', phone })
      if (error) throw toAuthError(error)
      return data.id
    },

    async removeMfaFactor(factorId) {
      const { error } = await auth.mfa.unenroll({ factorId })
      if (error) throw toAuthError(error)
    },

    async regenerateRecoveryCodes() {
      const { data, error } = await client.rpc('regenerate_recovery_codes')
      if (error) throw toAuthError(error)
      return data ?? []
    },

    async clearRecoveryCodes() {
      const { error } = await client.rpc('clear_recovery_codes')
      if (error) throw toAuthError(error)
    },

    async useRecoveryCode(code) {
      const { data, error } = await client.rpc('use_recovery_code', { p_code: code })
      if (error) throw toAuthError(error)
      return data === true
    },

    async refreshSession() {
      const { error } = await auth.refreshSession()
      if (error) throw toAuthError(error)
    },

    // ------------------------------------------------------------ phone
    async notePhoneAttempt() {
      const { data, error } = await client.rpc('note_phone_attempt')
      if (error) throw toAuthError(error)
      return data === true
    },

    async startPhoneVerification(phone) {
      const { error } = await auth.updateUser({ phone })
      if (error) throw toAuthError(error)
    },

    async confirmPhone(phone, code) {
      const { error } = await auth.verifyOtp({ phone, token: code.trim(), type: 'phone_change' })
      if (error) throw codeError(error)
    },

    // ------------------------------------------------------------ card check
    async startCardVerification() {
      const { data, error } = await client.functions.invoke<{ clientSecret?: string; error?: string }>('create-setup-intent', { method: 'POST' })
      if (error) {
        const status = (error as { context?: { status?: number } }).context?.status
        throw new AuthError(status === 404 ? 'unavailable' : status === 429 ? 'rate-limited' : 'network', error.message)
      }
      if (!data?.clientSecret) throw new AuthError('unavailable', data?.error ?? 'No client secret.')
      return data.clientSecret
    },

    async removeCardVerification() {
      const { data, error } = await client.rpc('remove_card_verification')
      if (error) throw toAuthError(error)
      return toProfile((data as ProfileRow[] | null)?.[0])
    },

    setRememberMe(remember) {
      safely(() => localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0'))
      markBrowserSession()
    },
  }
}
