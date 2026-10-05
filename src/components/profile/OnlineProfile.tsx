/**
 * A profile's online play: ratings per map (with the provisional "?"), the
 * rating graph, stats from online games, the last 20 games (each with a
 * replay), whether they're online, and the friend button. What shows follows
 * the player's privacy settings (public, friends only, private); the server
 * decides, so a hidden profile never reaches the browser.
 */

import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getMap, isMapId } from '../../data/maps'
import { replayPath } from '../../data/navigation'
import { useAccountAccess } from '../../hooks/useAccountAccess'
import { useT } from '../../i18n'
import { displayName, gameRequest, onlineAvailable, OnlineError } from '../../online/client'
import { useOnlineErrors } from '../../online/useOnlineErrors'
import type { FriendStatus, OnlineProfile as Profile } from '../../server/types'
import { RatingBadge } from '../RatingBadge'
import { RatingGraph } from '../RatingGraph'
import { RATED_PLAYER_COUNTS, type RatedPlayers } from '../../rating/config'

const mapName = (id: string) => (isMapId(id) ? getMap(id).name : id)

export function OnlineProfile({ username }: { username: string }) {
  const t = useT()
  const o = t.online
  const pr = o.profile
  const access = useAccountAccess()
  const showError = useOnlineErrors()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [missing, setMissing] = useState(false)

  const load = useCallback(async () => {
    try {
      setProfile(await gameRequest<Profile>({ op: 'profile', username }))
    } catch (error) {
      if (error instanceof OnlineError && (error.code === 'no-player' || error.code === 'not-set-up')) setMissing(true)
    }
  }, [username])
  useEffect(() => {
    if (!onlineAvailable || access !== 'ready') return
    const first = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(first)
  }, [access, load])

  if (!onlineAvailable || access !== 'ready' || missing || !profile) return null

  const friendAction = async (op: 'friend-request' | 'friend-remove') => {
    try {
      await gameRequest({ op, username: profile.username })
      await load()
    } catch (error) {
      showError(error)
    }
  }
  const respond = async (accept: boolean) => {
    try {
      await gameRequest({ op: 'friend-respond', username: profile.username, accept })
      await load()
    } catch (error) {
      showError(error)
    }
  }
  const { stats } = profile
  const date = (ms: number) => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <section aria-labelledby="online-profile" className="flex flex-col gap-4" data-testid="online-profile">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="online-profile" className="eyebrow">
          {pr.title}
        </h2>
        {!profile.hidden && (
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${profile.online ? 'text-verdigris-300' : 'text-parchment-400'}`}>
            <span aria-hidden="true" className={`size-2 rounded-full ${profile.online ? 'bg-verdigris-300' : 'bg-parchment-500'}`} />
            {profile.online ? o.social.online : o.social.offline}
          </span>
        )}
        <FriendButton status={profile.friend} onAdd={() => void friendAction('friend-request')} onRemove={() => void friendAction('friend-remove')} onRespond={(a) => void respond(a)} />
      </div>

      {profile.hidden ? (
        <p className="plate px-5 py-4 text-parchment-300">{pr.hidden}</p>
      ) : (
        <>
          {/* Ratings, one per map and player count */}
          <div className={`grid gap-3 ${profile.ratings.length > 1 ? 'sm:grid-cols-2' : ''}`}>
            {profile.ratings.map((r) => (
              <div key={`${r.mapId}@${r.players}`} className="plate flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3" data-players={r.players}>
                <span className="w-full text-xs font-semibold tracking-[0.14em] text-parchment-400 uppercase">
                  {mapName(r.mapId)} · {o.rating.players(r.players)}
                </span>
                <RatingBadge rating={r.rating} provisional={r.provisional} rd={r.rd} games={r.gamesPlayed} className="text-3xl text-brass-100" />
                <span className="text-sm text-parchment-300">
                  {o.rating.games(r.gamesPlayed)} · {o.rating.peak(r.peakRating)}
                </span>
              </div>
            ))}
            {profile.ratings.length === 0 && <p className="plate px-4 py-3 text-sm text-parchment-300">{o.rating.unplaced}</p>}
          </div>

          {profile.historyHidden ? (
            <p className="plate px-5 py-4 text-parchment-300">{pr.historyHidden}</p>
          ) : (
            <>
              <div className="plate flex flex-col gap-2 px-4 py-3">
                <h3 className="font-display text-sm font-bold tracking-[0.12em] text-parchment-200 uppercase">{pr.graphTitle}</h3>
                <RatingGraphs graphs={profile.graphs} />
              </div>

              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(
                  [
                    [pr.stats.games, stats.games],
                    [pr.stats.wins, stats.wins],
                    [pr.stats.winRate, stats.games ? `${Math.round((stats.wins / stats.games) * 100)} %` : '—'],
                    [pr.stats.averagePlace, stats.averagePlace ?? '—'],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="plate flex flex-col px-3 py-2">
                    <dt className="text-xs font-semibold tracking-[0.12em] text-parchment-400 uppercase">{label}</dt>
                    <dd className="font-display text-2xl font-extrabold text-parchment-50 tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="flex flex-col gap-2">
                <h3 className="font-display text-sm font-bold tracking-[0.12em] text-parchment-200 uppercase">{pr.games}</h3>
                {profile.games.length === 0 ? (
                  <p className="plate px-4 py-3 text-sm text-parchment-300">{pr.noGames}</p>
                ) : (
                  <ul className="plate flex flex-col divide-y divide-bronze-500/15 px-4" data-testid="profile-games">
                    {profile.games.map((g) => (
                      <li key={g.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                        <span className="w-16 font-display text-lg font-extrabold text-parchment-50">{g.aborted ? '—' : g.place ? pr.place(g.place) : '—'}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-parchment-100">
                            {[...g.players]
                              .sort((a, b) => (a.place ?? 9) - (b.place ?? 9))
                              .map((p) => displayName(p.username, o.deletedPlayer))
                              .join(', ')}
                          </span>
                          <span className="block text-xs text-parchment-400">
                            {date(g.finishedAt)} · {t.modes[g.mode].name} · {g.aborted ? pr.aborted : g.rated ? o.lists.rated : o.lists.unrated}
                            {g.ratingChange !== null && (
                              <span className={`ml-1 font-display font-bold ${g.ratingChange >= 0 ? 'text-verdigris-300' : 'text-rust-300'}`}>{o.rating.change(g.ratingChange)}</span>
                            )}
                          </span>
                        </span>
                        {g.replayable && !g.aborted && (
                          <Link to={replayPath(g.id)} className="btn btn-ghost min-h-9 px-4 text-sm">
                            {pr.replay}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </>
      )}
    </section>
  )
}

/** Add friend / Requested / Accept or decline / Friends (remove). Nothing on your own profile. */
function FriendButton({ status, onAdd, onRemove, onRespond }: { status: FriendStatus; onAdd: () => void; onRemove: () => void; onRespond: (accept: boolean) => void }) {
  const s = useT().online.social
  if (status === 'self') return null
  const cls = 'btn min-h-9 px-4 text-sm'
  if (status === 'none')
    return (
      <button type="button" className={`${cls} btn-primary`} onClick={onAdd}>
        {s.add}
      </button>
    )
  if (status === 'requested') return <span className="rounded-full border border-bronze-400/50 px-3 py-1 text-xs font-semibold text-parchment-300">{s.requested}</span>
  if (status === 'incoming')
    return (
      <span className="flex gap-2">
        <button type="button" className={`${cls} btn-primary`} onClick={() => onRespond(true)}>
          {s.accept}
        </button>
        <button type="button" className={`${cls} btn-ghost`} onClick={() => onRespond(false)}>
          {s.decline}
        </button>
      </span>
    )
  return (
    <span className="flex items-center gap-2">
      <span className="rounded-full border border-verdigris-300/60 px-3 py-1 text-xs font-semibold text-verdigris-300">{s.isFriend}</span>
      <button type="button" className="text-xs text-parchment-400 underline-offset-2 hover:underline" onClick={onRemove}>
        {s.remove}
      </button>
    </span>
  )
}

/** The rating graph, one per player count played (a tab for each when there are several). */
function RatingGraphs({ graphs }: { graphs: Profile['graphs'] }) {
  const t = useT()
  const o = t.online
  const pr = o.profile
  const counts = RATED_PLAYER_COUNTS.filter((n) => graphs[n]?.length)
  const [chosen, setChosen] = useState<RatedPlayers | null>(null)
  const shown = chosen && counts.includes(chosen) ? chosen : counts[0]
  if (!shown) return <p className="text-sm text-parchment-400">{pr.graphEmpty}</p>
  const points = graphs[shown]!
  return (
    <>
      {counts.length > 1 && (
        <div role="tablist" aria-label={pr.graphTitle} className="flex gap-1">
          {counts.map((n) => (
            <button
              key={n}
              type="button"
              role="tab"
              aria-selected={n === shown}
              onClick={() => setChosen(n)}
              className={`min-h-8 rounded-md border px-2.5 text-xs font-semibold tracking-[0.08em] uppercase ${n === shown ? 'border-brass-300/70 bg-brass-300/15 text-parchment-50' : 'border-bronze-500/30 text-parchment-300 hover:text-parchment-50'}`}
            >
              {o.rating.players(n)}
            </button>
          ))}
        </div>
      )}
      <RatingGraph points={points} label={`${o.rating.players(shown)}: ${pr.graphLabel(points.length)}`} />
    </>
  )
}
