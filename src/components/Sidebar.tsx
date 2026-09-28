import { useEffect, useId, useRef, useState, type ComponentType, type FocusEvent, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router'
import { formatRecord } from '../data/achievements'
import { PATHS, type MenuAction } from '../data/navigation'
import { useAuth } from '../hooks/useAuth'
import { useLogOut } from '../hooks/useLogOut'
import { useOpenAuth } from '../hooks/useOpenAuth'
import { IconChevronDown, IconCog, IconLock, IconLogin, IconLogout, IconPlay, IconUserPlus, IconUsers, type IconProps } from './icons'
import { ACTION_ITEMS, BOARD_ITEM, CREDITS_ITEM, LEGAL_ITEM, PAGE_ITEMS } from './navItems'
import { ProfileAvatar, type LobbyProfile } from './ProfileChip'
import { Logo } from './theme/Logo'

interface SidebarProps {
  /** The signed-in player, or null for a guest. */
  profile: LobbyProfile | null
  /** Go to the play panel on the main menu. */
  onPlay: () => void
  onMenuAction: (action: MenuAction) => void
}

type TipHandlers = Record<'onMouseEnter' | 'onFocus', (event: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>) => void> &
  Record<'onMouseLeave' | 'onBlur', () => void>

/**
 * The lobby's left navigation, like chess.com's: wordmark, the PLAY button,
 * the pages, the dialogs, and at the bottom the account: Register and Log in
 * for guests, the profile chip (with its menu) and Log out when signed in.
 * 1024 px and up: 240 px wide with labels. 768–1023 px: a 72 px icon rail
 * whose labels show as tooltips. Hidden on phones (see MobileNav).
 */
export function Sidebar({ profile, onPlay, onMenuAction }: SidebarProps) {
  const auth = useAuth()
  const openAuth = useOpenAuth()
  const logOut = useLogOut()
  const [tip, setTip] = useState<{ label: string; top: number } | null>(null)
  const guest = !profile

  // Rail tooltips are drawn fixed beside the rail, so the scrolling nav can't clip them.
  const tipFor = (label: string): TipHandlers => {
    const show = (event: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
      const box = event.currentTarget.getBoundingClientRect()
      setTip({ label, top: box.top + box.height / 2 })
    }
    return { onMouseEnter: show, onFocus: show, onMouseLeave: () => setTip(null), onBlur: () => setTip(null) }
  }

  return (
    <aside
      aria-label="Lobby"
      className="plate iron fixed inset-y-0 left-0 z-30 hidden w-[72px] flex-col rounded-none border-y-0 border-l-0 pt-[env(safe-area-inset-top)] md:flex lg:w-60"
    >
      {/* Logo: the wordmark, or the cog on the icon rail */}
      <div className="flex flex-col items-center px-2 pt-5 pb-4 lg:items-start lg:px-5">
        <Link to={PATHS.mainMenu} className="block rounded" aria-label="Bronze: main menu" {...tipFor('Main Menu')}>
          <Logo variant="icon" className="size-10 lg:hidden" />
          <Logo variant="wordmark" className="w-[190px] max-lg:hidden" />
        </Link>
        <p className="mt-2 font-display text-[0.7rem] font-semibold tracking-[0.2em] whitespace-nowrap text-parchment-300 uppercase max-lg:hidden">
          Build · Connect · Industrialize
        </p>
      </div>

      {/* PLAY */}
      <div className="px-2 lg:px-4">
        <button type="button" onClick={onPlay} className="btn-brass w-full text-xl max-lg:min-h-12 max-lg:px-0 max-lg:[border-image-width:12px]" {...tipFor('Play')}>
          <IconPlay className="size-5 shrink-0" />
          <span className="max-lg:sr-only">Play</span>
        </button>
      </div>

      {/* Pages, then the map board and dialogs */}
      <nav aria-label="Main" className="no-scrollbar mt-4 min-h-0 flex-1 overflow-y-auto px-2 pb-3 lg:px-3">
        <ul className="flex flex-col gap-0.5">
          {PAGE_ITEMS.map((item) => {
            const locked = guest && item.needsAccount
            return (
              <li key={item.path}>
                <SideLink to={item.path} label={item.label} Icon={item.Icon} locked={locked} tip={tipFor(locked ? `${item.label} (log in to use)` : item.label)} />
              </li>
            )
          })}
        </ul>
        <hr className="mx-2 my-3 border-bronze-500/25" />
        <ul className="flex flex-col gap-0.5">
          <li>
            <SideLink to={BOARD_ITEM.path} label={BOARD_ITEM.label} Icon={BOARD_ITEM.Icon} tip={tipFor(BOARD_ITEM.label)} />
          </li>
          {ACTION_ITEMS.map(({ action, label, Icon }) => (
            <li key={action}>
              <button type="button" onClick={() => onMenuAction(action)} className={itemClass(false)} {...tipFor(label)}>
                <ItemBody label={label} Icon={Icon} />
              </button>
            </li>
          ))}
          <li>
            <SideLink to={CREDITS_ITEM.path} label={CREDITS_ITEM.label} Icon={CREDITS_ITEM.Icon} tip={tipFor(CREDITS_ITEM.label)} />
          </li>
          <li>
            <LegalGroup tip={tipFor(LEGAL_ITEM.label)} />
          </li>
        </ul>
      </nav>

      {/* Account */}
      <div className="flex flex-col gap-1.5 border-t border-bronze-500/25 bg-soot-950/35 px-2 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:px-3">
        {profile ? (
          <>
            <ProfileMenu profile={profile} onSettings={() => onMenuAction('settings')} onLogOut={logOut} tip={tipFor(profile.name)} />
            <LogOutButton rail onClick={logOut} tip={tipFor('Log out')} />
          </>
        ) : auth.status === 'loading' ? (
          <div className="flex min-h-12 items-center gap-3 px-1.5 max-lg:justify-center lg:px-2" role="status" aria-label="Checking your account">
            <span className="size-10 animate-pulse rounded-full bg-soot-700" />
            <span className="h-3 w-24 animate-pulse rounded bg-soot-700 max-lg:hidden" />
          </div>
        ) : auth.status === 'error' || auth.status === 'needs-username' ? (
          <>
            {auth.status === 'error' && (
              <button type="button" onClick={() => void auth.retry()} className={itemClass(false)} {...tipFor('Retry loading your account')}>
                <ItemBody label="Retry account" Icon={IconUsers} />
              </button>
            )}
            <LogOutButton rail onClick={logOut} tip={tipFor('Log out')} />
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => openAuth('register')}
              className="btn-brass w-full text-base max-lg:min-h-12 max-lg:px-0 max-lg:[border-image-width:12px]"
              {...tipFor('Register')}
            >
              <IconUserPlus className="size-5 shrink-0" />
              <span className="max-lg:sr-only">Register</span>
            </button>
            <button type="button" onClick={() => openAuth('login')} className="btn btn-ghost min-h-11 w-full max-lg:px-0" {...tipFor('Log in')}>
              <IconLogin className="size-5 shrink-0" />
              <span className="max-lg:sr-only">Log in</span>
            </button>
          </>
        )}
      </div>

      {tip && (
        <span
          aria-hidden="true"
          className="plate pointer-events-none fixed left-[80px] z-50 -translate-y-1/2 rounded-md border-bronze-400/50 bg-soot-900/95 px-2.5 py-1.5 font-display text-sm font-bold tracking-[0.1em] whitespace-nowrap text-parchment-50 uppercase lg:hidden"
          style={{ top: tip.top }}
        >
          {tip.label}
        </span>
      )}
    </aside>
  )
}

