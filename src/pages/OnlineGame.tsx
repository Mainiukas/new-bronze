/**
 * One online game at /online/<id>: its room while players gather (seats,
 * ready, invite link and code, bots and Start for the host), then the match,
 * played through the server. Also the invite link, /join/<code>.
 */

import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'
import { IconArrowLeft, IconCheck, IconComputer, IconEye, IconLock, IconPlay } from '../components/icons'
import { SceneBackground } from '../components/SceneBackground'
import { SiteFooter } from '../components/legal/SiteFooter'
import { joinPath, onlineGamePath, PATHS } from '../data/navigation'
import type { GameSettings } from '../data/settings'
import { useAccountAccess } from '../hooks/useAccountAccess'
import { useAuth } from '../hooks/useAuth'
import { useOpenAuth } from '../hooks/useOpenAuth'
import { useT } from '../i18n'
import { displayName, gameRequest, OnlineError, withNames, type GameView } from '../online/client'
import type { FriendsView } from '../server/types'
import { useOnlineGame, type OnlineGame as Online } from '../online/useOnlineGame'
import type { BrassMatch } from '../rules/match'
import { clockNow, type SeatClock } from '../components/brass/clock'
import { TIME_CONTROL } from '../rules/config/game'
import { useOnlineErrors } from '../online/useOnlineErrors'
import { RatingBadge } from '../components/RatingBadge'

const BrassGame = lazy(() => import('./BrassGame').then((module) => ({ default: module.BrassGame })))

interface OnlineGameProps {
  settings: GameSettings
  onOpenRules: () => void
  onOpenSettings: () => void
  overlayOpen: boolean
}

export function OnlineGame(props: OnlineGameProps) {
  const { gameId = '' } = useParams()
  const game = useOnlineGame(gameId)
  const t = useT()
  const o = t.online
  const navigate = useNavigate()

  if (game.error && !game.view)
    return (
      <Frame>
        <div className="plate rivets iron mx-auto flex max-w-lg flex-col items-start gap-3 px-5 py-5">
          <p className="text-parchment-100">{o.errors[game.error.code] ?? o.errors.server}</p>
          <button type="button" className="btn btn-ghost" onClick={() => navigate(PATHS.online)}>
            <IconArrowLeft className="size-4" />
            {o.back}
          </button>
        </div>
      </Frame>
    )
  if (!game.view)
    return (
      <Frame>
        <p role="status" className="text-center text-parchment-300">
          {o.game.loading}
        </p>
      </Frame>
    )
  if (game.view.status === 'lobby' || !game.view.state) return <GameRoom game={game} view={game.view} />
  return <OnlineMatch game={game} view={game.view} {...props} />
}

/** The painted scene with a page on it (the room, loading, errors). */
function Frame({ children }: { children: ReactNode }) {
  return (
    <>
      <SceneBackground />
      <main id="main-content" tabIndex={-1} className="relative flex min-h-dvh flex-col px-4 py-6 outline-none sm:px-6 lg:py-10">
        {children}
        <div className="mt-auto">
          <SiteFooter compact />
        </div>
      </main>
    </>
  )
}

/* ---- The room -------------------------------------------------------------------- */

