/**
 * Everything Bronze stores in the browser and every piece of personal data it
 * handles, in one place: the Cookie Policy and Privacy Policy are generated
 * from these lists, and a test checks every storage key in the code is listed
 * here. Everything stored is essential (needed for what you ask Bronze to
 * do); there are no analytics, advertising or tracking tools.
 */

import { STORAGE_KEYS } from '../lib/storageKeys'
import { SERVICES } from './operator'

export interface StorageItem {
  /** Name of the cookie or storage key (`<id>` stands for an account id). */
  key: string
  where: 'Cookie' | 'Local storage' | 'Session storage'
  /** Who sets it. Everything is first-party: nothing is sent to other sites. */
  provider: string
  purpose: string
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
    purpose: 'Remembers that you’ve seen the cookie notice, with the date and the policy version.',
    duration: '12 months, or until the policy changes',
  },
  {
    key: AUTH_STORAGE_KEY,
    where: 'Local storage',
    provider: 'Bronze (Supabase sign-in library)',
    purpose: 'Keeps you logged in: your session tokens and basic account details (account id, email address).',
    duration: 'Until you log out; without “Remember me”, until you close the browser',
  },
  {
    key: `${AUTH_STORAGE_KEY}-code-verifier`,
    where: 'Local storage',
    provider: 'Bronze (Supabase sign-in library)',
    purpose: 'A one-time secret that safely finishes a Google sign-in or an email link.',
    duration: 'Removed once used',
  },
  {
    key: `${AUTH_STORAGE_KEY}-user`,
    where: 'Local storage',
    provider: 'Bronze (Supabase sign-in library)',
    purpose: 'Account details kept beside the session by some versions of the sign-in library.',
    duration: 'Until you log out',
  },
  {
    key: 'bronze.auth.remember',
    where: 'Local storage',
    provider: 'Bronze',
    purpose: 'Whether you ticked “Remember me” when you logged in.',
    duration: 'Until you next log in',
  },
  {
    key: 'bronze_session_alive',
    where: 'Cookie',
    provider: 'Bronze',
    purpose: 'Tells Bronze the browser has been closed, so a log-in without “Remember me” ends. Holds only the value 1.',
    duration: 'Until you close the browser (session cookie)',
  },
  {
    key: 'bronze.auth.returnTo',
    where: 'Session storage',
    provider: 'Bronze',
    purpose: 'The page to return to after signing in with Google.',
    duration: 'This tab only; removed after signing in',
  },
  {
    key: 'bronze.auth.failures',
    where: 'Session storage',
    provider: 'Bronze',
    purpose: 'Counts wrong passwords, to pause log-ins for 30 seconds after 5 (security).',
    duration: 'This tab only',
  },
  {
    key: STORAGE_KEYS.match,
    where: 'Local storage',
    provider: 'Bronze',
    purpose: 'The match you’re playing, so Continue picks it up where you left off.',
    duration: 'Until the match ends or you abandon it',
  },
  {
    key: `${STORAGE_KEYS.stats}.pending.<id>`,
    where: 'Local storage',
    provider: 'Bronze',
    purpose: 'Your account’s finished matches (and guest record) until the server confirms each is saved, so a lost connection loses nothing.',
    duration: 'Removed once saved',
  },
  {
    key: STORAGE_KEYS.boardDraft,
    where: 'Local storage',
    provider: 'Bronze',
    purpose: 'Unsaved changes in the map editor (#/board?edit=1). Only created if you use the editor.',
    duration: 'Until you reset them',
  },
  {
    key: STORAGE_KEYS.settings,
    where: 'Local storage',
    provider: 'Bronze',
    purpose: 'Your settings: sound, volumes, animation and computer speed, move timer, match log.',
    duration: 'Until you clear it',
  },
  {
    key: STORAGE_KEYS.gameMode,
    where: 'Local storage',
    provider: 'Bronze',
    purpose: 'The game mode you last picked.',
    duration: 'Until you clear it',
  },
  {
    key: STORAGE_KEYS.map,
    where: 'Local storage',
    provider: 'Bronze',
    purpose: 'The map you last picked.',
    duration: 'Until you clear it',
  },
  {
    key: STORAGE_KEYS.setup,
    where: 'Local storage',
    provider: 'Bronze',
    purpose: 'The seats you last set up for a match: names, colours and computer levels.',
    duration: 'Until you clear it',
  },
  {
    key: STORAGE_KEYS.stats,
    where: 'Local storage',
    provider: 'Bronze',
    purpose: 'Your record and achievements while you play as a guest (added to your account if you log in).',
    duration: 'Until you clear it or log in',
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
    why: 'To log you in, and to send account emails (confirming your address, resetting your password, security notices when your password, email or two-factor settings change).',
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
    why: 'Your name in the game. Anyone can see it, whatever your privacy settings.',
    basis: 'Contract (art. 6(1)(b))',
    retention: 'Until you delete your account',
  },
  {
    what: 'Previous usernames, and when you changed them',
    why: 'So links to your old name lead to your profile for 30 days, and nobody else can take it (and pass as you) in that time.',
    basis: 'Legitimate interest in preventing impersonation (art. 6(1)(f))',
    retention: '30 days',
  },
  {
    what: 'Profile details you choose to add: bio, country, avatar (a preset or a picture you upload); and your privacy settings',
    why: 'Shown on your profile, to the people your privacy settings allow.',
    basis: 'Contract (art. 6(1)(b))',
    retention: 'Until you change them or delete your account',
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
    why: 'Your profile and achievements, shown to the people your privacy settings allow. The ids make sure a result sent twice is counted once.',
    basis: 'Contract (art. 6(1)(b))',
    retention: 'Until you delete your account',
  },
  {
    what: 'Match history: for each finished match, when, the map and game mode, how many players, your place, score, goods shipped, links and industries',
    why: 'Your recent matches and statistics on your profile, shown to the people your privacy settings allow.',
    basis: 'Contract (art. 6(1)(b))',
    retention: 'Until you delete your account',
  },
  {
    what: 'Online games: the games you played, your seat, every move you made and when, the result, and your clock and connection during the game',
    why: 'To run online games: check every move, keep games fair, show them to their players (and to spectators of public games), and replay them.',
    basis: 'Contract (art. 6(1)(b))',
    retention: 'As long as the game is kept. If you delete your account, your seat shows “Deleted player” and is no longer linked to you; the moves stay so the other players keep their game.',
  },
  {
    what: 'Ratings: your rating on each map, how certain it is, games played, your best, and each change after a rated game',
    why: 'To match players of similar strength, and to show ratings on profiles and the leaderboard.',
    basis: 'Contract (art. 6(1)(b))',
    retention: 'Until you delete your account',
  },
  {
    what: 'Friends: the players you added, friend requests you sent or got, and game invites',
    why: 'Your friends list, requests and invites to games.',
    basis: 'Contract (art. 6(1)(b))',
    retention: 'Until you or your friend remove it, or one of you deletes their account. An invite goes once it’s used or the game starts.',
  },
  {
    what: 'Online status: when your app last talked to the game server',
    why: 'To show your friends whether you’re online (seen in the last 2 minutes).',
    basis: 'Contract (art. 6(1)(b))',
    retention: 'Replaced each time; deleted with your account',
  },
  {
    what: 'Quick play: your rating and the kind of game you want, while you wait for a match',
    why: 'To find you players of similar strength.',
    basis: 'Contract (art. 6(1)(b))',
    retention: 'Until you’re matched or stop waiting',
  },
  {
    what: 'Two-factor authentication, only if you turn it on: the authenticator key (kept by Supabase) and your recovery codes (stored only as one-way hashes)',
    why: 'To ask for a code from your phone when you log in, and to let you in with a recovery code if you lose it.',
    basis: 'Contract (art. 6(1)(b))',
    retention: 'Until you turn it off or delete your account',
  },
  {
    what: 'Reports: when you report a player, or a player reports you: who, the reason, the note and when',
    why: 'To look into cheating, offensive names, harassment and spam, and keep the game fair and safe.',
    basis: 'Legitimate interest in a safe game (art. 6(1)(f))',
    retention: '12 months; sooner if the reported account is deleted',
  },
  {
    what: 'Abuse counters: your account id (or, before you log in, your IP address), which action and how many tries',
    why: 'To limit how often passwords, codes, username checks and reports can be tried, against guessing and spam.',
    basis: 'Legitimate interest in security (art. 6(1)(f))',
    retention: 'Deleted after a day',
  },
  {
    what: 'Failed log-in counter: the username tried, how many wrong passwords and when',
    why: 'To pause log-ins for 30 seconds after 5 wrong passwords, against password guessing.',
    basis: 'Legitimate interest in security (art. 6(1)(f))',
    retention: 'Cleared on a successful log-in; otherwise deleted after a day',
  },
  {
    what: 'Sign-in events kept by Supabase (time, IP address, browser)',
    why: 'Security of the sign-in service, and your list of recent sign-ins in Account settings → Security (shown only to you).',
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
    name: 'Other players and visitors',
    role: 'Can see your profile, as your privacy settings allow',
    data: 'Always your username and avatar. With a Public profile (or Friends only, for your friends) also your bio, country, record, ratings, last games and when you joined. In online games, your seat, moves and result (to its players, and to spectators of public games). Friends see when you’re online. A settled rating is on the leaderboard.',
    location: 'Anywhere Bronze is played',
  },
]
