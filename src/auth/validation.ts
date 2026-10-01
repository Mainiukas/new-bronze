/**
 * Account form rules, shared by the forms and (for usernames) the database:
 * the `profiles.username` check in SETUP.md uses the same pattern.
 */

export const USERNAME_MIN = 3
export const USERNAME_MAX = 20
export const USERNAME_PATTERN = /^[A-Za-z0-9_]+$/
export const PASSWORD_MIN = 8

/** What the forms say about a field, in English (each language has its own in src/i18n: t.validation). */
export const VALIDATION_EN = {
  chooseUsername: 'Choose a username.',
  atLeast: (n: number) => `At least ${n} characters.`,
  atMost: (n: number) => `At most ${n} characters.`,
  usernameChars: 'Letters, numbers and _ only.',
  enterEmail: 'Enter your email.',
  validEmail: 'Enter a valid email, like name@example.com.',
  choosePassword: 'Choose a password.',
  typeAgain: 'Type the password again.',
  noMatch: 'The passwords don’t match.',
  sameUsername: 'That’s already your username.',
  enterCurrentPassword: 'Enter your current password.',
  sameAsCurrent: 'Choose a password different from your current one.',
}

export type ValidationWords = typeof VALIDATION_EN

/** Why a username can't be used, or null when it's well-formed (availability is checked separately). */
export function validateUsername(value: string, w: ValidationWords = VALIDATION_EN): string | null {
  const name = value.trim()
  if (name.length === 0) return w.chooseUsername
  if (name.length < USERNAME_MIN) return w.atLeast(USERNAME_MIN)
  if (name.length > USERNAME_MAX) return w.atMost(USERNAME_MAX)
  if (!USERNAME_PATTERN.test(name)) return w.usernameChars
  return null
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/

export function validateEmail(value: string, w: ValidationWords = VALIDATION_EN): string | null {
  const email = value.trim()
  if (email.length === 0) return w.enterEmail
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return w.validEmail
  return null
}

export const isEmail = (value: string) => value.includes('@')

export function validatePassword(value: string, w: ValidationWords = VALIDATION_EN): string | null {
  if (value.length === 0) return w.choosePassword
  if (value.length < PASSWORD_MIN) return w.atLeast(PASSWORD_MIN)
  return null
}

export function validateConfirmation(password: string, confirmation: string, w: ValidationWords = VALIDATION_EN): string | null {
  if (confirmation.length === 0) return w.typeAgain
  if (password !== confirmation) return w.noMatch
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

/** How often a username may change. */
export const USERNAME_CHANGE_DAYS = 30

/** When the username may change again: 30 days after the last change (null: any time). */
export function nextUsernameChange(changedAt: string | null | undefined): Date | null {
  if (!changedAt) return null
  const last = Date.parse(changedAt)
  return Number.isNaN(last) ? null : new Date(last + USERNAME_CHANGE_DAYS * 24 * 60 * 60 * 1000)
}

export function canChangeUsername(changedAt: string | null | undefined, now: Date = new Date()): boolean {
  const next = nextUsernameChange(changedAt)
  return !next || next.getTime() <= now.getTime()
}

/** Why `next` can't replace `current` (the registration rules, and it must differ), or null. Availability is checked separately. */
export function validateUsernameChange(current: string, next: string, w: ValidationWords = VALIDATION_EN): string | null {
  return validateUsername(next, w) ?? (next.trim() === current ? w.sameUsername : null)
}

export interface PasswordChange {
  /** Empty for accounts that sign in only with Google (they set a first password). */
  current: string
  next: string
  confirm: string
  hasPassword: boolean
}

/** Field errors for a password change: current password (if there is one), new one (8+, not the same), confirmation. */
export function validatePasswordChange({ current, next, confirm, hasPassword }: PasswordChange, w: ValidationWords = VALIDATION_EN) {
  return {
    current: hasPassword && current.length === 0 ? w.enterCurrentPassword : null,
    next: validatePassword(next, w) ?? (hasPassword && next === current ? w.sameAsCurrent : null),
    confirm: validateConfirmation(next, confirm, w),
  }
}