/** Shared look of a sidebar row; the active one gets a lighter ground and a brass bar on the left edge. */
function itemClass(active: boolean) {
  return `group relative flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left font-display text-[0.95rem] font-bold tracking-[0.1em] uppercase transition-colors max-lg:justify-center max-lg:px-0 ${
    active ? 'bg-bronze-400/15 text-parchment-50' : 'text-parchment-300 hover:bg-soot-700/60 hover:text-parchment-50'
  }`
}

function ItemBody({ label, Icon, active = false, locked = false }: { label: string; Icon: ComponentType<IconProps>; active?: boolean; locked?: boolean }) {
  return (
    <>
      <span
        aria-hidden="true"
        className={`absolute inset-y-1.5 -left-2 w-1 rounded-r-full bg-linear-to-b from-brass-200 to-bronze-500 transition-opacity lg:-left-3 ${
          active ? 'opacity-100 shadow-[0_0_10px_rgb(240_215_138/0.55)]' : 'opacity-0'
        }`}
      />
      <span className="relative">
        <Icon className={`size-5 shrink-0 transition-colors ${active ? 'text-brass-300' : 'text-bronze-300/80 group-hover:text-ember-300'}`} />
        {locked && (
          <IconLock aria-hidden="true" strokeWidth={2.4} className="absolute -right-1.5 -bottom-1 size-3 rounded-sm bg-soot-900 text-brass-300 lg:hidden" />
        )}
      </span>
      <span className="max-lg:sr-only">
        {label}
        {locked && <span className="sr-only"> (log in to use)</span>}
      </span>
      {locked && <IconLock aria-hidden="true" className="ml-auto size-3.5 text-brass-300/80 max-lg:hidden" />}
    </>
  )
}

function SideLink({ to, label, Icon, locked = false, tip }: { to: string; label: string; Icon: ComponentType<IconProps>; locked?: boolean; tip: TipHandlers }) {
  return (
    <NavLink to={to} end className={({ isActive }) => itemClass(isActive)} {...tip}>
      {({ isActive }) => <ItemBody label={label} Icon={Icon} active={isActive} locked={locked} />}
    </NavLink>
  )
}

/**
 * "Legal": a group that opens to list the legal pages (open while you're on
 * one). On the icon rail it's a link to the legal index instead.
 */
