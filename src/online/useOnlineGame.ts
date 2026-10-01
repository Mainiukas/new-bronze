import { useCallback, useEffect, useRef, useState } from 'react'
import { CONNECTION_LOST_MS } from '../rules/config/game'
import type { Action } from '../rules/state'
import { gameRequest, OnlineError, watchTopic, type GameView, type Request } from './client'

/** How often a player's tab says it's still here (well inside the server's "connection lost" time). */
export const HEARTBEAT_MS = Math.min(15_000, CONNECTION_LOST_MS / 2)
/** Without Realtime: how often to ask for news. */
export const POLL_MS = 3_000

export interface OnlineGame {
  view: GameView | null
  /** Couldn't load the game (not found, private, offline…). */
  error: OnlineError | null
  /** Realtime is connected (else the screen polls). */
  live: boolean
  /** A move or request is on its way. */
  busy: boolean
  /** The server's clock minus this device's (timers show the server's time). */
  clockOffset: number
  /** Sends moves in order (each after the last is accepted); resolves with the last view, or throws the refusal. */
  act: (actions: Action[]) => Promise<GameView>
  /** Any other request that answers with the game (ready, start, add-bot…). */
  send: (body: Request) => Promise<GameView>
  refresh: () => void
}

/** The same game state (compared by content: every reply is a fresh copy). */
export function sameState(a: GameView['state'], b: GameView['state']): boolean {
  return a === b || (!!a && !!b && JSON.stringify(a) === JSON.stringify(b))
}

export function useOnlineGame(gameId: string): OnlineGame {
  const [view, setView] = useState<GameView | null>(null)
  const [error, setError] = useState<OnlineError | null>(null)
  const [live, setLive] = useState(false)
  const [busy, setBusy] = useState(false)
  const [clockOffset, setClockOffset] = useState(0)
  const latest = useRef<GameView | null>(null)

  /**
   * Keep a view unless an older one arrives after a newer one. A view whose
   * game state hasn't changed (a heartbeat, someone reconnecting) keeps the
   * same state object, so a turn being played (not yet confirmed) stays.
   */
  const accept = useCallback((incoming: GameView) => {
    const prev = latest.current
    if (prev && prev.id === incoming.id && incoming.version < prev.version) return prev
    const next = prev && prev.id === incoming.id && prev.state && sameState(prev.state, incoming.state) ? { ...incoming, state: prev.state } : incoming
    latest.current = next
    setView(next)
    setClockOffset(next.serverNow - Date.now())
    setError(null)
    return next
  }, [])

  const load = useCallback(
    async (op: 'view' | 'ping') => {
      try {
        accept(await gameRequest<GameView>({ op, gameId }))
      } catch (e) {
        if (e instanceof OnlineError && e.code !== 'network') setError(e)
      }
    },
    [gameId, accept],
  )

  // First look, then news over Realtime.
  useEffect(() => {
    latest.current = null
    const first = window.setTimeout(() => void load('view'), 0)
    const stop = watchTopic(`game:${gameId}`, () => void load('view'), setLive)
    return () => {
      window.clearTimeout(first)
      stop()
    }
  }, [gameId, load])

  // Players send a heartbeat (it also lets the server play timeouts and stand-in bots); without Realtime, everyone polls.
  const seated = view?.mySeat !== null && view?.mySeat !== undefined
  const playing = view?.status === 'playing' || view?.status === 'lobby'
  useEffect(() => {
    if (!playing) return
    const every = live ? HEARTBEAT_MS : POLL_MS
    const timer = window.setInterval(() => void load(seated ? 'ping' : 'view'), every)
    return () => window.clearInterval(timer)
  }, [playing, live, seated, load])

  // Ask again the moment a clock or a grace time runs out, so the timeout happens on time.
  const turn = view?.turn
  const dueAt = (() => {
    if (!view || view.status !== 'playing') return null
    const times: number[] = []
    if (turn) times.push(turn.startedAt + (view.seats[turn.seat]?.clockMs ?? 0))
    for (const s of view.seats) if (s.graceEndsAt) times.push(s.graceEndsAt)
    return times.length ? Math.min(...times) : null
  })()
  useEffect(() => {
    if (dueAt === null) return
    const wait = Math.max(500, dueAt - (Date.now() + clockOffset) + 750)
    const timer = window.setTimeout(() => void load('ping'), Math.min(wait, 2 ** 31 - 1))
    return () => window.clearTimeout(timer)
  }, [dueAt, clockOffset, load])

  const send = useCallback(
    async (body: Request) => {
      setBusy(true)
      try {
        return accept(await gameRequest<GameView>(body))
      } finally {
        setBusy(false)
      }
    },
    [accept],
  )

  const act = useCallback(
    async (actions: Action[]) => {
      setBusy(true)
      try {
        let current = latest.current
        for (const action of actions) {
          if (!current) throw new OnlineError('not-playing', 'The game isn’t loaded', 409)
          try {
            current = accept(await gameRequest<GameView>({ op: 'act', gameId, version: current.version, action }))
          } catch (e) {
            // Someone moved first (or a clock ran out): show the game as it is now.
            if (e instanceof OnlineError && (e.code === 'stale' || e.code === 'not-your-turn')) void load('view')
            throw e
          }
        }
        return current!
      } finally {
        setBusy(false)
      }
    },
    [gameId, accept, load],
  )

  // Until the new game loads, don't show the last one.
  const shown = view && view.id === gameId ? view : null
  return { view: shown, error, live, busy, clockOffset, act, send, refresh: () => void load('view') }
}
