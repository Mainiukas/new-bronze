/**
 * What the app needs from an account service. The only implementation is
 * Supabase (supabaseBackend.ts, on src/lib/supabase.ts); tests use a stand-in. With no service
 * configured the app runs as a guest and never pretends to sign anyone in.
 */

import type { PlayerStats } from '../data/achievements'
import { TERMS_VERSION } from '../legal/operator'
import type { StartLevel } from '../rating/config'

/** A signed-in user, as the sign-in service reports them. */
export interface AuthUser {
  id: string
  email: string | null
  /** Name from the sign-in provider (Google), used to suggest a username. */
  displayName: string | null
  /** Photo from the sign-in provider (Google). */
  avatarUrl: string | null
  /** The email address is confirmed (always, for Google). Optional so older stand-ins still fit. */
  emailVerified?: boolean
  /** A new address waiting for confirmation (email change). */
  pendingEmail?: string | null
  /** Confirmed phone number (E.164 without +, as the service keeps it), if any. */
  phone?: string | null
  /** A phone number waiting for its SMS code. */
  pendingPhone?: string | null
  /** How they can sign in: 'email' (a password) and/or 'google'. */
  providers?: string[]
}

/** Who may see a profile or its match history. Friends-only means "only you" until friends exist. */
export type Visibility = 'public' | 'friends' | 'private'

/** A player's profile (the `profiles` table), as its owner sees it. */
export interface Profile {
  id: string
  username: string
  /** What to show: their chosen avatar ('preset:<id>' or an uploaded image), else the sign-in photo. */
  avatarUrl: string | null
  createdAt: string
  stats: PlayerStats
  bio?: string | null
  /** ISO 3166 country code, e.g. 'LT'. */
  country?: string | null
  /** Their own choice ('preset:<id>' or an uploaded image), without the sign-in photo. */
  chosenAvatar?: string | null
  profileVisibility?: Visibility
  historyVisibility?: Visibility
  phoneVerified?: boolean
  cardVerified?: boolean
}

/** The signed-in player's own account details, private ones included (Settings → Account). */
export interface AccountDetails {
  bio: string | null
  country: string | null
  chosenAvatar: string | null
  profileVisibility: Visibility
  historyVisibility: Visibility
  phoneVerified: boolean
  cardVerified: boolean
  cardVerifiedAt: string | null
  cardBrand: string | null
  cardLast4: string | null
  usernameChangedAt: string | null
  /** When the username may change again (30 days after the last change); null: now. */
  nextUsernameChangeAt: string | null
  /** False for accounts that only sign in with Google. */
  hasPassword: boolean
  lastSignInAt: string | null
  recoveryCodesLeft: number
}

/** What the profile page shows (get_public_profile): everything, or for a private profile just the name and avatar. */
export interface PublicProfile {
  username: string
  avatarUrl: string | null
  /** Private (or friends-only, to anyone else): only username and avatar are filled in. */
  private: boolean
  isSelf: boolean
  createdAt?: string
  bio?: string | null
  country?: string | null
  phoneVerified?: boolean
  cardVerified?: boolean
  historyVisible?: boolean
  stats?: PlayerStats
  summary?: ProfileSummary
}

/** Figures from the match history (matches finished while logged in). */
export interface ProfileSummary {
  recordedMatches: number
  averageScore: number | null
  links: number
  industries: number
  favouriteMode: string | null
  favouriteMap: string | null
}

export type PublicProfileResult = { kind: 'found'; profile: PublicProfile } | { kind: 'renamed'; username: string } | { kind: 'missing' }

export interface MatchHistoryItem {
  finishedAt: string
  mapId: string | null
  modeId: string | null
  players: number | null
  placement: number | null
  score: number
  won: boolean
}

export interface MatchHistoryPage {
  /** How many of the last 20 there are. */
  total: number
  page: number
  pageSize: number
  items: MatchHistoryItem[]
}

export type ReportReason = 'cheating' | 'offensive-name' | 'harassment' | 'spam' | 'other'

/** A two-factor method: an authenticator app (TOTP) or SMS codes. */
export interface MfaFactor {
  id: string
  type: 'totp' | 'phone'
  verified: boolean
  phone?: string | null
}

/** Where the session stands on two-factor authentication. */
export interface MfaState {
  /** aal2: this session passed 2FA. */
  current: 'aal1' | 'aal2' | null
  /** aal2: the account has 2FA, so the session must pass it. */
  next: 'aal1' | 'aal2' | null
  factors: MfaFactor[]
}

/** A new authenticator-app method waiting for its first code. */
export interface TotpEnrollment {
  factorId: string
  /** The QR code, as an SVG data URL. */
  qrCode: string
  /** The same secret as text, for typing in. */
  secret: string
}

export interface SignInRecord {
  id: string
  signedInAt: string
  lastActiveAt: string
  userAgent: string | null
  ip: string | null
  current: boolean
}

