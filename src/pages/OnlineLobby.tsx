/**
 * Online play: create a game (2–4 players, public or private), join one with
 * an invite code, Quick play by rating, and the lists: open games (with their
 * average rating), games being played (to watch) and your own games. The
 * lists follow the server's announcements over Realtime, else they poll.
 */

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { IconGlobe, IconLock, IconPlay, IconUsers } from '../components/icons'
import { LockedMapCard, MapCard } from '../components/MapCard'
import { GAME_MODES } from '../data/gameModes'
import { DEFAULT_MAP_ID, getMap } from '../data/maps'
import { TIME_CONTROL } from '../rules/config/game'
import { accountPath, onlineGamePath } from '../data/navigation'
import { useAccountAccess } from '../hooks/useAccountAccess'
import { useOpenAuth } from '../hooks/useOpenAuth'
import { useT } from '../i18n'
import { displayName, gameRequest, onlineAvailable, OnlineError, watchTopic, type GameLists, type GameSummary, type GameView, type QuickPlayReply } from '../online/client'
import type { MyRating } from '../server/types'
import { RatingBadge } from '../components/RatingBadge'
import { POLL_MS } from '../online/useOnlineGame'
import { useOnlineErrors } from '../online/useOnlineErrors'

export function OnlineLobby() {
  const t = useT()
  const o = t.online
  const body = <OnlineGate>{() => <OnlineHome />}</OnlineGate>

  return (
    <section aria-labelledby="online-title" className="min-w-0 px-4 pt-5 pb-8 sm:px-6 lg:px-8 lg:pt-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 id="online-title" className="page-title flex items-center gap-3 text-4xl sm:text-5xl">
            <IconGlobe aria-hidden="true" className="size-8 text-brass-300 sm:size-9" />
            {o.title}
          </h1>
          <p className="max-w-2xl text-parchment-300">{o.intro}</p>
        </header>
        {body}
      </div>
    </section>
  )
}

/** Online pages need the server and a verified account: otherwise, say what's missing. */
export function OnlineGate({ children }: { children: () => ReactNode }) {
  const t = useT()
  const o = t.online
  const access = useAccountAccess()
  const openAuth = useOpenAuth()
  const navigate = useNavigate()
  if (!onlineAvailable) return <Notice>{o.notSetUp}</Notice>
  if (access === 'guest')
    return (
      <Notice>
        <span>{o.signIn}</span>
        <button type="button" className="btn btn-primary px-6" onClick={() => openAuth('login')}>
          {o.signInButton}
        </button>
      </Notice>
    )
  if (access === 'unverified')
    return (
      <Notice>
        <span>{t.verifyEmail.needed}</span>
        <button type="button" className="btn btn-primary px-6" onClick={() => navigate(accountPath('security'))}>
          <IconLock className="size-4" />
          {t.verifyEmail.needed}
        </button>
      </Notice>
    )
  return <>{children()}</>
}

function Notice({ children }: { children: ReactNode }) {
  return <div className="plate rivets iron flex flex-col items-start gap-3 px-5 py-4 text-parchment-100 sm:flex-row sm:items-center sm:justify-between">{children}</div>
}

function OnlineHome() {
  const [lists, setLists] = useState<GameLists | null>(null)
  const [live, setLive] = useState(false)
  const showError = useOnlineErrors()

  const load = useCallback(async () => {
    try {
      setLists(await gameRequest<GameLists>({ op: 'list' }))
    } catch (error) {
      if (!(error instanceof OnlineError && error.code === 'network')) showError(error)
    }
  }, [showError])

  useEffect(() => {
    const first = window.setTimeout(() => void load(), 0)
    const stop = watchTopic('lobby', () => void load(), setLive)
    return () => {
      window.clearTimeout(first)
      stop()
    }
  }, [load])
  // Without Realtime, look again every few seconds; with it, now and then anyway (games you're in change too).
  useEffect(() => {
    const timer = window.setInterval(() => void load(), live ? 20_000 : POLL_MS * 2)
    return () => window.clearInterval(timer)
  }, [live, load])

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <CreateGame />
        <JoinByCode />
        <QuickPlay />
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <MyRatingPanel />
        <GameList kind="mine" games={lists?.mine ?? null} />
        <GameList kind="open" games={lists?.open ?? null} />
        <GameList kind="live" games={lists?.live ?? null} />
      </div>
    </div>
  )
}

