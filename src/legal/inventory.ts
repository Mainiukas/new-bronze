/**
 * Everything Bronze stores in the browser and every piece of personal data it
 * handles, in one place: the Cookie Policy and Privacy Policy are generated
 * from these lists, the consent banner gates writes by `category`, and a test
 * checks every storage key in the code is listed here.
 */

import { STORAGE_KEYS } from '../lib/storageKeys'
import { SERVICES } from './operator'

/** Consent categories. Essential storage is always on; the others need consent. */
export type StorageCategory = 'essential' | 'preferences' | 'analytics' | 'marketing'

export interface StorageItem {
  /** Name of the cookie or storage key (`<id>` stands for an account id). */
  key: string
  where: 'Cookie' | 'Local storage' | 'Session storage'
  /** Who sets it. Everything is first-party: nothing is sent to other sites. */
  provider: string
  purpose: string
  category: StorageCategory
  duration: string
}

/** The session is kept by the Supabase sign-in library, under Bronze's own key (bronze.auth). */
export const AUTH_STORAGE_KEY = 'bronze.auth'
export const CONSENT_STORAGE_KEY = 'bronze.consent'

export const STORAGE_ITEMS: StorageItem[] = [
  {
    key: CONSENT_STORAGE_KEY,
    where: 'Local storage',
    provider: 'Bronze',
    purpose: 'Remembers your cookie choices, with the date and the policy version you chose them for.',
    category: 'essential',
    duration: '12 months, or until the policy changes',
  },
  {
    key: AUTH_STORAGE_KEY,
    where: 'Local storage',
    provider: 'Bronze (Supabase sign-in library)',
    purpose: 'Keeps you logged in: your session tokens and basic account details (account id, email address).',
    category: 'essential',
    duration: 'Until you log out; without “Remember me”, until you close the browser',
  },
  {
    key: `${AUTH_STORAGE_KEY}-code-verifier`,
    where: 'Local storage',
    provider: 'Bronze (Supabase sign-in library)',
    purpose: 'A one-time secret that safely finishes a Google sign-in or an email link.',
    category: 'essential',
    duration: 'Removed once used',
  },
  {
    key: `${AUTH_STORAGE_KEY}-user`,
    where: 'Local storage',
    provider: 'Bronze (Supabase sign-in library)',
    purpose: 'Account details kept beside the session by some versions of the sign-in library.',
    category: 'essential',
    duration: 'Until you log out',
  },
  {
    key: 'bronze.auth.remember',
    where: 'Local storage',
    provider: 'Bronze',
    purpose: 'Whether you ticked “Remember me” when you logged in.',
    category: 'essential',
    duration: 'Until you next log in',
  },
  {
    key: 'bronze_session_alive',
    where: 'Cookie',
    provider: 'Bronze',
    purpose: 'Tells Bronze the browser has been closed, so a log-in without “Remember me” ends. Holds only the value 1.',
    category: 'essential',
    duration: 'Until you close the browser (session cookie)',
  },
  {
    key: 'bronze.auth.returnTo',
    where: 'Session storage',
    provider: 'Bronze',
    purpose: 'The page to return to after signing in with Google.',
    category: 'essential',
    duration: 'This tab only; removed after signing in',
  },
  {
    key: 'bronze.auth.failures',
    where: 'Session storage',
    provider: 'Bronze',
    purpose: 'Counts wrong passwords, to pause log-ins for 30 seconds after 5 (security).',
    category: 'essential',
    duration: 'This tab only',
  },
  {
    key: STORAGE_KEYS.match,
    where: 'Local storage',
    provider: 'Bronze',
    purpose: 'The match you’re playing, so Continue picks it up where you left off.',
    category: 'essential',
    duration: 'Until the match ends or you abandon it',
  },
  {
    key: `${STORAGE_KEYS.stats}.pending.<id>`,
    where: 'Local storage',
    provider: 'Bronze',
    purpose: 'Your account’s finished matches (and guest record) until the server confirms each is saved, so a lost connection loses nothing.',
    category: 'essential',
    duration: 'Removed once saved',
  },
  {
    key: STORAGE_KEYS.boardDraft,
    where: 'Local storage',
    provider: 'Bronze',
    purpose: 'Unsaved changes in the map editor (#/board?edit=1). Only created if you use the editor.',
    category: 'essential',
    duration: 'Until you reset them',
  },
  {
    key: STORAGE_KEYS.settings,
    where: 'Local storage',
    provider: 'Bronze',
    purpose: 'Your settings: sound, volumes, animation and computer speed, move timer, match log.',
    category: 'preferences',
    duration: 'Until you clear it or withdraw consent',
  },
  {
    key: STORAGE_KEYS.gameMode,
    where: 'Local storage',
    provider: 'Bronze',
    purpose: 'The game mode you last picked.',
    category: 'preferences',
    duration: 'Until you clear it or withdraw consent',
  },
  {
    key: STORAGE_KEYS.map,
    where: 'Local storage',
    provider: 'Bronze',
    purpose: 'The map you last picked.',
    category: 'preferences',
    duration: 'Until you clear it or withdraw consent',
  },
  {
    key: STORAGE_KEYS.setup,
    where: 'Local storage',
    provider: 'Bronze',
    purpose: 'The seats you last set up for a match: names, colours and computer levels.',
    category: 'preferences',
    duration: 'Until you clear it or withdraw consent',
  },
  {
    key: STORAGE_KEYS.stats,
    where: 'Local storage',
    provider: 'Bronze',
    purpose: 'Your record and achievements while you play as a guest (added to your account if you log in).',
    category: 'preferences',
    duration: 'Until you clear it, withdraw consent or log in',
  },
]

