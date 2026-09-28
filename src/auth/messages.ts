import { AuthError } from './backend'

/** What to tell the player when an account action fails. */
export function authErrorMessage(error: unknown): string {
  const code = error instanceof AuthError ? error.code : 'unknown'
  switch (code) {
    case 'invalid-credentials':
      return 'Username/email or password is incorrect.'
    case 'email-not-confirmed':
      return 'Confirm your email first: follow the link we sent you, then log in.'
    case 'email-taken':
      return 'Email already registered. Log in instead, or reset your password.'
    case 'username-taken':
      return 'That username is taken. Pick another one.'
    case 'rate-limited':
      return 'Too many attempts. Wait a minute, then try again.'
    case 'weak-password':
      return 'That password is too easy to guess. Choose a stronger one.'
    case 'same-password':
      return 'Choose a password different from your current one.'
    case 'link-invalid':
      return 'This link is invalid or has expired.'
    case 'cancelled':
      return 'Sign-in was cancelled. Try again, or use your username or email.'
    case 'network':
      return 'Can’t reach the account server. Check your connection and try again.'
    default:
      return 'Something went wrong. Please try again.'
  }
}

export const NOT_CONFIGURED = 'Accounts aren’t configured yet.'
