/**
 * What the app needs from an account service. The only implementation is
 * Supabase (supabaseBackend.ts); tests use a stand-in. With no service
 * configured the app runs as a guest and never pretends to sign anyone in.
 */

import type { PlayerStats } from '../data/achievements'
import { TERMS_VERSION } from '../legal/operator'

/** A signed-in user, as the sign-in service reports them. */
export interface AuthUser {
  id: string
  email: string | null
  /** Name from the sign-in provider (Google), used to suggest a username. */
  displayName: string | null
  /** Photo from the sign-in provider (Google). */
  avatarUrl: string | null
}

/** A player's public profile (the `profiles` table). */
export interface Profile {
  id: string
  username: string
  avatarUrl: string | null
  createdAt: string
  stats: PlayerStats
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
  | 'unknown'

/** A failure the forms know how to explain. */
export class AuthError extends Error {
  readonly code: AuthErrorCode
  constructor(code: AuthErrorCode, message?: string) {
    super(message ?? code)
    this.name = 'AuthError'
    this.code = code
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

/** Optional emails, all off unless turned on. Bronze sends none of these yet. */
export type EmailList = 'marketing' | 'friends' | 'tournaments'

export interface EmailPreferences {
  marketing: boolean
  friends: boolean
  tournaments: boolean
  /** 18 or over: marketing can only be turned on then. */
  adult: boolean
}

export interface AuthBackend {
  /** Calls back with the signed-in user (or null) soon after subscribing, then on every change. */
  onUserChange(callback: (user: AuthUser | null) => void): () => void
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
  getProfile(userId: string): Promise<Profile | null>
  /** Finish a sign-up that has no profile yet (first Google sign-in): username, age and consents together. */
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
  saveStats(userId: string, stats: PlayerStats): Promise<void>
  isUsernameAvailable(username: string): Promise<boolean>
  /** Off: the session ends when the browser closes. */
  setRememberMe(remember: boolean): void
}
