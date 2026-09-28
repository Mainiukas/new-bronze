import { lazy, Suspense, useEffect, useState } from 'react'
import { HashRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { createLazyBackend } from './auth/lazyBackend'
import { CookieBanner } from './components/legal/CookieBanner'
import { SiteFooter } from './components/legal/SiteFooter'
import type { MatchSetup } from './components/MatchSetupPanel'
import { MobileTabBar, MobileTopBar, MoreSheet } from './components/MobileNav'
import type { LobbyProfile } from './components/ProfileChip'
import { SceneBackground } from './components/SceneBackground'
import { Sidebar } from './components/Sidebar'
import { backgroundForPage } from './components/theme/backgrounds'
import { PageBackground } from './components/theme/PageBackground'
import { markFirstPaint, whenFirstPaint } from './components/theme/firstPaint'
import { hideSplash } from './components/theme/splash'
import { ToastProvider } from './components/ToastProvider'
import { DEFAULT_GAME_MODE_ID, getGameMode, isGameModeId } from './data/gameModes'
import { DEFAULT_MAP_ID, getMap, isMapId } from './data/maps'
import { DEFAULT_SETUP, parseSavedSetup } from './data/matchSetup'
import { isAuthPath, PATHS, type MenuAction } from './data/navigation'
import { ANIMATION_SCALE, DEFAULT_SETTINGS, parseSettings } from './data/settings'
import { createGame, parseSavedGame, readSavedGame } from './game/engine'
import type { GameState } from './game/types'
import { useAuth } from './hooks/useAuth'
import type { AuthLocationState } from './hooks/useOpenAuth'
import { usePersistentState } from './hooks/usePersistentState'
import { usePlayerStats } from './hooks/usePlayerStats'
import { useToast } from './hooks/useToast'
import { setVolumes } from './lib/sound'
import { randomSeed } from './lib/random'
import { readStorage, removeStorage, STORAGE_KEYS } from './lib/storage'
import { Achievements } from './pages/Achievements'
import { Locker } from './pages/Locker'
import { MainMenu, type PlayFocusState, type SavedMatchSummary } from './pages/MainMenu'
import { NotFound } from './pages/NotFound'
import { Profile } from './pages/Profile'
import { Shop } from './pages/Shop'
import { Tournaments } from './pages/Tournaments'

// Loaded when first needed, so the first page has less to download: the match screen and the map board,
// the account screens, the Rules and Settings dialogs, and the legal pages. The likely next ones are also
// fetched once the first page has loaded and the browser is idle (main.tsx).
const Game = lazy(() => import('./pages/Game').then((module) => ({ default: module.Game })))
const MapBoard = lazy(() => import('./pages/MapBoard').then((module) => ({ default: module.MapBoard })))
const AuthScreen = lazy(() => import('./pages/AuthScreen').then((module) => ({ default: module.AuthScreen })))
const SettingsModal = lazy(() => import('./components/SettingsModal').then((module) => ({ default: module.SettingsModal })))
const HowToPlayModal = lazy(() => import('./components/InfoModals').then((module) => ({ default: module.HowToPlayModal })))
const PrivacyPolicy = lazy(() => import('./pages/legal/PrivacyPolicy').then((module) => ({ default: module.PrivacyPolicy })))
const TermsOfService = lazy(() => import('./pages/legal/TermsOfService').then((module) => ({ default: module.TermsOfService })))
const RefundPolicy = lazy(() => import('./pages/legal/RefundPolicy').then((module) => ({ default: module.RefundPolicy })))
const CookiePolicy = lazy(() => import('./pages/legal/CookiePolicy').then((module) => ({ default: module.CookiePolicy })))
const LegalNotice = lazy(() => import('./pages/legal/LegalNotice').then((module) => ({ default: module.LegalNotice })))
const DataRequest = lazy(() => import('./pages/legal/DataRequest').then((module) => ({ default: module.DataRequest })))
const Credits = lazy(() => import('./pages/legal/Credits').then((module) => ({ default: module.Credits })))
const Unsubscribe = lazy(() => import('./pages/legal/Unsubscribe').then((module) => ({ default: module.Unsubscribe })))

/** Which dialog is open. Only one at a time. */
type Overlay = MenuAction

/**
 * Accounts: Supabase when VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set (SETUP.md), else guests only.
 * Its code loads once the first page is on screen (the account area shows "checking" until then).
 */
const accountsConfigured = !!(import.meta.env.VITE_SUPABASE_URL ?? '').trim() && !!(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()
const accountBackend = accountsConfigured
  ? createLazyBackend(() =>
      whenFirstPaint()
        .then(() => import('./auth/supabaseBackend'))
        .then((module) => module.createSupabaseBackend()),
    )
  : null

export default function App() {
  // Hash-based URLs (e.g. #/shop) work on any static host without
  // server-side rewrites, and inside embedded or file:// pages.
  return (
    <HashRouter>
      <ToastProvider>
        <AuthProvider backend={accountBackend}>
          <AppShell />
        </AuthProvider>
      </ToastProvider>
    </HashRouter>
  )
}

/** App-wide state: lobby selection, match setup, settings, the saved match, stats, open dialog. */
function AppShell() {
  const notify = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const auth = useAuth()
  const [overlay, setOverlay] = useState<Overlay | null>(null)
  const closeOverlay = () => setOverlay(null)
  // A dialog's code loads the first time it opens; after that it stays, for its close animation.
  const [opened, setOpened] = useState<readonly Overlay[]>([])
  if (overlay && !opened.includes(overlay)) setOpened([...opened, overlay])

  // Saved choices. Stored values are validated, so a removed mode or map
  // falls back to the default instead of breaking the menu.
  const [modeId, setModeId] = usePersistentState(STORAGE_KEYS.gameMode, DEFAULT_GAME_MODE_ID, (raw) =>
    isGameModeId(raw) ? raw : undefined,
  )
  const [mapId, setMapId] = usePersistentState(STORAGE_KEYS.map, DEFAULT_MAP_ID, (raw) =>
    isMapId(raw) ? raw : undefined,
  )
  // Seats, names, colours and AI levels: edited on the Play page, and seat 1 is your profile.
  const [setup, setSetup] = usePersistentState(STORAGE_KEYS.setup, DEFAULT_SETUP, parseSavedSetup)
  const [settings, setSettings] = usePersistentState(STORAGE_KEYS.settings, DEFAULT_SETTINGS, parseSettings)
  // A save from an older version can't be resumed: say so (once) instead of silently dropping it.
  const [outdatedSave, setOutdatedSave] = useState(() => readSavedGame(readStorage(STORAGE_KEYS.match)).status === 'outdated')
  // Saved after every action (and every state change), so Continue resumes exactly where play stopped.
  const [game, setGame] = usePersistentState<GameState | null>(STORAGE_KEYS.match, null, parseSavedGame)
  // Your record: the account's when signed in, this device's as a guest.
  const { stats, record } = usePlayerStats()

  useEffect(
    () => setVolumes(settings.soundOn ? settings.masterVolume : 0, settings.soundOn ? settings.musicVolume : 0),
    [settings.soundOn, settings.masterVolume, settings.musicVolume],
  )
  // The app is up: fade out the loading splash (or keep it from showing), and let the paintings load.
  useEffect(() => {
    hideSplash()
    markFirstPaint()
  }, [])
  // Board and banner animations read this: 0 turns them off.
  useEffect(() => {
    document.documentElement.style.setProperty('--anim-scale', String(ANIMATION_SCALE[settings.animationSpeed]))
    document.documentElement.dataset.animations = settings.animationSpeed === 'off' ? 'off' : 'on'
  }, [settings.animationSpeed])

  // Changes with every new match, so the match screen starts fresh (banners, hand-offs, choices).
  const [matchKey, setMatchKey] = useState(0)
  const startMatch = (matchSetup: MatchSetup) => {
    setGame(createGame(matchSetup))
    setMatchKey((k) => k + 1)
    setOutdatedSave(false)
    setOverlay(null)
    navigate(PATHS.play)
  }

  const leaveMatch = () => {
    // A finished match has nothing left to resume.
    if (game?.status === 'finished') setGame(null)
    navigate(PATHS.mainMenu)
  }

  /** The same seats (names, colours, AI levels) on the same mode and map, with a new seed. */
  const rematch = () => {
    if (!game) return
    const seats = game.players.map((p) => ({ name: p.name, isAI: p.isAI, color: p.color, ...(p.aiLevel ? { aiLevel: p.aiLevel } : {}) }))
    startMatch({ modeId: game.modeId, mapId: game.mapId, seats, seed: randomSeed() })
  }

  const savedMatch: SavedMatchSummary | null =
    game && game.status === 'playing'
      ? {
          mode: getGameMode(game.modeId).name,
          map: getMap(game.mapId).name,
          round: game.round,
          totalRounds: game.totalRounds,
          era: game.era,
          players: game.players.map((p) => ({ name: p.name, color: p.color, isAI: p.isAI })),
        }
      : null

  // Signed in: your username and photo, in seat 1's colour, with your account's record.
  const profile: LobbyProfile | null =
    auth.signedIn && auth.profile
      ? { name: auth.profile.username, color: setup.seats[0].color, avatarUrl: auth.profile.avatarUrl, wins: stats.wins, matches: stats.matches }
      : null

  // The account screens draw over the page they were opened from (or the lobby, when visited directly).
  const onAuthRoute = isAuthPath(location.pathname)
  const background = (location.state as AuthLocationState | null)?.background
  const pageLocation = onAuthRoute ? (background ?? PATHS.mainMenu) : location

  return (
    <div className="relative flex min-h-dvh flex-col">
      <SkipLink />
      {/* First in the tab order, drawn at the bottom: the cookie choice (non-blocking). */}
      <CookieBanner />
      <Routes location={pageLocation}>
        <Route
          path={PATHS.play}
          element={
            game ? (
              <>
                <SceneBackground />
                <Suspense fallback={null}>
                  <Game
                    key={matchKey}
                    game={game}
                    onGameChange={setGame}
                    onMatchFinished={record}
                    onLeave={leaveMatch}
                    onRematch={rematch}
                    settings={settings}
                    onOpenRules={() => setOverlay('how-to-play')}
                    onOpenSettings={() => setOverlay('settings')}
                    overlayOpen={overlay !== null}
                  />
                </Suspense>
              </>
            ) : (
              <Navigate to={PATHS.mainMenu} replace />
            )
          }
        />
        <Route element={<LobbyLayout profile={profile} onMenuAction={setOverlay} covered={onAuthRoute} />}>
          <Route
            path={PATHS.mainMenu}
            element={
              <MainMenu
                modeId={modeId}
                onModeChange={setModeId}
                mapId={mapId}
                onMapChange={setMapId}
                setup={setup}
                onSetupChange={setSetup}
                onStart={startMatch}
                savedMatch={savedMatch}
                onContinue={() => navigate(PATHS.play)}
                onAbandon={() => {
                  setGame(null)
                  notify('Match abandoned')
                }}
                outdatedSave={outdatedSave && !game}
                onDiscardOutdated={() => {
                  removeStorage(STORAGE_KEYS.match)
                  setOutdatedSave(false)
                }}
                stats={stats}
              />
            }
          />
          <Route path={PATHS.locker} element={<Locker />} />
          <Route path={PATHS.shop} element={<Shop />} />
          <Route path={PATHS.achievements} element={<Achievements stats={stats} />} />
          <Route path={PATHS.tournaments} element={<Tournaments />} />
          <Route
            path={PATHS.board}
            element={
              <Suspense fallback={null}>
                <MapBoard />
              </Suspense>
            }
          />
          <Route path={PATHS.profile} element={<Profile profile={profile} stats={stats} onOpenSettings={() => setOverlay('settings')} />} />
          <Route path={PATHS.terms} element={<TermsOfService />} />
          <Route path={PATHS.privacy} element={<PrivacyPolicy />} />
          <Route path={PATHS.refunds} element={<RefundPolicy />} />
          <Route path={PATHS.cookies} element={<CookiePolicy />} />
          <Route path={PATHS.legal} element={<LegalNotice />} />
          <Route path={PATHS.dataRequest} element={<DataRequest />} />
          <Route path={PATHS.credits} element={<Credits />} />
          <Route path={PATHS.unsubscribe} element={<Unsubscribe />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* A signed-in player without a username gets that step wherever they are. */}
      {(onAuthRoute || auth.status === 'needs-username') && (
        <Suspense fallback={null}>
          <AuthScreen />
        </Suspense>
      )}

      {opened.includes('settings') && (
        <Suspense fallback={null}>
          <SettingsModal open={overlay === 'settings'} onClose={closeOverlay} settings={settings} onChange={setSettings} />
        </Suspense>
      )}
      {opened.includes('how-to-play') && (
        <Suspense fallback={null}>
          <HowToPlayModal open={overlay === 'how-to-play'} onClose={closeOverlay} />
        </Suspense>
      )}
    </div>
  )
}

/**
 * The lobby around every page except the match: the page's painting, the
 * sidebar (an icon rail on tablets), and on phones a top bar, a bottom tab
 * bar and the More sheet. `covered`: the account screens are drawn over it.
 */
function LobbyLayout({ profile, onMenuAction, covered }: { profile: LobbyProfile | null; onMenuAction: (action: MenuAction) => void; covered: boolean }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const background = backgroundForPage(pathname)
  const [moreOpen, setMoreOpen] = useState(false)

  // A new page starts at its top (the account screens draw over the page, so they don't count).
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  // PLAY: the play panel on the main menu, brought into view and focused.
  const openPlay = () => {
    const state: PlayFocusState = { focusPlay: Date.now() }
    navigate(PATHS.mainMenu, { state, replace: pathname === PATHS.mainMenu })
  }

  return (
    <>
      {/* The map board keeps its plain ground. */}
      {background && <PageBackground name={background} priority={covered ? 'low' : 'high'} />}
      <Sidebar profile={profile} onPlay={openPlay} onMenuAction={onMenuAction} />
      <MobileTopBar profile={profile} />
      <main
        id="main-content"
        tabIndex={-1}
        className="flex flex-1 flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom)+var(--cookie-banner-height,0px))] outline-none md:pb-[var(--cookie-banner-height,0px)] md:pl-[72px] lg:pl-60"
      >
        <div className="flex-1">
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </div>
        <SiteFooter />
      </main>
      <MobileTabBar moreOpen={moreOpen} onMore={() => setMoreOpen(true)} />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} onMenuAction={onMenuAction} profile={profile} />
    </>
  )
}

/** "Skip to content": the first stop for keyboard users, hidden until focused. Jumps to the page (or the match). */
function SkipLink() {
  return (
    <a
      href="#main-content"
      onClick={(event) => {
        event.preventDefault()
        const target = document.getElementById('main-content') ?? document.querySelector<HTMLElement>('main')
        target?.focus()
        target?.scrollIntoView({ block: 'start' })
      }}
      className="btn btn-primary fixed top-2 left-2 z-[70] -translate-y-24 focus:translate-y-0 motion-reduce:transition-none"
    >
      Skip to content
    </a>
  )
}
