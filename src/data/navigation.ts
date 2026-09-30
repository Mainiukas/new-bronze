/**
 * Lobby navigation: the pages in the sidebar (and the phone's tab bar), and
 * the actions that open a dialog. App.tsx maps each path to a page.
 */

export interface NavTab {
  readonly path: string
  /** Its name in the words catalogue (t.nav[key], src/i18n). */
  readonly key: NavKey
  /** English label (the catalogue has every language). */
  readonly label: string
}

/** Pages and dialogs named in the navigation (keys of t.nav). */
export type NavKey =
  | 'mainMenu'
  | 'tournaments'
  | 'locker'
  | 'shop'
  | 'achievements'
  | 'privacy'
  | 'terms'
  | 'refunds'
  | 'cookies'
  | 'legalNotice'
  | 'dataRequest'
  | 'howToPlay'
  | 'settings'

export const PATHS = {
  mainMenu: '/',
  locker: '/locker',
  shop: '/shop',
  achievements: '/achievements',
  tournaments: '/tournaments',
  /** The match screen (not in the sidebar: the lobby is hidden during a match). */
  play: '/play',
  /** The illustrated map board and its calibration editor. */
  board: '/board',
  /** Your profile: goes to /u/<your username> (signed in). */
  profile: '/profile',
  /** A player's public profile: /u/<username>. */
  publicProfile: '/u/:username',
  /** The first three welcome slides again (Settings → Account → Replay welcome). */
  welcome: '/welcome',
  /** Account settings: Profile, Security, Privacy, Notifications, Data (?tab=…). */
  account: '/settings/account',
  terms: '/terms',
  privacy: '/privacy',
  refunds: '/refunds',
  cookies: '/cookies',
  /** Business details (who runs Bronze), with links to every legal page. */
  legal: '/legal',
  /** Data requests for people who can't log in. */
  dataRequest: '/data-request',
  credits: '/credits',
  /** One-click unsubscribe from non-essential emails (?token=…&list=…). */
  unsubscribe: '/unsubscribe',
} as const

/** A player's profile page. */
export const profilePath = (username: string) => `/u/${encodeURIComponent(username)}`

export const ACCOUNT_TABS = ['profile', 'security', 'privacy', 'notifications', 'data'] as const
export type AccountTab = (typeof ACCOUNT_TABS)[number]

/** The account settings, on a tab. */
export const accountPath = (tab: AccountTab = 'profile') => `${PATHS.account}?tab=${tab}`

/** The legal pages, in footer and sidebar order. */
export const LEGAL_LINKS: readonly NavTab[] = [
  { path: PATHS.privacy, key: 'privacy', label: 'Privacy Policy' },
  { path: PATHS.terms, key: 'terms', label: 'Terms of Service' },
  { path: PATHS.refunds, key: 'refunds', label: 'Refund Policy' },
  { path: PATHS.cookies, key: 'cookies', label: 'Cookie Policy' },
  { path: PATHS.legal, key: 'legalNotice', label: 'Business details' },
  { path: PATHS.dataRequest, key: 'dataRequest', label: 'Data requests' },
]

/** The account screens, drawn over the page they were opened from. */
export const AUTH_PATHS = {
  /** Register / Log in (?mode=register|login). */
  forms: '/auth',
  forgot: '/auth/forgot',
  /** Where the password-reset email's link lands. */
  reset: '/auth/reset',
  /** Where Google and the confirmation email send people back to. */
  callback: '/auth/callback',
  /** First Google sign-in: choose a username. */
  username: '/auth/username',
} as const

export const isAuthPath = (pathname: string) => (Object.values(AUTH_PATHS) as string[]).includes(pathname)

/** Pages, in sidebar order. */
export const NAV_TABS: readonly NavTab[] = [
  { path: PATHS.mainMenu, key: 'mainMenu', label: 'Main Menu' },
  { path: PATHS.tournaments, key: 'tournaments', label: 'Tournaments' },
  { path: PATHS.locker, key: 'locker', label: 'Locker' },
  { path: PATHS.shop, key: 'shop', label: 'Shop' },
  { path: PATHS.achievements, key: 'achievements', label: 'Achievements' },
]

/** Dialogs the lobby can open from the sidebar or the phone's More sheet. */
export type MenuAction = 'how-to-play' | 'settings'

export const MENU_ACTIONS: readonly { readonly action: MenuAction; readonly key: NavKey; readonly label: string }[] = [
  { action: 'how-to-play', key: 'howToPlay', label: 'How to Play' },
  { action: 'settings', key: 'settings', label: 'Settings' },
]
