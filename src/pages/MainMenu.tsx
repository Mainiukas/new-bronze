import { useEffect, useRef, type ComponentType, type Dispatch, type SetStateAction } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { PLAYER_STYLE } from '../components/game/glyphs'
import { IconComputer, IconGlobe, IconLock, IconPlay, IconUsers, type IconProps } from '../components/icons'
import { FriendsPanel } from '../components/FriendsPanel'
import { AchievementsCard, TournamentsCard } from '../components/LobbyCards'
import { MatchSetupPanel, type MatchSetup } from '../components/MatchSetupPanel'
import { ModeCard } from '../components/ModeCard'
import type { PlayerStats } from '../data/achievements'
import type { Era } from '../data/board'
import { GAME_MODES, type GameModeId } from '../data/gameModes'
import type { MapId } from '../data/maps'
import { accountPath } from '../data/navigation'
import { opponentsOf, seatCount, withOpponents, type Opponents, type SavedSetup } from '../data/matchSetup'
import type { PlayerColor } from '../game/types'
import { useAccountAccess } from '../hooks/useAccountAccess'
import { useAuth } from '../hooks/useAuth'
import { useOpenAuth } from '../hooks/useOpenAuth'
import { displayName, useT, type Messages } from '../i18n'

/** What the Continue banner shows about the match in progress. */
export interface SavedMatchSummary {
  modeId: GameModeId
  /** The map's name (a proper name: the same in every language). */
  map: string
  round: number
  totalRounds: number
  era: Era | null
  players: { name: string; color: PlayerColor; isAI: boolean }[]
}

/** Location state that asks this page to bring the play panel into view (the sidebar's PLAY). */
export interface PlayFocusState {
  focusPlay: number
}

interface MainMenuProps {
  modeId: GameModeId
  onModeChange: (id: GameModeId) => void
  mapId: MapId
  onMapChange: (id: MapId) => void
  setup: SavedSetup
  onSetupChange: Dispatch<SetStateAction<SavedSetup>>
  onStart: (setup: MatchSetup) => void
  /** A match in progress that can be resumed, if any. */
  savedMatch: SavedMatchSummary | null
  onContinue: () => void
  onAbandon: () => void
  /** A saved match from an older version of the game, which can't be resumed. */
  outdatedSave: boolean
  onDiscardOutdated: () => void
  stats: PlayerStats
}

/**
 * The lobby's Play page, like chess.com's and colonist.io's home screens:
 * the match in progress, quick-play mode cards, opponents and the match
 * setup with START MATCH in the centre; friends, tournaments and
 * achievements in a social column on the right (below, on smaller screens).
 * Selection state is owned by App so it survives page switches.
 */
