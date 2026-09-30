import type { ComponentType } from 'react'
import { Link, NavLink, useNavigate } from 'react-router'
import { accountPath, PATHS, type MenuAction } from '../data/navigation'
import { useLogOut } from '../hooks/useLogOut'
import { useOpenAuth, type AuthMode } from '../hooks/useOpenAuth'
import { useT, type Messages } from '../i18n'
import { Dialog } from './Dialog'
import {
  IconBracket,
  IconClose,
  IconCrate,
  IconGlobe,
  IconLogin,
  IconMore,
  IconPlay,
  IconTopHat,
  IconTrophy,
  IconUserPlus,
  IconShield,
  IconUsers,
  type IconProps,
} from './icons'
import { ACTION_ITEMS, BOARD_ITEM, CREDITS_ITEM, LEGAL_ITEM } from './navItems'
import { ProfileAvatar, type LobbyProfile } from './ProfileChip'
import { LogOutButton } from './Sidebar'
import { Logo } from './theme/Logo'

/* Phones (below 768 px) get these instead of the sidebar. */

/** Top bar: wordmark, and your avatar (to your profile) or a "Log in" pill. */
export function MobileTopBar({ profile }: { profile: LobbyProfile | null }) {
  const t = useT()
  const openAuth = useOpenAuth()
  return (
    <header className="sticky top-0 z-30 border-b border-bronze-500/25 bg-soot-950/85 pt-[env(safe-area-inset-top)] shadow-[0_10px_30px_-14px_rgb(0_0_0/0.9)] backdrop-blur-md md:hidden">
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        <Link to={PATHS.mainMenu} className="block rounded" aria-label={t.brand.home}>
          <Logo variant="wordmark" className="w-[120px]" />
        </Link>
        {profile ? (
          <Link to={PATHS.profile} className="grid size-11 place-items-center rounded-full" aria-label={t.nav.yourProfile(profile.name, t.record(profile.wins, profile.matches))}>
            <ProfileAvatar profile={profile} className="size-9 text-base" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => openAuth('login')}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-brass-300/60 bg-linear-to-b from-soot-700 to-soot-850 px-4 font-display text-sm font-bold tracking-[0.14em] text-brass-200 uppercase shadow-[inset_0_1px_0_rgb(243_210_168/0.15)] hover:border-ember-400/70 hover:text-parchment-50"
          >
            <IconLogin className="size-4" />
            {t.common.logIn}
          </button>
        )}
      </div>
    </header>
  )
}

const TABS: { path: string; key: keyof Messages['nav']; Icon: ComponentType<IconProps> }[] = [
  { path: PATHS.mainMenu, key: 'play', Icon: IconPlay },
  { path: PATHS.online, key: 'online', Icon: IconGlobe },
  { path: PATHS.tournaments, key: 'tournaments', Icon: IconBracket },
  { path: PATHS.shop, key: 'shop', Icon: IconCrate },
]

const tabClass = (active: boolean) =>
  `relative flex min-h-14 w-full flex-col items-center justify-center gap-0.5 font-display text-[0.7rem] font-bold tracking-[0.08em] uppercase transition-colors ${
    active ? 'text-parchment-50' : 'text-parchment-300 hover:text-parchment-100'
  }`

