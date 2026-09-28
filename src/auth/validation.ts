/**
 * Account form rules, shared by the forms and (for usernames) the database:
 * the `profiles.username` check in SETUP.md uses the same pattern.
 */

export const USERNAME_MIN = 3
export const USERNAME_MAX = 20
export const USERNAME_PATTERN = /^[A-Za-z0-9_]+$/
export const PASSWORD_MIN = 8

/** Why a username can't be used, or null when it's well-formed (availability is checked separately). */
export function validateUsername(value: string): string | null {
  const name = value.trim()
  if (name.length === 0) return 'Choose a username.'
  if (name.length < USERNAME_MIN) return `At least ${USERNAME_MIN} characters.`
  if (name.length > USERNAME_MAX) return `At most ${USERNAME_MAX} characters.`
  if (!USERNAME_PATTERN.test(name)) return 'Letters, numbers and _ only.'
  return null
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/

export function validateEmail(value: string): string | null {
  const email = value.trim()
  if (email.length === 0) return 'Enter your email.'
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return 'Enter a valid email, like name@example.com.'
  return null
}

export const isEmail = (value: string) => value.includes('@')

export function validatePassword(value: string): string | null {
  if (value.length === 0) return 'Choose a password.'
  if (value.length < PASSWORD_MIN) return `At least ${PASSWORD_MIN} characters.`
  return null
}

export function validateConfirmation(password: string, confirmation: string): string | null {
  if (confirmation.length === 0) return 'Type the password again.'
  if (password !== confirmation) return 'The passwords don’t match.'
  return null
}

export type PasswordStrength = 'weak' | 'ok' | 'strong'

/**
 * A rough strength rating for the bar under the password field: length plus
 * the kinds of characters used (lower case, upper case, digits, symbols).
 * Too short is weak; a long passphrase is strong; otherwise variety decides.
 */
export function passwordStrength(value: string): PasswordStrength {
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(value)).length
  if (value.length < PASSWORD_MIN) return 'weak'
  if (value.length >= 16) return 'strong'
  if (kinds < 2) return 'weak'
  return value.length >= 12 && kinds >= 3 ? 'strong' : 'ok'
}

/**
 * A username suggestion from a display name (e.g. a Google account's):
 * "Ada Lovelace" → "Ada_Lovelace". Always passes validateUsername.
 */
export function suggestUsername(name: string | null | undefined): string {
  const cleaned = (name ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, USERNAME_MAX)
  return cleaned.length >= USERNAME_MIN ? cleaned : `${cleaned || 'player'}_${Math.floor(Math.random() * 900 + 100)}`.slice(0, USERNAME_MAX)
}