export interface LinkedIdentity {
  id: string
  provider: string
  email: string | null
}

/** What the account service has turned on (Authentication → Sign In / Providers). */
export interface ServiceSettings {
  phone: boolean
  google: boolean
}

export type AuthErrorCode =
  | 'invalid-credentials'
  | 'email-not-confirmed'
  | 'email-taken'
  | 'username-taken'
  | 'rate-limited'
  | 'weak-password'
  | 'same-password'
  | 'link-invalid'
  | 'cancelled'
  | 'network'
  | 'wrong-password'
  | 'too-soon'
  | 'same-username'
  | 'reauth-needed'
  | 'mfa-required'
  | 'invalid-code'
  | 'unavailable'
  | 'last-identity'
  | 'identity-taken'
  | 'invalid-input'
  | 'unknown'

/** A failure the forms know how to explain. */
export class AuthError extends Error {
  readonly code: AuthErrorCode
  /** More about it, e.g. when a username may change again (ISO date) for 'too-soon'. */
  readonly detail: string | null
  constructor(code: AuthErrorCode, message?: string, detail: string | null = null) {
    super(message ?? code)
    this.name = 'AuthError'
    this.code = code
    this.detail = detail
  }
}

/** The age question at sign-up: accounts are for 14 and over; under-18s get no marketing. */
export type AgeBand = '14-17' | '18+'

/** What someone agreed to when creating an account (stored server-side with the time). */
export interface SignupConsent {
  ageBand: AgeBand
  /** Terms of Service and Privacy Policy, this version (always true: the account can't be made without it). */
  termsVersion: string
  /** Optional marketing emails. Always false for under-18s. */
  marketing: boolean
}

/** The consents to send with a new account (the Terms box is ticked and the age is 14 or over to get here). */
export const signupConsent = (age: AgeBand, marketing: boolean): SignupConsent => ({
  ageBand: age,
  termsVersion: TERMS_VERSION,
  marketing: age === '18+' && marketing,
})

export interface SignUpInput {
  email: string
  password: string
  username: string
  consent: SignupConsent
  /** Where the confirmation email's link lands. */
  redirectTo: string
}

/** One finished match, for the signed-in player's record (counted once per id, however often it's sent). */
export interface MatchResult {
  /** Made on this device when the match finished (a UUID). */
  id: string
  score: number
  won: boolean
  goodsShipped: number
  mapId: string
  /** Achievement ids this match unlocked. */
  achievements: string[]
  modeId?: string
  players?: number
  /** 1 for the winner. */
  placement?: number
  links?: number
  industries?: number
}

/** A device's guest record moving into the account (applied once per id). */
export interface GuestMerge {
  id: string
  stats: PlayerStats
}

/** Optional emails, all off unless turned on. Bronze sends none of these yet. */
export type EmailList = 'marketing' | 'friends' | 'tournaments'

export interface EmailPreferences {
  marketing: boolean
  friends: boolean
  tournaments: boolean
  /** 18 or over: marketing can only be turned on then. */
  adult: boolean
}

/** Where a signed-in player is in the first-time welcome slides. */
export interface OnboardingState {
  /** The slide to show (1–5): saved as they go, so a closed tab resumes there. */
  step: number
  done: boolean
  /** The starting level can be picked until the first rated game. */
  canPickLevel: boolean
  rulesAccepted: boolean
}

export interface AuthBackend {
  /**
   * Calls back with the signed-in user (or null) soon after subscribing, then
   * on every change. `recovery`: this sign-in came from a password-reset link
   * (Supabase's PASSWORD_RECOVERY event).
   */
  onUserChange(callback: (user: AuthUser | null, recovery: boolean) => void): () => void
  signUp(input: SignUpInput): Promise<{ needsConfirmation: boolean }>
  signInWithPassword(email: string, password: string): Promise<void>
  /** The email behind a username, only when `password` is right for it (so emails never leak). */
  emailForLogin(username: string, password: string): Promise<string | null>
  /** Leaves the page for Google; it comes back to `redirectTo`. */
  signInWithGoogle(redirectTo: string): Promise<void>
  /** Finish a return from Google or from an email link (the page URL's query). */
  completeRedirect(params: URLSearchParams): Promise<void>
  signOut(): Promise<void>
  sendPasswordReset(email: string, redirectTo: string): Promise<void>
  updatePassword(password: string): Promise<void>
  /** The player's profile, or null while they have no chosen username yet (first Google sign-in). */
  getProfile(userId: string): Promise<Profile | null>
  /** Finish a sign-up that has no chosen username yet (first Google sign-in): username, age and consents together. */
  createProfile(user: AuthUser, username: string, consent: SignupConsent): Promise<Profile>
  /** Delete the signed-in account and everything stored with it (also used when a first Google sign-in is declined). */
  deleteAccount(): Promise<void>
  /** Everything stored about the signed-in account, for "Download my data". */
  exportData(): Promise<Record<string, unknown>>
  getEmailPreferences(): Promise<EmailPreferences>
  setEmailPreferences(preferences: Omit<EmailPreferences, 'adult'>): Promise<EmailPreferences>
  /** "I'm 18 or over now": lets marketing emails be turned on. */
  confirmAdult(): Promise<EmailPreferences>
  /** One-click unsubscribe from an email's link: works without logging in. */
  unsubscribe(token: string, list: EmailList | 'all'): Promise<boolean>
  /** Add a finished match to the signed-in player's record (the server does the adding). Returns the updated profile. */
  recordMatchResult(result: MatchResult): Promise<Profile | null>
  /** Add a guest record to the signed-in player's record, once. Returns the updated profile. */
  mergeGuestStats(merge: GuestMerge): Promise<Profile | null>
  isUsernameAvailable(username: string): Promise<boolean>
  /** The welcome slides; null when the service doesn't have them (its database isn't updated yet). */
  getOnboarding(): Promise<OnboardingState | null>
  setOnboardingStep(step: number): Promise<void>
  /** Slide 4: the Terms, the Privacy Policy and fair play, this version. */
  acceptRules(version: string): Promise<void>
  /** Slide 5: the starting rating for the level; the slides are done. Returns the rating. */
  finishOnboarding(level: StartLevel): Promise<number>
  /** Off: the session ends when the browser closes. */
  setRememberMe(remember: boolean): void