export function MainMenu({
  modeId,
  onModeChange,
  mapId,
  onMapChange,
  setup,
  onSetupChange,
  onStart,
  savedMatch,
  onContinue,
  onAbandon,
  outdatedSave,
  onDiscardOutdated,
  stats,
}: MainMenuProps) {
  const t = useT()
  const titleRef = useRef<HTMLHeadingElement>(null)
  const location = useLocation()
  const focusPlay = (location.state as PlayFocusState | null)?.focusPlay

  // PLAY in the sidebar: back to the top, with focus on the play panel's heading.
  useEffect(() => {
    if (!focusPlay) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
    titleRef.current?.focus({ preventScroll: true })
  }, [focusPlay])

  const count = seatCount(setup, mapId)

  return (
    <div className="grid min-h-full grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_20rem]">
      {/* Centre: play */}
      <section aria-labelledby="play-title" className="min-w-0 px-4 pt-5 pb-8 sm:px-6 lg:px-8 lg:pt-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          {savedMatch && <ContinueBanner match={savedMatch} onContinue={onContinue} onAbandon={onAbandon} />}

          {outdatedSave && (
            <div role="status" className="plate rivets iron flex flex-col gap-3 border-rust-400/50 px-5 py-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="eyebrow text-rust-300">{t.lobby.outdatedTitle}</p>
                <p className="mt-0.5 text-sm text-parchment-200">{t.lobby.outdatedBody}</p>
              </div>
              <button type="button" className="btn btn-ghost px-5" onClick={onDiscardOutdated}>
                {t.lobby.discard}
              </button>
            </div>
          )}

          <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <h1
              id="play-title"
              ref={titleRef}
              tabIndex={-1}
              className="page-title flex items-center gap-3 rounded text-4xl sm:text-5xl"
            >
              <IconPlay aria-hidden="true" className="size-8 text-brass-300 sm:size-9" />
              {t.nav.play}
            </h1>
            <dl className="flex flex-wrap gap-2">
              <StatPill label={t.stats.wins} value={stats.wins} />
              <StatPill label={t.stats.bestScore} value={`${stats.bestScore}★`} />
              <StatPill label={t.stats.matches} value={stats.matches} />
            </dl>
          </header>

          {/* Mode cards: side by side when there's room, stacked otherwise */}
          <fieldset className="@container">
            <legend className="sr-only">{t.lobby.gameMode}</legend>
            <div className="grid gap-3 @2xl:grid-cols-3 @2xl:gap-4">
              {GAME_MODES.map((gameMode, index) => (
                <ModeCard
                  key={gameMode.id}
                  mode={gameMode}
                  index={index}
                  selected={gameMode.id === modeId}
                  players={count}
                  onSelect={() => onModeChange(gameMode.id)}
                />
              ))}
            </div>
          </fieldset>

          <OpponentsControl
            value={opponentsOf(setup.seats, count)}
            onChange={(opponents) => onSetupChange((prev) => ({ ...prev, seats: withOpponents(prev.seats, count, opponents) }))}
          />

          <MatchSetupPanel
            modeId={modeId}
            mapId={mapId}
            onMapChange={onMapChange}
            setup={setup}
            onSetupChange={onSetupChange}
            replacesMatch={savedMatch !== null}
            onStart={onStart}
          />
        </div>
      </section>

      {/* Right: social column (full height beside the centre on desktop, stacked below it otherwise) */}
      <aside aria-label={t.lobby.social} className="relative min-w-0 lg:sticky lg:top-0 lg:h-dvh">
        <div aria-hidden="true" className="plate iron absolute inset-0 hidden rounded-none border-y-0 border-r-0 lg:block" />
        <div className="no-scrollbar relative flex flex-col gap-4 px-4 pb-8 sm:px-6 md:grid md:grid-cols-2 md:items-start lg:flex lg:items-stretch lg:h-full lg:overflow-y-auto lg:p-4">
          <div className="md:row-span-2">
            <FriendsPanel />
          </div>
          <TournamentsCard />
          <AchievementsCard stats={stats} />
        </div>
      </aside>
    </div>
  )
}

function StatPill({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-baseline gap-2 rounded-full border border-bronze-500/30 bg-soot-950/90 px-3.5 py-1.5 shadow-[inset_0_1px_0_rgb(243_210_168/0.08)] backdrop-blur-[3px]">
      <dt className="font-display text-[0.7rem] font-semibold tracking-[0.18em] text-parchment-400 uppercase">{label}</dt>
      <dd className="font-display text-lg leading-none font-extrabold text-parchment-50 tabular-nums">{value}</dd>
    </div>
  )
}

