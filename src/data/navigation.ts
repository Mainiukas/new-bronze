/**
 * Lobby navigation: the pages in the sidebar (and the phone's tab bar), and
 * the actions that open a dialog. App.tsx maps each path to a page.
 */

export interface NavTab {
  readonly path: string
  /** Display label. The sidebar renders it uppercase. */
  readonly label: string
}

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
  /** Your account (signed in). */
  profile: '/profile',
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

/** The legal pages, in footer and sidebar order. */
export const LEGAL_LINKS: readonly NavTab[] = [
  { path: PATHS.privacy, label: 'Privacy Policy' },
  { path: PATHS.terms, label: 'Terms of Service' },
  { path: PATHS.refunds, label: 'Refund Policy' },
  { path: PATHS.cookies, label: 'Cookie Policy' },
  { path: PATHS.legal, label: 'Business details' },
  { path: PATHS.dataRequest, label: 'Data requests' },
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
  { path: PATHS.mainMenu, label: 'Main Menu' },
  { path: PATHS.tournaments, label: 'Tournaments' },
  { path: PATHS.locker, label: 'Locker' },
  { path: PATHS.shop, label: 'Shop' },
  { path: PATHS.achievements, label: 'Achievements' },
]

/** Dialogs the lobby can open from the sidebar or the phone's More sheet. */
export type MenuAction = 'how-to-play' | 'settings'

export const MENU_ACTIONS: readonly { readonly action: MenuAction; readonly label: string }[] = [
  { action: 'how-to-play', label: 'How to Play' },
  { action: 'settings', label: 'Settings' },
]
