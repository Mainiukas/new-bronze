import type { ComponentType } from 'react'
import { LEGAL_LINKS, MENU_ACTIONS, NAV_TABS, PATHS, type MenuAction } from '../data/navigation'
import {
  IconBook,
  IconBracket,
  IconCog,
  IconCrate,
  IconGlobe,
  IconHome,
  IconMap,
  IconScale,
  IconStar,
  IconTopHat,
  IconTrophy,
  type IconProps,
} from './icons'

type Icon = ComponentType<IconProps>

const PAGE_ICONS: Record<string, Icon> = {
  [PATHS.mainMenu]: IconHome,
  [PATHS.online]: IconGlobe,
  [PATHS.tournaments]: IconBracket,
  [PATHS.locker]: IconTopHat,
  [PATHS.shop]: IconCrate,
  [PATHS.achievements]: IconTrophy,
}

const ACTION_ICONS: Record<MenuAction, Icon> = {
  'how-to-play': IconBook,
  settings: IconCog,
}

/** Pages that need an account: guests see a lock on them. */
const ACCOUNT_PAGES: string[] = [PATHS.tournaments, PATHS.locker, PATHS.shop]

/** Sidebar pages, with their icons. */
export const PAGE_ITEMS = NAV_TABS.map((tab) => ({ ...tab, Icon: PAGE_ICONS[tab.path], needsAccount: ACCOUNT_PAGES.includes(tab.path) }))

/** The map board: a page, listed with the dialogs below the divider. */
export const BOARD_ITEM = { path: PATHS.board, key: 'board', Icon: IconMap as Icon } as const

/** Dialogs, with their icons. */
export const ACTION_ITEMS = MENU_ACTIONS.map((item) => ({ ...item, Icon: ACTION_ICONS[item.action] }))

/** Credits: a page, below the dialogs. */
export const CREDITS_ITEM = { path: PATHS.credits, key: 'credits', Icon: IconStar as Icon } as const

/** The "Legal" group: its pages, and the icon for the group (and for the rail, where it opens the legal index). */
export const LEGAL_ITEM = { path: PATHS.legal, key: 'legal', Icon: IconScale as Icon, links: LEGAL_LINKS } as const