function ActiveBar({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute inset-x-4 top-0 h-[3px] rounded-b-full bg-linear-to-r from-bronze-500 via-brass-300 to-bronze-500 transition-opacity ${
        active ? 'opacity-100 shadow-[0_0_10px_rgb(240_215_138/0.6)]' : 'opacity-0'
      }`}
    />
  )
}

/** Bottom tab bar: Play, Tournaments, Locker, Shop, and More (the rest, in a sheet). */
export function MobileTabBar({ moreOpen, onMore }: { moreOpen: boolean; onMore: () => void }) {
  const t = useT()
  return (
    <nav
      aria-label={t.nav.main}
      className="plate iron fixed inset-x-0 bottom-0 z-30 rounded-none border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-5">
        {TABS.map(({ path, key, Icon }) => (
          <li key={path}>
            <NavLink to={path} end className={({ isActive }) => tabClass(isActive)}>
              {({ isActive }) => (
                <>
                  <ActiveBar active={isActive} />
                  <Icon className={`size-6 ${isActive ? 'text-brass-300' : ''}`} />
                  {t.nav[key] as string}
                </>
              )}
            </NavLink>
          </li>
        ))}
        <li>
          <button type="button" onClick={onMore} aria-haspopup="dialog" aria-expanded={moreOpen} className={tabClass(moreOpen)}>
            <ActiveBar active={moreOpen} />
            <IconMore className={`size-6 ${moreOpen ? 'text-brass-300' : ''}`} />
            {t.nav.more}
          </button>
        </li>
      </ul>
    </nav>
  )
}

interface MoreSheetProps {
  open: boolean
  onClose: () => void
  onMenuAction: (action: MenuAction) => void
  /** The signed-in player, or null for a guest. */
  profile: LobbyProfile | null
}

const rowClass =
  'group flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-left font-display text-base font-bold tracking-[0.1em] text-parchment-200 uppercase transition-colors hover:bg-soot-700/60 hover:text-parchment-50'

/**
 * The phone's More sheet: Achievements, Map board, the dialogs, and the
 * account (Log in and Register, or Profile and Log out). Escape or the
 * backdrop closes it.
 */
export function MoreSheet({ open, onClose, onMenuAction, profile }: MoreSheetProps) {
  const t = useT()
  const navigate = useNavigate()
  const openAuth = useOpenAuth()
  const logOut = useLogOut()

  const go = (path: string) => {
    onClose()
    navigate(path)
  }
  // Let the sheet close (and hand focus back to More) before a dialog or screen opens,
  // so that one returns focus to More when it closes in turn.
  const after = (run: () => void) => {
    onClose()
    window.setTimeout(run)
  }

  const links: { path: string; label: string; Icon: ComponentType<IconProps> }[] = [
    { path: PATHS.locker, label: t.nav.locker, Icon: IconTopHat },
    { path: PATHS.achievements, label: t.nav.achievements, Icon: IconTrophy },
    { path: BOARD_ITEM.path, label: t.nav.board, Icon: BOARD_ITEM.Icon },
    ...(profile
      ? [
          { path: PATHS.profile, label: t.nav.profile, Icon: IconUsers },
          { path: accountPath('profile'), label: t.accountPage.menu, Icon: IconShield },
        ]
      : []),
    { path: CREDITS_ITEM.path, label: t.nav.credits, Icon: CREDITS_ITEM.Icon },
    { path: LEGAL_ITEM.path, label: t.nav.legal, Icon: LEGAL_ITEM.Icon },
  ]
  const accountRows: { mode: AuthMode; label: string; Icon: ComponentType<IconProps> }[] = [
    { mode: 'login', label: t.common.logIn, Icon: IconLogin },
    { mode: 'register', label: t.common.register, Icon: IconUserPlus },
  ]

  return (
    <Dialog open={open} onClose={onClose} labelledBy="more-title" variant="sheet-bottom">
      <div className="plate iron rounded-b-none border-x-0 border-b-0 px-3 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <span aria-hidden="true" className="mx-auto mb-1 block h-1 w-10 rounded-full bg-bronze-500/40" />
        <header className="flex items-center gap-3 px-2 pb-2">
          <h2 id="more-title" className="flex-1 font-display text-xl font-extrabold tracking-[0.1em] text-parchment-50 uppercase">
            {t.nav.more}
          </h2>
          <button type="button" onClick={onClose} className="icon-btn size-11 text-base" aria-label={t.nav.closeMore}>
            <IconClose />
          </button>
        </header>
        <ul className="flex flex-col gap-0.5">
          {links.map(({ path, label, Icon }) => (
            <li key={path}>
              <button type="button" className={rowClass} onClick={() => go(path)}>
                <Icon className="size-5 shrink-0 text-bronze-300/80 group-hover:text-ember-300" />
                {label}
              </button>
            </li>
          ))}
          {ACTION_ITEMS.map(({ action, key, Icon }) => (
            <li key={action}>
              <button type="button" className={rowClass} onClick={() => after(() => onMenuAction(action))}>
                <Icon className="size-5 shrink-0 text-bronze-300/80 group-hover:text-ember-300" />
                {t.nav[key]}
              </button>
            </li>
          ))}
        </ul>
        <hr className="mx-2 my-2 border-bronze-500/25" />
        {profile ? (
          <LogOutButton onClick={() => after(() => void logOut())} />
        ) : (
          <ul className="flex flex-col gap-0.5">
            {accountRows.map(({ mode, label, Icon }) => (
              <li key={mode}>
                <button type="button" className={`${rowClass} text-brass-200`} onClick={() => after(() => openAuth(mode))}>
                  <Icon className="size-5 shrink-0 text-brass-300" />
                  {label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  )
}