/** The category a storage key belongs to (keys not listed count as preferences, the safe default). */
export function categoryOf(key: string): StorageCategory {
  const exact = STORAGE_ITEMS.find((item) => item.key === key)
  if (exact) return exact.category
  const pattern = STORAGE_ITEMS.find((item) => item.key.includes('<id>') && key.startsWith(item.key.split('<id>')[0]))
  return pattern?.category ?? 'preferences'
}

export interface ConsentCategoryInfo {
  id: StorageCategory
  title: string
  description: string
}

/** What each category covers, in the banner and the Cookie Policy. */
export const CATEGORIES: ConsentCategoryInfo[] = [
  {
    id: 'essential',
    title: 'Essential',
    description: 'Keep you logged in, keep your match in progress, and remember your cookie choices. Always on.',
  },
  {
    id: 'preferences',
    title: 'Preferences',
    description: 'Remember your settings, your last game mode, map and seats, and your guest record, on this device.',
  },
  {
    id: 'analytics',
    title: 'Analytics',
    description: 'Bronze uses no analytics today. If it ever does, it will only run with this on.',
  },
  {
    id: 'marketing',
    title: 'Marketing',
    description: 'Bronze uses no advertising or marketing trackers today. If it ever does, they will only run with this on.',
  },
]

/* ---- Personal data ---------------------------------------------------------- */

export interface DataItem {
  what: string
  why: string
  /** GDPR article 6(1) legal basis. */
  basis: string
  retention: string
}