/** "Continue match": the saved match (mode, map, round, era, players) with Resume and Abandon. */
function ContinueBanner({ match, onContinue, onAbandon }: { match: SavedMatchSummary; onContinue: () => void; onAbandon: () => void }) {
  const t = useT()
  return (
    <section
      aria-labelledby="continue-title"
      className="plate rivets iron flex animate-fade-up flex-col gap-4 border-brass-300/50 px-5 py-4 shadow-[0_0_0_1px_rgb(240_215_138/0.15),0_16px_40px_-18px_rgb(255_122_26/0.5)] sm:flex-row sm:items-center"
    >
      <div className="flex shrink-0 -space-x-2" aria-hidden="true">
        {match.players.map((player, i) => (
          <span
            key={i}
            className="grid size-10 place-items-center rounded-full border-2 border-soot-900 font-display text-sm font-extrabold text-soot-950 uppercase"
            style={{ background: PLAYER_STYLE[player.color].hex }}
          >
            {displayName(t, player.name).trim().charAt(0)}
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <p id="continue-title" className="eyebrow">
          {t.lobby.continueMatch}
        </p>
        <p className="mt-0.5 font-display text-xl leading-tight font-bold tracking-[0.06em] text-parchment-50">
          {t.modes[match.modeId].name} · {match.map}
        </p>
        <p className="text-sm text-parchment-300">
          {t.match.roundOf(match.round, match.totalRounds)}
          {match.era && <> · {t.match.era[match.era]}</>} · {match.players.map((p) => displayName(t, p.name)).join(', ')}
        </p>
      </div>
      <div className="flex gap-2">
        <button type="button" className="btn btn-ghost px-4" onClick={onAbandon}>
          {t.lobby.abandon}
        </button>
        <button type="button" className="btn btn-primary px-6" onClick={onContinue}>
          <IconPlay className="size-4" />
          {t.lobby.resume}
        </button>
      </div>
    </section>
  )
}

const OPPONENT_OPTIONS: { value: keyof Messages['lobby']['opponents']; Icon: ComponentType<IconProps> }[] = [
  { value: 'computer', Icon: IconComputer },
  { value: 'pass', Icon: IconUsers },
  { value: 'online', Icon: IconGlobe },
]

/**
 * Who you play: a preset for the seats below (you against computers, or
 * everyone human on this device). Online needs a server Bronze doesn't have,
 * so it is disabled and marked "Coming soon".
 */
function OpponentsControl({ value, onChange }: { value: Opponents; onChange: (value: Exclude<Opponents, 'mixed'>) => void }) {
  const t = useT()
  const { signedIn } = useAuth()
  const access = useAccountAccess()
  const navigate = useNavigate()
  const openAuth = useOpenAuth()
  return (
    <fieldset className="@container animate-fade-up [animation-delay:160ms]">
      <legend className="mb-2 flex w-full items-baseline justify-between gap-3">
        <span className="font-display text-lg font-extrabold tracking-[0.1em] text-parchment-50 uppercase">{t.lobby.opponentsTitle}</span>
        {value === 'mixed' && <span className="text-xs text-parchment-400">{t.lobby.mixed}</span>}
      </legend>
      <div className="plate iron grid grid-cols-3 gap-1 rounded-xl p-1">
        {OPPONENT_OPTIONS.map(({ value: option, Icon }) => {
          const label = t.lobby.opponents[option]
          const online = option === 'online'
          const checked = !online && value === option
          // Guests: Online needs an account first, so it's a lock that opens the log-in screen.
          // Signed in without a verified email: the lock leads to verifying it.
          if (online && access !== 'ready') {
            return (
              <button
                key={option}
                type="button"
                onClick={() => (access === 'guest' ? openAuth('login') : navigate(accountPath('security')))}
                className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-center font-display text-sm font-bold tracking-[0.08em] text-parchment-400 uppercase transition hover:bg-soot-700/60 hover:text-parchment-100 @xl:flex-row @xl:gap-2 @xl:text-base"
              >
                <Icon className="size-5 shrink-0" />
                <span className="leading-tight">{label}</span>
                <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-brass-300/50 bg-soot-950/80 px-2 py-0.5 text-[0.62rem] leading-tight tracking-[0.1em] text-balance text-brass-200">
                  <IconLock className="size-3" strokeWidth={2.4} />
                  {access === 'guest' ? t.common.logInToUse : t.verifyEmail.needed}
                </span>
              </button>
            )
          }
          return (
            <label
              key={option}
              title={online ? t.lobby.onlineNeedsServer : undefined}
              className={`relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-center font-display text-sm font-bold tracking-[0.08em] uppercase transition has-focus-visible:outline-2 has-focus-visible:outline-ember-400 @xl:flex-row @xl:gap-2 @xl:text-base ${
                online
                  ? 'cursor-not-allowed text-parchment-500'
                  : checked
                    ? 'cursor-pointer bg-linear-to-b from-bronze-400/35 to-bronze-600/25 text-parchment-50 shadow-[inset_0_0_0_1px_rgb(240_215_138/0.55)]'
                    : 'cursor-pointer text-parchment-300 hover:bg-soot-700/60 hover:text-parchment-50'
              }`}
            >
              <input
                type="radio"
                name="opponents"
                value={option}
                checked={checked}
                disabled={online}
                onChange={() => option !== 'online' && onChange(option)}
                className="sr-only"
              />
              <Icon className={`size-5 shrink-0 ${checked ? 'text-brass-300' : ''}`} />
              <span className="leading-tight">{label}</span>
              {online && signedIn && <span className="soon-tag">{t.common.comingSoon}</span>}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