function Panel({ title, children, id }: { title: string; children: ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="plate iron flex flex-col gap-3 rounded-xl px-4 py-4">
      <h2 id={id} className="font-display text-lg font-extrabold tracking-[0.1em] text-parchment-50 uppercase">
        {title}
      </h2>
      {children}
    </section>
  )
}

/** Choices shown as a row of pressed buttons (radio buttons underneath). */
function Segmented<T extends string | number>({ name, value, options, onChange, label }: { name: string; value: T; options: { value: T; label: string; soon?: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <fieldset>
      <legend className="eyebrow mb-1.5">{label}</legend>
      <div className="grid gap-1 rounded-lg border border-bronze-500/25 bg-soot-950/60 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((option) => {
          const checked = option.value === value
          // An option that isn't open yet: greyed out, with a "Coming soon" tag.
          const locked = option.soon !== undefined
          return (
            <label
              key={String(option.value)}
              title={option.soon}
              className={`flex min-h-10 flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1 font-display text-sm font-bold tracking-[0.08em] uppercase transition has-focus-visible:outline-2 has-focus-visible:outline-ember-400 ${
                locked
                  ? 'cursor-not-allowed text-parchment-500'
                  : checked
                    ? 'cursor-pointer bg-linear-to-b from-bronze-400/35 to-bronze-600/25 text-parchment-50 shadow-[inset_0_0_0_1px_rgb(240_215_138/0.55)]'
                    : 'cursor-pointer text-parchment-300 hover:bg-soot-700/60'
              }`}
            >
              <input type="radio" name={name} className="sr-only" checked={checked && !locked} disabled={locked} onChange={() => onChange(option.value)} />
              {option.label}
              {locked && <span className="soon-tag !px-1.5 !text-[0.55rem]">{option.soon}</span>}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

function CreateGame() {
  const t = useT()
  const o = t.online
  const navigate = useNavigate()
  const showError = useOnlineErrors()
  const [players, setPlayers] = useState(3)
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [rated, setRated] = useState(false)
  const [spectators, setSpectators] = useState(true)
  const [busy, setBusy] = useState(false)

  const create = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    try {
      const view = await gameRequest<GameView>({ op: 'create', players, visibility, rated: visibility === 'private' && rated, allowSpectators: spectators })
      navigate(onlineGamePath(view.id))
    } catch (error) {
      showError(error)
      setBusy(false)
    }
  }

  return (
    <Panel title={o.create.title} id="create-title">
      <form className="flex flex-col gap-3" onSubmit={create}>
        <Segmented
          name="mode"
          label={o.create.mode}
          value="normal"
          onChange={() => {}}
          options={GAME_MODES.map((mode) => ({ value: mode.id, label: t.modes[mode.id].name, soon: mode.playable ? undefined : t.common.comingSoon }))}
        />
        <p className="-mt-1 text-xs text-parchment-400">{t.modes.clock(TIME_CONTROL.normal.baseMs / 60_000, TIME_CONTROL.normal.incrementMs / 1000)} · {o.create.flagged}</p>
        <div className="flex flex-col gap-1.5">
          <span className="eyebrow">{t.setup.map}</span>
          <div className="grid gap-2">
            <MapCard map={getMap(DEFAULT_MAP_ID)} selected onSelect={() => {}} />
            <LockedMapCard />
          </div>
        </div>
        <Segmented name="players" label={o.create.players} value={players} onChange={setPlayers} options={[2, 3, 4].map((n) => ({ value: n, label: String(n) }))} />
        <Segmented
          name="visibility"
          label={o.create.visibility}
          value={visibility}
          onChange={setVisibility}
          options={[
            { value: 'public', label: o.create.public },
            { value: 'private', label: o.create.private },
          ]}
        />
        <p className="text-sm text-parchment-300">{visibility === 'public' ? o.create.publicHint : o.create.privateHint}</p>
        {visibility === 'private' && (
          <label className="flex items-start gap-2 text-sm text-parchment-200">
            <input type="checkbox" className="mt-1 accent-brass-300" checked={rated} onChange={(e) => setRated(e.target.checked)} />
            <span>
              <span className="font-bold text-parchment-50">{o.create.rated}</span> — {o.create.ratedHint}
            </span>
          </label>
        )}
        <label className="flex items-center gap-2 text-sm text-parchment-200">
          <input type="checkbox" className="accent-brass-300" checked={spectators} onChange={(e) => setSpectators(e.target.checked)} />
          {o.create.spectators}
        </label>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          <IconPlay className="size-4" />
          {o.create.button}
        </button>
      </form>
    </Panel>
  )
}

function JoinByCode() {
  const o = useT().online
  const navigate = useNavigate()
  const showError = useOnlineErrors()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const join = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    try {
      const view = await gameRequest<GameView>({ op: 'join', code })
      navigate(onlineGamePath(view.id))
    } catch (error) {
      showError(error)
      setBusy(false)
    }
  }
  return (
    <Panel title={o.join.title} id="join-title">
      <form className="flex gap-2" onSubmit={join}>
        <label className="sr-only" htmlFor="join-code">
          {o.join.label}
        </label>
        <input
          id="join-code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6))}
          placeholder={o.join.placeholder}
          autoComplete="off"
          spellCheck={false}
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-bronze-500/35 bg-soot-950/70 px-3 font-display text-lg tracking-[0.3em] text-parchment-50 uppercase outline-none placeholder:text-parchment-500 focus-visible:border-brass-300"
        />
        <button type="submit" className="btn btn-ghost px-5" disabled={busy || code.length !== 6}>
          {o.join.button}
        </button>
      </form>
    </Panel>
  )
}

function QuickPlay() {
  const o = useT().online
  const navigate = useNavigate()
  const showError = useOnlineErrors()
  const [players, setPlayers] = useState(3)
  const [searching, setSearching] = useState<{ range: number; waitedMs: number } | null>(null)

  useEffect(() => {
    if (!searching) return
    let stopped = false
    const timer = window.setTimeout(async () => {
      try {
        const reply = await gameRequest<QuickPlayReply>({ op: 'quick-play', players })
        if (stopped) return
        if (reply.status === 'matched') navigate(onlineGamePath(reply.gameId))
        else setSearching({ range: reply.range, waitedMs: reply.waitedMs })
      } catch (error) {
        if (!stopped) {
          showError(error)
          setSearching(null)
        }
      }
    }, 2000)
    return () => {
      stopped = true
      window.clearTimeout(timer)
    }
  }, [searching, players, navigate, showError])

  const start = () => setSearching({ range: 0, waitedMs: 0 })
  const cancel = () => {
    setSearching(null)
    void gameRequest({ op: 'quick-cancel' }).catch(() => {})
  }

  return (
    <Panel title={o.quick.title} id="quick-title">
      <p className="text-sm text-parchment-300">{o.quick.text}</p>
      <Segmented name="quick-players" label={o.create.players} value={players} onChange={(n) => !searching && setPlayers(n)} options={[2, 3, 4].map((n) => ({ value: n, label: String(n) }))} />
      {searching ? (
        <div className="flex flex-col gap-2">
          <p role="status" className="text-sm text-brass-200">
            {o.quick.searching(searching.range || 150, Math.round(searching.waitedMs / 1000))}
          </p>
          <button type="button" className="btn btn-ghost" onClick={cancel}>
            {o.quick.cancel}
          </button>
        </div>
      ) : (
        <button type="button" className="btn btn-primary" onClick={start}>
          <IconUsers className="size-4" />
          {o.quick.button}
        </button>
      )}
    </Panel>
  )
}

function GameList({ kind, games }: { kind: 'open' | 'live' | 'mine'; games: GameSummary[] | null }) {
  const t = useT()
  const o = t.online
  const navigate = useNavigate()
  const showError = useOnlineErrors()
  const title = o.lists[kind]
  const empty = kind === 'open' ? o.lists.emptyOpen : kind === 'live' ? o.lists.emptyLive : o.lists.emptyMine

  const join = async (game: GameSummary) => {
    try {
      await gameRequest<GameView>({ op: 'join', gameId: game.id })
      navigate(onlineGamePath(game.id))
    } catch (error) {
      showError(error)
    }
  }

  return (
    <Panel title={title} id={`list-${kind}`}>
      {games === null ? (
        <p className="text-sm text-parchment-400">…</p>
      ) : games.length === 0 ? (
        <p className="text-sm text-parchment-400">{empty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-bronze-500/15">
          {games.map((game) => (
            <li key={game.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 font-display font-bold tracking-[0.04em] text-parchment-50">
                  <span className="truncate">{game.players.map((p) => displayName(p.username, o.deletedPlayer)).join(', ')}</span>
                  <span className={`rounded-full border px-2 py-px text-[0.65rem] tracking-[0.12em] uppercase ${game.rated ? 'border-brass-300/60 text-brass-200' : 'border-parchment-500/40 text-parchment-400'}`}>
                    {game.rated ? o.lists.rated : o.lists.unrated}
                  </span>
                </p>
                <p className="text-xs text-parchment-400">
                  {o.lists.players(game.players.length, game.maxPlayers)} · {game.averageRating !== null ? o.lists.average(game.averageRating) : o.lists.noRating}
                  {game.progress ? ` · ${o.lists.progress(game.progress.era, game.progress.round)}` : ''}
                  {kind === 'mine' ? ` · ${o.lists.status[game.status]}` : ` · ${o.lists.host(game.host)}`}
                  {game.myRatingChange !== null && (
                    <span className={`ml-1 font-display font-bold ${game.myRatingChange >= 0 ? 'text-verdigris-300' : 'text-rust-300'}`}>{o.rating.change(game.myRatingChange)}</span>
                  )}
                </p>
              </div>
              {kind === 'open' && !game.mine ? (
                <button type="button" className="btn btn-primary min-h-9 px-4 text-sm" onClick={() => void join(game)}>
                  {o.lists.join}
                </button>
              ) : (
                <button type="button" className="btn btn-ghost min-h-9 px-4 text-sm" onClick={() => navigate(onlineGamePath(game.id))}>
                  {kind === 'live' && !game.mine ? o.lists.watch : o.lists.openGame}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

/** Your rating on the map, as it stands now (with the provisional "?"), and how ratings work. */
function MyRatingPanel() {
  const t = useT()
  const r = t.online.rating
  const [rating, setRating] = useState<MyRating | null>(null)
  useEffect(() => {
    let stopped = false
    gameRequest<MyRating>({ op: 'my-rating' })
      .then((value) => !stopped && setRating(value))
      .catch(() => {})
    return () => {
      stopped = true
    }
  }, [])
  return (
    <section aria-labelledby="my-rating-title" className="plate iron flex flex-col gap-2 rounded-xl px-4 py-3" data-testid="my-rating">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="my-rating-title" className="font-display text-lg font-extrabold tracking-[0.1em] text-parchment-50 uppercase">
          {r.your}
        </h2>
        <span className="text-sm text-parchment-400">{r.onMap(getMap(DEFAULT_MAP_ID).name)}</span>
      </div>
      {rating && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <RatingBadge rating={rating.rating} provisional={rating.provisional} rd={rating.rd} games={rating.gamesPlayed} className="text-3xl text-brass-100" />
          <span className="text-sm text-parchment-300">
            {rating.unplaced ? r.unplaced : `${r.games(rating.gamesPlayed)} · ${r.peak(rating.peakRating)}`}
          </span>
        </div>
      )}
      <details className="text-sm text-parchment-300">
        <summary className="cursor-pointer font-semibold text-brass-200">{r.howTitle}</summary>
        <p className="mt-1.5 leading-relaxed">{r.how}</p>
        <p className="mt-1.5 leading-relaxed">{r.whenRated}</p>
      </details>
    </section>
  )
}
