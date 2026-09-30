/**
 * The distant cotton market beside the board: the market track as a zig-zag
 * path of spaces from the top down to X, the income printed at each row, the
 * marker on its space, the face-down stack of tiles still to flip and the
 * last tile flipped. When a sale reaches X the market closes for the era and
 * the panel greys out. The marker walks down step by step when it moves.
 */

import { useLayoutEffect, useRef } from 'react'
import { useT } from '../../i18n'
import type { RulesContext } from '../../rules/engine'
import type { GameState } from '../../rules/state'
import { INDUSTRY_ICON_URLS } from '../board/assets'
import { motionOff } from './flights'

const WIDTH = 150
const ROW = 22
const TOP = 12
const X_LEFT = 34
const X_RIGHT = 116

/** Centre of a track row (the path zig-zags left and right). */
function trackPoint(row: number) {
  return { x: row % 2 === 0 ? X_LEFT : X_RIGHT, y: TOP + row * ROW }
}

/** A distant-market tile: face down (the cotton bale) or face up (its value, 0 to −4). */
export function DistantTile({ move, className = 'size-8' }: { move: number | null; className?: string }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-full border-2 border-brass-300/80 shadow-[0_2px_4px_rgb(0_0_0/0.6)] ${move === null ? 'bg-radial from-[#5a4526] to-[#241a0e]' : 'bg-radial from-[#f3e6c4] to-[#cbb58a]'} ${className}`}>
      {move === null ? (
        <img src={INDUSTRY_ICON_URLS.cotton} alt="" className="size-3/5 object-contain opacity-80" />
      ) : (
        <span className="font-display text-sm font-extrabold text-[#3a2410] tabular-nums">{move === 0 ? '0' : `−${move}`}</span>
      )}
    </span>
  )
}

export function DistantMarketPanel({ state, ctx, speed }: { state: GameState; ctx: RulesContext; speed: number }) {
  const t = useT()
  const b = t.brass
  const track = ctx.data.distantMarket.track
  const { marker, closed, deck, used } = state.distant
  const height = TOP * 2 + (track.length - 1) * ROW
  const markerRef = useRef<HTMLSpanElement>(null)
  const lastMarker = useRef(marker)

  // The marker walks down the track one row at a time.
  useLayoutEffect(() => {
    const from = lastMarker.current
    lastMarker.current = marker
    const el = markerRef.current
    if (!el || marker <= from || speed <= 0 || motionOff()) return
    const to = trackPoint(marker)
    const frames = []
    for (let row = from; row <= marker; row++) {
      const p = trackPoint(row)
      frames.push({ transform: `translate(${p.x - to.x}px, ${p.y - to.y}px)` })
    }
    el.animate(frames, { duration: 380 * (marker - from) * speed, delay: 900 * speed, easing: 'ease-in-out', fill: 'backwards' })
  }, [marker, speed])

  const at = trackPoint(Math.min(marker, track.length - 1))
  const lastUsed = used.at(-1)
  const path = track.map((_, row) => trackPoint(row)).map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ')
  return (
    <section aria-label={b.distantTitle} className={`relative flex flex-col gap-1.5 rounded-lg border border-bronze-500/40 bg-soot-950/80 p-2 ${closed ? 'grayscale' : ''}`}>
      <h2 className="font-display text-[0.65rem] font-bold tracking-[0.12em] text-parchment-300 uppercase">{b.distantTitle}</h2>
      <div className="flex items-start gap-2">
        <div className="relative shrink-0" style={{ width: WIDTH, height }}>
          <svg viewBox={`0 0 ${WIDTH} ${height}`} width={WIDTH} height={height} aria-hidden="true" className="absolute inset-0">
            <path d={path} fill="none" stroke="#8a6a3a" strokeWidth={3} strokeLinejoin="round" strokeDasharray="1 5" strokeLinecap="round" />
            {track.map((income, row) => {
              const p = trackPoint(row)
              const x = income === 'X'
              return (
                <g key={row}>
                  <circle cx={p.x} cy={p.y} r={9} fill={x ? '#5a1510' : '#231a12'} stroke={x ? '#d0453a' : '#b98c48'} strokeWidth={1.5} />
                  <text x={p.x} y={p.y + 3.5} textAnchor="middle" fontSize={10} fontWeight={700} fill={x ? '#ffb3a8' : '#f1e2c0'} fontFamily="var(--font-display)">
                    {x ? 'X' : income}
                  </text>
                </g>
              )
            })}
          </svg>
          <span
            ref={markerRef}
            id="distant-marker"
            role="img"
            aria-label={b.distantMarker(marker + 1, track.length)}
            className="absolute size-5 rounded-full border-2 border-soot-950 bg-radial from-[#fff2b0] to-[#c98e1f] shadow-[0_0_8px_2px_rgb(255_214_107/0.6)]"
            style={{ left: at.x - 10, top: at.y - 10 }}
          />
        </div>
        <div className="flex flex-col items-center gap-2 pt-1">
          <span id="distant-stack" className="relative" role="img" aria-label={b.distantStack(deck.length)} title={b.distantStack(deck.length)}>
            {deck.length > 1 && <DistantTile move={null} className="absolute top-1 left-1 size-8 opacity-70" />}
            <DistantTile move={null} className={`relative size-8 ${deck.length ? '' : 'opacity-25'}`} />
            <span className="absolute -right-2 -bottom-1 rounded-full bg-soot-950 px-1 text-[0.6rem] font-bold text-parchment-100 tabular-nums">{deck.length}</span>
          </span>
          <span id="distant-used" role="img" aria-label={lastUsed === undefined ? b.distantNoneFlipped : b.distantLastFlipped(ctx.data.distantMarket.tiles[lastUsed].move)} title={lastUsed === undefined ? b.distantNoneFlipped : b.distantLastFlipped(ctx.data.distantMarket.tiles[lastUsed].move)}>
            {lastUsed === undefined ? <span className="block size-8 rounded-full border border-dashed border-bronze-400/50" /> : <DistantTile move={ctx.data.distantMarket.tiles[lastUsed].move} />}
          </span>
        </div>
      </div>
      {closed && <p className="rounded bg-ember-700/80 px-1.5 py-0.5 text-center text-[0.7rem] font-bold text-parchment-50">{b.distantClosed}</p>}
    </section>
  )
}