  // Profiles
  getPublicProfile(username: string): Promise<PublicProfileResult>
  /** The last 20 matches, a page at a time; null when the viewer may not see them. */
  getMatchHistory(username: string, page: number): Promise<MatchHistoryPage | null>
  reportUser(username: string, reason: ReportReason, details: string): Promise<void>
  getAccount(): Promise<AccountDetails>
  updateProfileDetails(bio: string, country: string | null): Promise<Profile | null>
  /** 'preset:<id>', an uploaded image's URL, or null for none. */
  setAvatar(value: string | null): Promise<Profile | null>
  /** Uploads an avatar image (already resized) to the player's folder; returns its public URL. Older ones are removed. */
  uploadAvatar(userId: string, image: Blob): Promise<string>
  setPrivacy(profile: Visibility, history: Visibility): Promise<Profile | null>
  /** Needs the current password (or, without one, a log-in in the last 10 minutes). */
  changeUsername(username: string, password: string | null): Promise<void>

  // Security
  /** The current password is right (rate-limited). */
  checkPassword(password: string): Promise<boolean>
  /** Sends confirmation links to the old and the new address. */
  changeEmail(email: string, redirectTo: string): Promise<void>
  /** Change (or, for Google-only accounts, set) the password. `nonce`: the emailed code when a recent log-in is needed. */
  changePassword(password: string, nonce?: string): Promise<void>
  /** Emails a code that confirms it's really them (when a password change needs a recent log-in). */
  sendReauthenticationCode(): Promise<void>
  signOutOtherDevices(): Promise<void>
  resendVerificationEmail(email: string, redirectTo: string): Promise<void>
  recentSignIns(): Promise<SignInRecord[]>
  listIdentities(): Promise<LinkedIdentity[]>
  /** Leaves for Google to link it; comes back to `redirectTo`. */
  linkGoogle(redirectTo: string): Promise<void>
  unlinkIdentity(identityId: string): Promise<void>
  serviceSettings(): Promise<ServiceSettings>

  // Two-factor authentication
  getMfaState(): Promise<MfaState>
  enrollTotp(): Promise<TotpEnrollment>
  /** Check a 6-digit code for a method: confirms a new one, or passes 2FA at log-in. */
  verifyMfaCode(factorId: string, code: string): Promise<void>
  /** Sends an SMS code for a phone method; returns the challenge to verify. */
  sendMfaSms(factorId: string): Promise<string>
  verifyMfaSms(factorId: string, challengeId: string, code: string): Promise<void>
  enrollPhoneFactor(phone: string): Promise<string>
  removeMfaFactor(factorId: string): Promise<void>
  regenerateRecoveryCodes(): Promise<string[]>
  clearRecoveryCodes(): Promise<void>
  /** A right code turns 2FA off (so the player can get in); true if it was right. */
  useRecoveryCode(code: string): Promise<boolean>
  /** Fetch a fresh session (after 2FA changes on the server). */
  refreshSession(): Promise<void>

  // Phone
  /** False once 5 codes have been sent or tried this hour. */
  notePhoneAttempt(): Promise<boolean>
  /** Sends an SMS code to confirm this number (E.164, e.g. +37060012345). */
  startPhoneVerification(phone: string): Promise<void>
  confirmPhone(phone: string, code: string): Promise<void>

  // Card check (Stripe)
  /** A Stripe SetupIntent for checking a card; returns its client secret. */
  startCardVerification(): Promise<string>
  removeCardVerification(): Promise<Profile | null>
}