/** Personal data handled for account holders (guests: nothing leaves the device). */
export const ACCOUNT_DATA: DataItem[] = [
  {
    what: 'Email address',
    why: 'To log you in, and to send account emails (confirming your address, resetting your password).',
    basis: 'Contract (art. 6(1)(b))',
    retention: 'Until you delete your account',
  },
  {
    what: 'Password',
    why: 'To log you in. Stored only as a one-way hash by Supabase; nobody can read it.',
    basis: 'Contract (art. 6(1)(b))',
    retention: 'Until you delete your account',
  },
  {
    what: 'Username',
    why: 'Your name in the game. Other players can see it.',
    basis: 'Contract (art. 6(1)(b))',
    retention: 'Until you delete your account',
  },
  {
    what: 'Google account details (name, email address, profile photo, Google account id), only if you sign in with Google',
    why: 'To log you in with Google. Your name suggests a username; your photo is shown as your avatar, which other players can see.',
    basis: 'Contract (art. 6(1)(b))',
    retention: 'Until you delete your account',
  },
  {
    what: 'Age confirmation: whether you are 14–17 or 18 or over (not your birth date)',
    why: 'Accounts are only for people aged 14 or over; no marketing is sent to anyone under 18.',
    basis: 'Legal obligation (art. 6(1)(c), GDPR art. 8)',
    retention: 'Until you delete your account',
  },
  {
    what: 'Consent records: what you agreed to (Terms, Privacy Policy, marketing emails), its version and when',
    why: 'To show what you agreed to, as the law requires.',
    basis: 'Legal obligation (art. 6(1)(c), GDPR art. 7(1))',
    retention: 'Until you delete your account',
  },
  {
    what: 'Email preferences (marketing, friend and tournament emails; all off unless you turn them on)',
    why: 'To send only the emails you asked for, and to let you unsubscribe in one click.',
    basis: 'Consent for marketing (art. 6(1)(a)); contract for the others (art. 6(1)(b))',
    retention: 'Until you delete your account',
  },
  {
    what: 'Game record: matches, wins, best score, goods shipped, maps played, achievements and when you unlocked them, and when you joined; and a random id for each saved result',
    why: 'Your profile and achievements. Other signed-in players can see your record. The ids make sure a result sent twice is counted once.',
    basis: 'Contract (art. 6(1)(b))',
    retention: 'Until you delete your account',
  },
  {
    what: 'Failed log-in counter: the username tried, how many wrong passwords and when',
    why: 'To pause log-ins for 30 seconds after 5 wrong passwords, against password guessing.',
    basis: 'Legitimate interest in security (art. 6(1)(f))',
    retention: 'Cleared on a successful log-in; otherwise deleted after a day',
  },
  {
    what: 'Sign-in events kept by Supabase (time, IP address, browser)',
    why: 'Security of the sign-in service.',
    basis: 'Legitimate interest in security (art. 6(1)(f))',
    retention: SERVICES.authLogRetention,
  },
]

/** For everyone, guests included. */
export const VISITOR_DATA: DataItem[] = [
  {
    what: 'Server logs kept by the hosting provider (IP address, pages requested, browser, time)',
    why: 'To deliver the website and keep it secure.',
    basis: 'Legitimate interest (art. 6(1)(f))',
    retention: SERVICES.hostingLogRetention,
  },
]

export interface Recipient {
  name: string
  role: string
  data: string
  location: string
}

/** Who else handles personal data. */
export const RECIPIENTS: Recipient[] = [
  {
    name: 'Supabase, Inc.',
    role: 'Processor: database, sign-in and account emails',
    data: 'All account data listed above',
    location: `Project region: ${SERVICES.supabaseRegion}. Supabase is a US company.`,
  },
  {
    name: 'Google (Google Ireland Limited, for people in the EEA)',
    role: 'Independent controller, only if you choose “Continue with Google”',
    data: 'Google confirms who you are and shares your name, email address and photo with Bronze',
    location: 'See Google’s privacy policy',
  },
  {
    name: SERVICES.hosting,
    role: 'Processor: hosts the website’s files',
    data: 'Server logs (IP address, pages requested, browser)',
    location: SERVICES.hosting,
  },
  {
    name: SERVICES.emailProvider,
    role: 'Processor: sends account emails',
    data: 'Email address, and the email’s content',
    location: SERVICES.emailProvider,
  },
  {
    name: 'Other players',
    role: 'Can see your public profile',
    data: 'Username, avatar, game record, when you joined',
    location: 'Anywhere Bronze is played',
  },
]