function LegalGroup({ tip }: { tip: TipHandlers }) {
  const { pathname } = useLocation()
  const onLegalPage = LEGAL_ITEM.links.some((link) => link.path === pathname)
  const [open, setOpen] = useState(onLegalPage)
  const listId = useId()
  const expanded = open || onLegalPage
  return (
    <>
      <NavLink to={LEGAL_ITEM.path} end className={({ isActive }) => `${itemClass(isActive)} lg:hidden`} {...tip}>
        {({ isActive }) => <ItemBody label={LEGAL_ITEM.label} Icon={LEGAL_ITEM.Icon} active={isActive || onLegalPage} />}
      </NavLink>
      <button type="button" aria-expanded={expanded} aria-controls={listId} onClick={() => setOpen((v) => !v)} className={`${itemClass(false)} max-lg:hidden`}>
        <ItemBody label={LEGAL_ITEM.label} Icon={LEGAL_ITEM.Icon} />
        <IconChevronDown aria-hidden="true" className={`ml-auto size-4 text-parchment-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      <ul id={listId} hidden={!expanded} className="mt-0.5 ml-8 flex flex-col gap-0.5 border-l border-bronze-500/25 pl-2 max-lg:hidden">
        {LEGAL_ITEM.links.map((link) => (
          <li key={link.path}>
            <NavLink
              to={link.path}
              end
              className={({ isActive }) =>
                `flex min-h-9 items-center rounded-md px-2 text-sm font-semibold transition-colors ${
                  isActive ? 'bg-bronze-400/15 text-parchment-50' : 'text-parchment-300 hover:bg-soot-700/60 hover:text-parchment-50'
                }`
              }
            >
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </>
  )
}

/**
 * The signed-in player's chip: photo or colour disc, username and record.
 * Opens a small menu: Profile, Settings, Log out.
 */
function ProfileMenu({ profile, onSettings, onLogOut, tip }: { profile: LobbyProfile; onSettings: () => void; onLogOut: () => void; tip: TipHandlers }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    // Focus the first item, like a menu.
    rootRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const choose = (run: () => void) => {
    setOpen(false)
    // Focus back on the chip first, so a dialog opened from here returns focus to it.
    buttonRef.current?.focus()
    run()
  }

  // Up/down arrows move between the items.
  const onMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const items = [...(rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])]
    const index = items.indexOf(document.activeElement as HTMLElement)
    items[(index + (event.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus()
  }

  const itemRow =
    'flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left font-display text-[0.95rem] font-bold tracking-[0.1em] uppercase transition-colors focus-visible:outline-ember-400'

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`${profile.name}: ${formatRecord(profile)}. Account menu`}
        className={`group flex min-h-12 w-full items-center gap-3 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-soot-700/60 max-lg:justify-center lg:px-2 ${open ? 'bg-soot-700/60' : ''}`}
        {...tip}
      >
        <ProfileAvatar profile={profile} />
        <span className="flex min-w-0 flex-1 flex-col max-lg:hidden">
          <span className="truncate font-display text-base leading-tight font-bold tracking-[0.06em] text-parchment-50">{profile.name}</span>
          <span className="truncate text-xs text-parchment-400">{formatRecord(profile)}</span>
        </span>
        <IconChevronDown className={`size-4 shrink-0 text-parchment-400 transition-transform max-lg:hidden ${open ? '' : 'rotate-180'}`} />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          onKeyDown={onMenuKeyDown}
          className="plate rivets absolute bottom-full left-0 z-40 mb-2 w-full min-w-52 bg-soot-900/[0.97] p-2 max-lg:bottom-0 max-lg:left-full max-lg:mb-0 max-lg:ml-3"
        >
          <button type="button" role="menuitem" className={`${itemRow} text-parchment-200 hover:bg-bronze-500/15 hover:text-parchment-50`} onClick={() => choose(() => navigate(PATHS.profile))}>
            <IconUsers className="size-5 text-bronze-300" />
            Profile
          </button>
          <button type="button" role="menuitem" className={`${itemRow} text-parchment-200 hover:bg-bronze-500/15 hover:text-parchment-50`} onClick={() => choose(onSettings)}>
            <IconCog className="size-5 text-bronze-300" />
            Settings
          </button>
          <hr className="mx-2 my-1.5 border-bronze-500/20" />
          <button type="button" role="menuitem" className={`${itemRow} text-rust-300 hover:bg-rust-500/15`} onClick={() => choose(onLogOut)}>
            <IconLogout className="size-5" />
            Log out
          </button>
        </div>
      )}
    </div>
  )
}

/** Log out, in rust red. `rail`: icon only below 1024 px. */
export function LogOutButton({ onClick, tip, rail = false }: { onClick: () => void; tip?: TipHandlers; rail?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left font-display text-[0.95rem] font-bold tracking-[0.1em] text-rust-300 uppercase transition-colors hover:bg-rust-500/15 ${
        rail ? 'max-lg:justify-center max-lg:px-0' : ''
      }`}
      {...tip}
    >
      <IconLogout className="size-5 shrink-0" />
      <span className={rail ? 'max-lg:sr-only' : ''}>Log out</span>
    </button>
  )
}
