/**
 * The leaderboard at /leaderboard: the top 100 settled ratings on a map, one
 * board each for 2-, 3- and 4-player games (provisional ratings aren't
 * ranked), and where you stand, even when you're further down or not ranked yet.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { IconPodium } from '../components/icons'
import { DEFAULT_MAP_ID, getMap } from '../data/maps'
import { profilePath } from '../data/navigation'
import { useAuth } from '../hooks/useAuth'
import { useT } from '../i18n'
import { gameRequest } from '../online/client'
import { useOnlineErrors } from '../online/useOnlineErrors'
import { PROVISIONAL_GAMES, RATED_PLAYER_COUNTS, type RatedPlayers } from '../rating/config'
import type { Leaderboard as Board } from '../server/types'
import { OnlineGate } from './OnlineLobby'

export function Leaderboard() {
  const t = useT()
  const l = t.online.leaderboard
  return (
    <section aria-labelledby="leaderboard-title" className="min-w-0 px-4 pt-5 pb-8 sm:px-6 lg:px-8 lg:pt-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 id="leaderboard-title" className="page-title flex items-center gap-3 text-4xl sm:text-5xl">
            <IconPodium aria-hidden="true" className="size-8 text-brass-300 sm:size-9" />
            {l.title}
          </h1>
          <p className="max-w-2xl text-parchment-300">{l.intro(getMap(DEFAULT_MAP_ID).name)}</p>
        </header>
        <OnlineGate>{() => <Table />}</OnlineGate>
      </div>
    </section>
  )
}

function Table() {
  const t = useT()
  const l = t.online.leaderboard
  const auth = useAuth()
  const showError = useOnlineErrors()
  const [players, setPlayers] = useState<RatedPlayers>(2)
  const [board, setBoard] = useState<Board | null>(null)
  useEffect(() => {
    let live = true
    gameRequest<Board>({ op: 'leaderboard', mapId: DEFAULT_MAP_ID, players }).then(
      (b) => live && setBoard(b),
      (error) => showError(error),
    )
    return () => {
      live = false
    }
  }, [showError, players])
  // One board per player count.
  const tabs = (
    <div role="tablist" aria-label={l.title} className="flex gap-1.5" data-testid="leaderboard-tabs">
      {RATED_PLAYER_COUNTS.map((n) => (
        <button
          key={n}
          type="button"
          role="tab"
          aria-selected={n === players}
          onClick={() => setPlayers(n)}
          className={`min-h-10 flex-1 rounded-lg border px-3 font-display text-sm font-bold tracking-[0.1em] uppercase sm:flex-none ${n === players ? 'border-brass-300/70 bg-brass-300/15 text-parchment-50' : 'border-bronze-500/30 bg-soot-950/50 text-parchment-300 hover:text-parchment-50'}`}
        >
          {t.online.rating.players(n)}
        </button>
      ))}
    </div>
  )
  if (!board || board.players !== players)
    return (
      <div className="flex flex-col gap-4">
        {tabs}
        <p className="text-parchment-400">…</p>
      </div>
    )

  const myName = auth.profile?.username
  const { me } = board
  const inTop = me?.rank != null && board.rows.some((r) => r.rank === me.rank)
  let mine: string
  if (!me) mine = l.noRating
  else if (me.provisional) mine = l.provisional(Math.max(0, PROVISIONAL_GAMES - me.gamesPlayed))
  else mine = l.yourRank(me.rank!)

  return (
    <div className="flex flex-col gap-4">
      {tabs}
      <p className="plate flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-parchment-100" data-testid="my-position">
        <span className="text-xs font-semibold tracking-[0.14em] text-parchment-400 uppercase">{l.you}</span>
        <span>{mine}</span>
        {me && !me.provisional && <span className="ml-auto font-display text-xl font-extrabold text-brass-100 tabular-nums">{me.rating}</span>}
      </p>
      {board.rows.length === 0 ? (
        <p className="plate px-4 py-3 text-parchment-300">{l.empty}</p>
      ) : (
        <div className="plate overflow-x-auto">
          <table className="w-full text-left text-sm" data-testid="leaderboard">
            <thead>
              <tr className="border-b border-bronze-500/30 text-xs tracking-[0.12em] text-parchment-400 uppercase">
                <th scope="col" className="w-14 px-4 py-2.5 text-right">{l.rank}</th>
                <th scope="col" className="px-3 py-2.5">{l.player}</th>
                <th scope="col" className="px-3 py-2.5 text-right">{l.rating}</th>
                <th scope="col" className="px-4 py-2.5 text-right">{l.games}</th>
              </tr>
            </thead>
            <tbody>
              {board.rows.map((r) => {
                const self = r.username === myName
                return (
                  <tr key={r.username} aria-current={self ? 'true' : undefined} className={`border-b border-bronze-500/10 last:border-0 ${self ? 'bg-brass-300/12' : ''}`}>
                    <td className={`px-4 py-2 text-right font-display font-bold tabular-nums ${r.rank <= 3 ? 'text-brass-200' : 'text-parchment-300'}`}>{r.rank}</td>
                    <td className="max-w-0 truncate px-3 py-2">
                      <Link to={profilePath(r.username)} className="text-parchment-50 underline-offset-2 hover:underline">
                        {r.username}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-right font-display font-bold text-parchment-50 tabular-nums">{r.rating}</td>
                    <td className="px-4 py-2 text-right text-parchment-300 tabular-nums">{r.gamesPlayed}</td>
                  </tr>
                )
              })}
              {me && !me.provisional && !inTop && myName && (
                <tr aria-current="true" className="border-t-2 border-bronze-400/50 bg-brass-300/12">
                  <td className="px-4 py-2 text-right font-display font-bold text-parchment-300 tabular-nums">{me.rank}</td>
                  <td className="px-3 py-2 text-parchment-50">{myName}</td>
                  <td className="px-3 py-2 text-right font-display font-bold text-parchment-50 tabular-nums">{me.rating}</td>
                  <td className="px-4 py-2 text-right text-parchment-300 tabular-nums">{me.gamesPlayed}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