function GameRoom({ game, view }: { game: Online; view: GameView }) {
  const t = useT()
  const o = t.online
  const r = o.room
  const navigate = useNavigate()
  const showError = useOnlineErrors()
  const [copied, setCopied] = useState(false)
  const run = (body: Parameters<Online['send']>[0]) => game.send(body).catch(showError)

  const me = view.mySeat === null ? null : view.seats[view.mySeat]
  const inviteUrl = view.code ? `${window.location.origin}${window.location.pathname}#${joinPath(view.code)}` : ''
  const othersReady = view.seats.every((s) => s.host || s.ready)
  const canStart = view.isHost && view.seats.length >= 2 && othersReady
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* the link is on screen to copy by hand */
    }
  }
  const leave = async () => {
    try {
      if (me) await gameRequest({ op: 'leave', gameId: view.id })
    } catch (error) {
      if (!(error instanceof OnlineError && error.code === 'not-found')) return showError(error)
    }
    navigate(PATHS.online)
  }

  return (
    <Frame>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <button type="button" className="btn btn-ghost self-start px-3" onClick={() => navigate(PATHS.online)}>
          <IconArrowLeft className="size-4" />
          {o.back}
        </button>
        <header className="flex flex-col gap-2">
          <h1 className="page-title text-4xl sm:text-5xl">{r.title(view.code ?? '')}</h1>
          <p className="flex flex-wrap gap-2 text-xs">
            <Badge>{view.visibility === 'public' ? o.create.public : o.create.private}</Badge>
            <Badge strong={view.willBeRated}>{view.willBeRated ? r.rated : r.unrated}</Badge>
            <Badge>{view.allowSpectators ? r.spectators : r.noSpectators}</Badge>
          </p>
        </header>

        {view.code && (
          <section className="plate iron flex flex-col gap-2 rounded-xl px-4 py-3" aria-label={r.invite}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="eyebrow">{r.code}</span>
              <span className="font-display text-2xl font-extrabold tracking-[0.35em] text-brass-200" data-testid="game-code">
                {view.code}
              </span>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <input readOnly value={inviteUrl} aria-label={r.invite} onFocus={(e) => e.target.select()} className="min-h-10 min-w-0 flex-1 rounded-lg border border-bronze-500/30 bg-soot-950/70 px-3 text-sm text-parchment-200 outline-none" />
              <button type="button" className="btn btn-ghost min-h-10 px-4" onClick={() => void copy()}>
                {copied ? <IconCheck className="size-4" /> : null}
                {copied ? r.copied : r.copy}
              </button>
            </div>
          </section>
        )}

        {me && view.seats.length < view.maxPlayers && <InviteFriends gameId={view.id} seated={view.seats.map((s) => s.username)} />}

        <section className="plate rivets iron flex flex-col gap-1 rounded-xl px-4 py-3" aria-label={r.waiting(view.seats.length, view.maxPlayers)}>
          <p className="eyebrow">{r.waiting(view.seats.length, view.maxPlayers)}</p>
          <ul className="flex flex-col divide-y divide-bronze-500/15">
            {Array.from({ length: view.maxPlayers }, (_, i) => {
              const seat = view.seats[i]
              if (!seat)
                return (
                  <li key={i} className="flex min-h-14 items-center gap-3 py-2 text-parchment-500 italic">
                    <span className="grid size-10 place-items-center rounded-full border-2 border-dashed border-bronze-500/30" aria-hidden="true" />
                    {r.empty}
                  </li>
                )
              const isMe = seat.seat === view.mySeat
              return (
                <li key={i} className="flex min-h-14 flex-wrap items-center gap-3 py-2">
                  <span className="relative grid size-10 place-items-center rounded-full border-2 border-bronze-400/60 bg-soot-800 font-display font-extrabold text-parchment-50 uppercase" aria-hidden="true">
                    {seat.bot ? <IconComputer className="size-5" /> : seat.username.charAt(0)}
                    {seat.human && <span className={`absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-soot-900 ${seat.connected ? 'bg-emerald-400' : 'bg-parchment-500'}`} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-bold tracking-[0.04em] text-parchment-50">
                      {seat.bot ? (seat.bot === 'easy' ? r.botEasy : r.botNormal) : seat.username}
                      {isMe && <span className="text-parchment-400"> ({r.you})</span>}
                      {seat.host && <span className="ml-2 rounded-full border border-brass-300/60 px-2 py-px text-[0.65rem] tracking-[0.12em] text-brass-200 uppercase">{r.host}</span>}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-parchment-400">
                      {seat.human && <RatingBadge rating={seat.rating} provisional={seat.provisional} rd={seat.ratingRd} games={seat.gamesPlayed} className="text-parchment-200" />}
                      {seat.human && !seat.connected ? <span>· {r.offline}</span> : null}
                    </p>
                  </div>
                  {!seat.host && (
                    <span className={`inline-flex items-center gap-1 font-display text-xs font-bold tracking-[0.12em] uppercase ${seat.ready ? 'text-emerald-300' : 'text-parchment-400'}`}>
                      {seat.ready && <IconCheck className="size-3.5" />}
                      {seat.ready ? r.ready : r.notReady}
                    </span>
                  )}
                  {view.isHost && !isMe && (
                    <button type="button" className="btn btn-ghost min-h-8 px-3 text-xs" disabled={game.busy} onClick={() => void run({ op: 'remove-seat', gameId: view.id, seat: seat.seat })}>
                      {r.remove}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </section>

        {view.isHost && view.visibility === 'private' && view.seats.length < view.maxPlayers && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-ghost px-4" disabled={game.busy} onClick={() => void run({ op: 'add-bot', gameId: view.id, level: 'easy' })}>
              <IconComputer className="size-4" />
              {r.addBot}: {r.botEasy}
            </button>
            <button type="button" className="btn btn-ghost px-4" disabled={game.busy} onClick={() => void run({ op: 'add-bot', gameId: view.id, level: 'normal' })}>
              <IconComputer className="size-4" />
              {r.addBot}: {r.botNormal}
            </button>
          </div>
        )}

        <div className="flex flex-col gap-1 text-sm text-parchment-300">
          {view.isHost && view.visibility === 'private' && (
            // The host can make a private game rated (it still isn't if a bot plays).
            <label className="flex items-center gap-2 font-semibold text-parchment-100">
              <input type="checkbox" className="accent-brass-300" checked={view.ratedRequested} disabled={game.busy} onChange={(e) => void run({ op: 'settings', gameId: view.id, rated: e.target.checked })} />
              {o.create.rated}
            </label>
          )}
          <p>{r.colorsNote}</p>
          <p>{r.botsNote}</p>
          <p>{o.rating.whenRated}</p>
          {view.isHost && <p>{r.startHint}</p>}
        </div>

        <div className="flex flex-wrap gap-2">
          {me && (
            <button type="button" className="btn btn-ghost px-5" onClick={() => void leave()}>
              {r.leave}
            </button>
          )}
          {me && !me.host && (
            <button type="button" className={`btn px-6 ${me.ready ? 'btn-ghost' : 'btn-primary'}`} disabled={game.busy} onClick={() => void run({ op: 'ready', gameId: view.id, ready: !me.ready })}>
              {me.ready ? r.unready : r.imReady}
            </button>
          )}
          {view.isHost && (
            <button type="button" className="btn btn-primary px-6" disabled={!canStart || game.busy} onClick={() => void run({ op: 'start', gameId: view.id })}>
              <IconPlay className="size-4" />
              {r.start}
            </button>
          )}
        </div>
      </div>
    </Frame>
  )
}

function Badge({ children, strong = false }: { children: ReactNode; strong?: boolean }) {
  return <span className={`rounded-full border px-2.5 py-0.5 font-display tracking-[0.12em] uppercase ${strong ? 'border-brass-300/60 text-brass-200' : 'border-parchment-500/40 text-parchment-300'}`}>{children}</span>
}

/** Friends who are online, each with Invite: they find it in their friends panel. */
function InviteFriends({ gameId, seated }: { gameId: string; seated: string[] }) {
  const s = useT().online.social
  const showError = useOnlineErrors()
  const [friends, setFriends] = useState<FriendsView['friends'] | null>(null)
  const [invited, setInvited] = useState<string[]>([])
  useEffect(() => {
    let live = true
    const look = () =>
      gameRequest<FriendsView>({ op: 'friends' }).then(
        (v) => live && setFriends(v.friends),
        () => {},
      )
    void look()
    const timer = window.setInterval(look, 30_000)
    return () => {
      live = false
      window.clearInterval(timer)
    }
  }, [])
  const invite = async (username: string) => {
    try {
      await gameRequest({ op: 'invite', username, gameId })
      setInvited((list) => [...list, username])
    } catch (error) {
      showError(error)
    }
  }
  const online = (friends ?? []).filter((f) => f.online && !seated.includes(f.username))
  return (
    <section className="plate iron flex flex-col gap-1 rounded-xl px-4 py-3" aria-labelledby="invite-friends" data-testid="invite-friends">
      <h2 id="invite-friends" className="eyebrow">
        {s.inviteTitle}
      </h2>
      {friends && online.length === 0 && <p className="text-sm text-parchment-400">{s.inviteNone}</p>}
      <ul className="flex flex-col divide-y divide-bronze-500/15">
        {online.map((f) => (
          <li key={f.username} className="flex min-h-11 items-center gap-2 py-1">
            <span aria-hidden="true" className="size-2.5 rounded-full bg-verdigris-300" />
            <span className="min-w-0 flex-1 truncate text-parchment-50">{f.username}</span>
            {invited.includes(f.username) ? (
              <span className="text-xs text-parchment-300">{s.invited}</span>
            ) : (
              <button type="button" className="btn btn-ghost min-h-9 px-4 text-sm" onClick={() => void invite(f.username)}>
                {s.invite}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ---- The match ------------------------------------------------------------------- */

function OnlineMatch({ game, view, settings, onOpenRules, onOpenSettings, overlayOpen }: { game: Online; view: GameView } & OnlineGameProps) {
  const t = useT()
  const o = t.online
  const navigate = useNavigate()
  const auth = useAuth()
  const showError = useOnlineErrors()
  const name = (n: string) => displayName(n, o.deletedPlayer)
  const state = withNames(view.state!, name)
  const match: BrassMatch = { kind: 'brass', modeId: view.mode, mapId: view.mapId, state }
  const spectating = view.mySeat === null
  const now = useNow() + game.clockOffset
  // A rated game that ended: each player's rating change.
  const ratings = view.result?.ratings.length ? Object.fromEntries(view.result.ratings.map((r) => [r.seat, r])) : undefined
  // Chess clocks: the player to move counts down from when their turn started.
  const clocks: Record<number, SeatClock> = {}
  for (const s of view.seats) {
    const running = view.status === 'playing' && view.turn?.seat === s.seat && !s.forfeited
    clocks[s.seat] = { ms: clockNow(s.clockMs, running, view.turn?.startedAt ?? 0, now), total: TIME_CONTROL[view.mode].baseMs, running, timeouts: s.timeouts }
  }

  const notes: string[] = []
  for (const s of view.seats) {
    if (s.forfeited) notes.push(o.game.forfeited(name(s.username)))
    else if (s.botPlaying) notes.push(o.game.botPlaying(name(s.username)))
    else if (s.graceEndsAt) notes.push(o.game.disconnected(s.username, clock(Math.max(0, s.graceEndsAt - now))))
  }
  if (view.result?.aborted) notes.push(o.game.aborted)

  const banner = (
    <div className="pointer-events-none absolute inset-x-0 top-2 z-20 flex flex-col items-center gap-1.5 px-3">
      {spectating && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-brass-300/50 bg-soot-950/90 px-3 py-1 font-display text-xs font-bold tracking-[0.12em] text-brass-200 uppercase">
          <IconEye className="size-3.5" />
          {o.game.watching}
        </span>
      )}
      {!game.live && game.error?.code === 'network' && <span className="rounded-full bg-soot-950/90 px-3 py-1 text-xs text-parchment-200">{o.game.reconnecting}</span>}
      {notes.map((note) => (
        <p key={note} role="status" className="max-w-md rounded-lg border border-ember-400/60 bg-soot-950/95 px-3 py-1.5 text-center text-sm text-parchment-50">
          {note}
        </p>
      ))}
    </div>
  )

  const submit = async (actions: Parameters<Online['act']>[0]) => {
    try {
      await game.act(actions)
      return true
    } catch (error) {
      showError(error)
      return false
    }
  }

  const rematch = async () => {
    try {
      const next = await gameRequest<GameView>({ op: 'rematch', gameId: view.id })
      navigate(onlineGamePath(next.id))
    } catch (error) {
      showError(error)
    }
  }

  return (
    <>
      <SceneBackground />
      <Suspense fallback={null}>
        <BrassGame
          key={view.id}
          match={match}
          onMatchChange={() => {}}
          onMatchFinished={() => []}
          onLeave={() => navigate(PATHS.online)}
          onRematch={() => (spectating ? navigate(PATHS.online) : void rematch())}
          settings={settings}
          onOpenRules={onOpenRules}
          onOpenSettings={onOpenSettings}
          overlayOpen={overlayOpen}
          localAvatarUrl={auth.profile?.avatarUrl ?? null}
          online={{ seat: view.mySeat ?? 0, spectating, busy: game.busy, submit, clocks, ratings }}
          banner={banner}
        />
      </Suspense>
    </>
  )
}

/** m:ss */
const clock = (ms: number) => {
  const s = Math.ceil(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** The time, updated every second (for the timers). */
function useNow() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  return now
}

/* ---- The invite link --------------------------------------------------------------- */

/** /join/<code>: join the game (or watch it, once it has started), then go to it. */
export function JoinInvite() {
  const { code = '' } = useParams()
  const t = useT()
  const o = t.online
  const access = useAccountAccess()
  const openAuth = useOpenAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (access !== 'ready') return
    let stopped = false
    void (async () => {
      try {
        const view = await gameRequest<GameView>({ op: 'join', code })
        if (!stopped) navigate(onlineGamePath(view.id), { replace: true })
      } catch (e) {
        // Started or full: watch it instead (with the code, even a private game).
        if (e instanceof OnlineError && (e.code === 'started' || e.code === 'full')) {
          try {
            const view = await gameRequest<GameView>({ op: 'view', code })
            if (!stopped) navigate(onlineGamePath(view.id), { replace: true })
            return
          } catch {
            /* explained below */
          }
        }
        if (!stopped) setError(e instanceof OnlineError ? (o.errors[e.code] ?? o.errors.server) : o.errors.server)
      }
    })()
    return () => {
      stopped = true
    }
  }, [access, code, navigate, o])

  return (
    <Frame>
      <div className="plate rivets iron mx-auto flex max-w-lg flex-col items-start gap-3 px-5 py-5">
        <h1 className="font-display text-2xl font-extrabold tracking-[0.1em] text-parchment-50 uppercase">{o.room.title(code.toUpperCase())}</h1>
        {access === 'unverified' ? (
          <p className="text-parchment-200">{t.verifyEmail.needed}</p>
        ) : access === 'guest' ? (
          <>
            <p className="text-parchment-200">{o.signIn}</p>
            <button type="button" className="btn btn-primary px-6" onClick={() => openAuth('login')}>
              <IconLock className="size-4" />
              {o.signInButton}
            </button>
          </>
        ) : error ? (
          <>
            <p className="text-parchment-200">{error}</p>
            <button type="button" className="btn btn-ghost" onClick={() => navigate(PATHS.online)}>
              <IconArrowLeft className="size-4" />
              {o.back}
            </button>
          </>
        ) : (
          <p role="status" className="text-parchment-300">
            {o.game.loading}
          </p>
        )}
      </div>
    </Frame>
  )
}
