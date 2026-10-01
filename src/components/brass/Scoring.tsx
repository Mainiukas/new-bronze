/**
 * The scoring screens. At the end of the canal era: each player's links and
 * flipped tiles count up into their VP before the canals come off the board.
 * At the end of the game: the winner's banner, then every player's rail-era
 * links and tiles, their money (+1 VP per £10), the total, how ties were
 * broken, and (rated online games) each rating change; then Rematch or Back
 * to the lobby.
 */

import { useEffect, useId, useState } from 'react'
import { useT } from '../../i18n'
import { MONEY_PER_VP } from '../../rules/config/game'
import type { GameState } from '../../rules/state'
import { Dialog } from '../Dialog'
import { motionOff } from './flights'
import { Coin, VpHex } from './Symbols'
import { tieBreaks } from './tieBreaks'

/** A number that counts up from `from` to `to`, starting after `delay` ms (at once when motion is off). */
function useCountUp(from: number, to: number, delay: number, duration = 900): number {
  const instant = motionOff() || from === to
  const [value, setValue] = useState(instant ? to : from)
  useEffect(() => {
    if (instant) return
    let frame = 0
    let start = 0
    const tick = (time: number) => {
      if (!start) start = time + delay
      const k = Math.min(1, Math.max(0, (time - start) / duration))
      setValue(Math.round(from + (to - from) * (1 - (1 - k) ** 3)))
      if (k < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [from, to, delay, duration, instant])
  return instant ? to : value
}

function Counter({ from = 0, to, delay, className = '' }: { from?: number; to: number; delay: number; className?: string }) {
  const value = useCountUp(from, to, delay)
  return <span className={`tabular-nums ${className}`}>{value}</span>
}

/** The VP badge, counting up to the final score. */
function AnimatedVp({ from, to, delay, label }: { from: number; to: number; delay: number; label: string }) {
  const value = useCountUp(from, to, delay)
  return <VpHex value={value} size="sm" label={label} />
}

/** Each player's scores in the era that just ended (links, flipped tiles), from the log. */
function eraScoresOf(state: GameState, era: 'canal' | 'rail') {
  const entry = state.log.findLast((e) => e.kind === 'era-end' && e.era === era)
  return entry?.kind === 'era-end' ? entry.scores : []
}

/* ---- End of the canal era ------------------------------------------------------- */

export function EraScoring({ open, state, colorOf, onClose }: { open: boolean; state: GameState; colorOf: (p: number) => string; onClose: () => void }) {
  const t = useT()
  const s = t.brass.scoring
  const id = useId()
  const scores = eraScoresOf(state, 'canal')
  // VP before the canal scoring: what they have now, less what the era gave.
  const before = (p: number) => state.players[p].vp - (scores.find((x) => x.player === p)?.links ?? 0) - (scores.find((x) => x.player === p)?.tiles ?? 0)
  const step = motionOff() ? 0 : 500
  return (
    <Dialog open={open} onClose={onClose} labelledBy={id}>
      <div className="plate rivets flex w-[min(34rem,92vw)] flex-col gap-4 bg-soot-900/[0.98] p-6" data-testid="era-scoring">
        <h2 id={id} className="font-display text-3xl font-extrabold tracking-[0.1em] text-parchment-50 uppercase">
          {s.canalTitle}
        </h2>
        <p className="text-sm text-parchment-300">{s.canalIntro}</p>
        <table className="w-full text-sm">
          <thead className="text-left font-display text-[0.65rem] tracking-[0.14em] text-parchment-400 uppercase">
            <tr>
              <th className="py-1 font-semibold">{s.player}</th>
              <th className="py-1 text-right font-semibold">{s.links}</th>
              <th className="py-1 text-right font-semibold">{s.tiles}</th>
              <th className="py-1 text-right font-semibold">{s.total}</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((row, i) => (
              <tr key={row.player} className="border-t border-bronze-500/20">
                <td className="py-1.5">
                  <span className="flex items-center gap-2 font-semibold text-parchment-50">
                    <span className="size-3.5 rounded-full border border-black" style={{ background: colorOf(row.player) }} aria-hidden="true" />
                    {state.players[row.player].name}
                  </span>
                </td>
                <td className="py-1.5 text-right font-display font-bold text-parchment-100">
                  +<Counter to={row.links} delay={i * step} />
                </td>
                <td className="py-1.5 text-right font-display font-bold text-parchment-100">
                  +<Counter to={row.tiles} delay={i * step + step / 2} />
                </td>
                <td className="py-1.5 text-right">
                  <span className="inline-flex items-center gap-1.5 font-display text-lg font-extrabold text-brass-100">
                    <Counter from={before(row.player)} to={state.players[row.player].vp} delay={i * step + step} />
                    <span className="text-xs font-semibold text-parchment-400">{s.total}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-parchment-400">{s.canalAfter}</p>
        <div className="flex justify-end">
          <button type="button" className="btn btn-primary px-6" onClick={onClose} autoFocus>
            {s.toRail}
          </button>
        </div>
      </div>
    </Dialog>
  )
}

/* ---- End of the game ------------------------------------------------------------ */

export interface RatingChange {
  before: number
  after: number
  delta: number
}

export function FinalScreen({
  open,
  state,
  colorOf,
  ratings,
  extra,
  onClose,
  onRematch,
  onLeave,
  leaveLabel,
}: {
  open: boolean
  state: GameState
  colorOf: (p: number) => string
  /** Rated online games: each player's rating change, by player. */
  ratings?: Record<number, RatingChange>
  /** Anything else to show (e.g. a local match's unlocked badges). */
  extra?: React.ReactNode
  onClose: () => void
  onRematch: () => void
  onLeave: () => void
  leaveLabel?: string
}) {
  const t = useT()
  const b = t.brass
  const s = b.scoring
  const id = useId()
  const ranking = state.ranking ?? []
  const rail = eraScoresOf(state, 'rail')
  const winner = ranking[0]
  const step = motionOff() ? 0 : 450
  const ties = tieBreaks(state)
  return (
    <Dialog open={open} onClose={onClose} labelledBy={id}>
      <div className="plate rivets flex w-[min(44rem,94vw)] flex-col gap-4 bg-soot-900/[0.98] p-5 sm:p-6" data-testid="final-screen">
        <p className="font-display text-xs font-bold tracking-[0.2em] text-parchment-400 uppercase">{b.gameOver}</p>
        {winner !== undefined && (
          // The winner's banner.
          <div
            className="relative overflow-hidden rounded-lg border-2 border-brass-300/80 bg-linear-to-b from-bronze-500/40 to-bronze-800/40 px-5 py-4 text-center shadow-[0_0_30px_-6px_rgb(240_215_138/0.6)]"
            style={{ animation: motionOff() ? undefined : 'toast-in 500ms ease-out both' }}
          >
            <h2 id={id} className="font-display text-3xl font-extrabold tracking-[0.12em] text-brass-100 uppercase sm:text-4xl">
              {b.wins(state.players[winner].name)}
            </h2>
            <p className="mt-1 text-sm text-parchment-200">{s.winnerLine(state.players[winner].vp)}</p>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left font-display text-[0.65rem] tracking-[0.14em] text-parchment-400 uppercase">
              <tr>
                <th className="py-1 font-semibold">#</th>
                <th className="py-1 font-semibold">{s.player}</th>
                <th className="hidden py-1 text-right font-semibold sm:table-cell">{s.links}</th>
                <th className="hidden py-1 text-right font-semibold sm:table-cell">{s.tiles}</th>
                <th className="py-1 text-right font-semibold">{s.money}</th>
                <th className="py-1 text-right font-semibold">{s.total}</th>
                {ratings && <th className="py-1 text-right font-semibold">{s.rating}</th>}
              </tr>
            </thead>
            <tbody>
              {ranking.map((p, i) => {
                const player = state.players[p]
                const row = rail.find((x) => x.player === p)
                const moneyVp = Math.floor(player.money / MONEY_PER_VP)
                const r = ratings?.[p]
                return (
                  <tr key={p} className={`border-t border-bronze-500/20 ${i === 0 ? 'bg-brass-300/10' : ''}`}>
                    <td className="py-1.5 font-display font-bold text-parchment-300">{i + 1}</td>
                    <td className="py-1.5">
                      <span className="flex items-center gap-2 font-semibold text-parchment-50">
                        <span className="size-3.5 rounded-full border border-black" style={{ background: colorOf(p) }} aria-hidden="true" />
                        {player.name}
                      </span>
                    </td>
                    <td className="hidden py-1.5 text-right font-display font-bold text-parchment-100 sm:table-cell">+{row?.links ?? 0}</td>
                    <td className="hidden py-1.5 text-right font-display font-bold text-parchment-100 sm:table-cell">+{row?.tiles ?? 0}</td>
                    <td className="py-1.5 text-right text-parchment-200" title={s.moneyRule(MONEY_PER_VP)}>
                      <span className="inline-flex items-center gap-1">
                        <Coin className="size-3.5" />£{player.money} → <span className="font-display font-bold text-parchment-50">+{moneyVp}</span>
                      </span>
                    </td>
                    <td className="py-1.5 text-right">
                      <AnimatedVp from={player.vp - moneyVp - (row?.links ?? 0) - (row?.tiles ?? 0)} to={player.vp} delay={i * step} label={b.finalVp(player.vp)} />
                    </td>
                    {ratings && (
                      <td className="py-1.5 text-right font-display font-bold tabular-nums">
                        {r ? (
                          <span className={r.delta >= 0 ? 'text-verdigris-200' : 'text-rust-300'}>
                            {Math.round(r.after)} ({r.delta >= 0 ? '+' : ''}
                            {Math.round(r.delta)})
                          </span>
                        ) : (
                          <span className="text-parchment-500">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <ul className="flex flex-col gap-0.5 text-xs text-parchment-300">
          <li>{s.moneyRule(MONEY_PER_VP)}</li>
          {ties.map((tie) => (
            <li key={`${tie.winner}-${tie.loser}`} className="text-brass-200">
              {s.tie[tie.by](state.players[tie.winner].name, state.players[tie.loser].name)}
            </li>
          ))}
          {!ties.length && <li>{s.tieRule}</li>}
        </ul>
        {extra}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onLeave}>
            {leaveLabel ?? b.leave}
          </button>
          <button type="button" className="btn btn-primary px-6" onClick={onRematch}>
            {b.rematch}
          </button>
        </div>
      </div>
    </Dialog>
  )
}
