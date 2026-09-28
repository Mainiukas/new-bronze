import { AuthError, type AuthErrorCode } from './backend'

/** What to tell the player when an account action fails, in English (each language has its own: t.authErrors). */
export const AUTH_ERRORS_EN: Record<AuthErrorCode, string> = {
  'invalid-credentials': 'Username/email or password is incorrect.',
  'email-not-confirmed': 'Confirm your email first: follow the link we sent you, then log in.',
  'email-taken': 'Email already registered. Log in instead, or reset your password.',
  'username-taken': 'That username is taken. Pick another one.',
  'rate-limited': 'Too many attempts. Wait a minute, then try again.',
  'weak-password': 'That password is too easy to guess. Choose a stronger one.',
  'same-password': 'Choose a password different from your current one.',
  'link-invalid': 'This link is invalid or has expired.',
  cancelled: 'Sign-in was cancelled. Try again, or use your username or email.',
  network: 'Can’t reach the account server. Check your connection and try again.',
  unknown: 'Something went wrong. Please try again.',
}

/** What to tell the player when an account action fails. */
export function authErrorMessage(error: unknown, words: Record<AuthErrorCode, string> = AUTH_ERRORS_EN): string {
  const code = error instanceof AuthError ? error.code : 'unknown'
  return words[code] ?? words.unknown
}
