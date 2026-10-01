/**
 * The distant cotton market beside the board, drawn like the board's own
 * track: a tall riveted iron plaque hanging from a bracket. Four income rows,
 * £3 at the top down to £0, each with a coin-stack badge and two round
 * spaces; below them the X row: a big engraved X in the badges' column, and
 * one last space straight below the last £0 space. An engraved zig-zag line
 * joins the spaces in the order the marker walks them (the track in
 * config/distantMarket.ts; its last step, down to X, is a straight vertical), and a small plate at the bottom shows a cotton
 * mill. The plaque fills the height it is given.
 *
 * The marker hops along the line one space at a time once the flipped tile
 * has landed on the face-up pile beside the plaque. When a sale reaches X the
 * market closes for the era: the plaque greys out and a padlock hangs on it.
 */

import { useLayoutEffect, useRef, useState } from 'react'
import { useT } from '../../i18n'
import type { DistantSpaceId } from '../../rules/config/distantMarket'
import type { RulesContext } from '../../rules/engine'
import type { GameState } from '../../rules/state'
import { INDUSTRY_ICON_URLS } from '../board/assets'
import { motionOff } from './flights'

/* The plaque's drawing, in viewBox units: a fixed width, a height that follows the space it fills. */
const W = 172
const MIN_H = 380
const MAX_H = 640
const BADGE_X = 36
const COLUMN = { a: 96, b: 146 } as const
const SPACE_R = 17
const TOP = 18
/** How long a flipped tile takes to reach the pile (flights.ts: rise, hold, leave). */
const TILE_FLIGHT = 450 + 900 + 420
/** The played card goes to the discard pile first (useCardFlights: yours, another player's). */
const CARD_FLIGHT = { mine: 300, theirs: 1100 }
const HOP = 150

/** Row 0 is £3 at the top, row 4 the X row. */
const rowOf = (space: DistantSpaceId) => (space === 'X' ? 4 : 3 - Number(space[0]))

function geometry(h: number, track: readonly DistantSpaceId[]) {
  // X sits in the column of the space before it (the last £0 space), straight below it.
  const beforeX = track[track.indexOf('X') - 1]
  const xColumn = COLUMN[(beforeX?.[1] ?? 'a') as 'a' | 'b']
  const plateH = 44
  const top = TOP + 18
  const bottom = h - 6 - plateH - 14
  const step = (bottom - top) / 5
  const rowY = (row: number) => top + step * (row + 0.5)
  const point = (space: DistantSpaceId) => ({ x: space === 'X' ? xColumn : COLUMN[space[1] as 'a' | 'b'], y: rowY(rowOf(space)) })
  return { rowY, point, plate: { y: h - 6 - plateH - 6, h: plateH } }
}

/** The plaque's height (viewBox units) for a box of this size, as tall as the box allows, and its drawn width in pixels. */
function useFill() {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ h: 460, px: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const { width, height } = el.getBoundingClientRect()
      if (width <= 0 || height <= 0) return
      const h = Math.round(Math.max(MIN_H, Math.min(MAX_H, (W * height) / width)))
      setSize({ h, px: Math.min(width, (height * W) / h) })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, size.h, size.px] as const
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

/** The coin-stack badge of an income row: gold coins (as coin.svg), the income on the top one. */
function CoinStack({ x, y, income }: { x: number; y: number; income: number }) {
  const r = 15
  return (
    <g>
      {[3, 2, 1].map((k) => (
        <g key={k}>
          <ellipse cx={x} cy={y + k * 4 + 2} rx={r} ry={r * 0.42} fill="#8a5a10" stroke="#4a2f06" strokeWidth={1} />
          <ellipse cx={x} cy={y + k * 4} rx={r} ry={r * 0.42} fill="#d9a22c" stroke="#5a3a08" strokeWidth={1} />
        </g>
      ))}
      <circle cx={x} cy={y} r={r} fill="url(#dm-coin)" stroke="#5a3a08" strokeWidth={1.6} />
      <circle cx={x} cy={y} r={r - 4} fill="none" stroke="#8a5a10" strokeWidth={0.8} />
      <text x={x} y={y + 6} textAnchor="middle" fontSize={17} fontWeight={800} fill="#5a3606" stroke="#fde7a0" strokeWidth={0.5} fontFamily="Georgia, serif">
        {income}
      </text>
    </g>
  )
}

/** A recessed round space with a thin brass ring. */
function Space({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y + 1} r={SPACE_R + 1.5} fill="#5b4a36" opacity={0.55} />
      <circle cx={x} cy={y} r={SPACE_R} fill="url(#dm-hole)" stroke="#c9a15a" strokeWidth={1.4} />
      <circle cx={x} cy={y} r={SPACE_R - 3} fill="none" stroke="#000" strokeOpacity={0.45} strokeWidth={1.5} />
    </g>
  )
}

/** An engraved stroke: a dark groove with a faint lit lower edge. */
function Engraved({ d, width }: { d: string; width: number }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke="#8d7a60" strokeOpacity={0.55} strokeWidth={width} transform="translate(0 1.2)" />
      <path d={d} stroke="#0b0907" strokeWidth={width} />
    </g>
  )
}

function Padlock({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 28" aria-hidden="true" className={className}>
      <path d="M6 12V8a6 6 0 0 1 12 0v4" fill="none" stroke="#d9b877" strokeWidth={3} />
      <rect x={2} y={12} width={20} height={15} rx={3} fill="#b98c48" stroke="#3a2410" strokeWidth={1.5} />
      <circle cx={12} cy={18} r={2.2} fill="#2a1c0c" />
      <path d="M12 19v4" stroke="#2a1c0c" strokeWidth={2} />
    </svg>
  )
}

export function DistantMarketPanel({ state, ctx, me, speed }: { state: GameState; ctx: RulesContext; me: number; speed: number }) {
  const t = useT()
  const b = t.brass
  const { spaces, track, tiles } = ctx.data.distantMarket
  const { marker, closed, deck, used } = state.distant
  const [box, h, plaqueWidth] = useFill()
  const { rowY, point, plate } = geometry(h, spaces)
  const markerRef = useRef<SVGGElement>(null)
  const plaqueRef = useRef<SVGSVGElement>(null)
  const lockRef = useRef<HTMLSpanElement>(null)
  const closedRef = useRef<HTMLParagraphElement>(null)
  const last = useRef({ marker, closed })

  // After the flipped tile lands, the marker hops along the path one space at a
  // time; when it reaches X, the plaque then greys out and the padlock drops on.
  useLayoutEffect(() => {
    const from = last.current
    last.current = { marker, closed }
    if (speed <= 0 || motionOff()) return
    const moved = marker > from.marker
    // A sale with a card waits for the card to reach the discard pile, then the tile.
    const sale = state.log.findLastIndex((e) => e.kind === 'sell-failed' || (e.kind === 'sell' && e.distant))
    const before = state.log[sale - 1]
    const card = before?.kind === 'discard' ? (before.player === me ? CARD_FLIGHT.mine : CARD_FLIGHT.theirs) : 0
    const delay = (card + TILE_FLIGHT) * speed
    const hops = marker - from.marker
    const el = markerRef.current
    if (moved && el) {
      const at = (i: number, lift = 0) => {
        const p = point(spaces[i])
        return `translate(${p.x}px, ${p.y - lift}px)`
      }
      const frames: Keyframe[] = [{ transform: at(from.marker), offset: 0 }]
      for (let k = 1; k <= hops; k++) {
        const a = point(spaces[from.marker + k - 1])
        const c = point(spaces[from.marker + k])
        frames.push({ transform: `translate(${(a.x + c.x) / 2}px, ${(a.y + c.y) / 2 - 10}px)`, offset: (k - 0.5) / hops })
        frames.push({ transform: at(from.marker + k), offset: k / hops })
      }
      el.animate(frames, { duration: HOP * hops * speed, delay, easing: 'ease-in-out', fill: 'backwards' })
    }
    if (closed && !from.closed) {
      const shut = delay + (moved ? HOP * hops * speed : 0)
      plaqueRef.current?.animate([{ filter: 'none' }, { filter: 'grayscale(0.9) brightness(0.72)' }], { duration: 450 * speed, delay: shut, fill: 'backwards' })
      closedRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 * speed, delay: shut, fill: 'backwards' })
      lockRef.current?.animate([{ opacity: 0, transform: 'translateY(-10px)' }, { opacity: 1, transform: 'none' }], { duration: 320 * speed, delay: shut + 200 * speed, easing: 'cubic-bezier(.3,1.4,.5,1)', fill: 'backwards' })
    }
    // `point` follows `h`, which only changes on resize; the animation is about the marker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marker, closed, speed, me])

  const here = Math.min(marker, spaces.length - 1)
  const at = point(spaces[here])
  const income = track[here]
  const line = spaces.map((s, i) => `${i ? 'L' : 'M'}${point(s).x} ${point(s).y}`).join(' ')
  const lastUsed = used.at(-1)
  const lastMove = lastUsed === undefined ? null : tiles[lastUsed].move
  const incomeRows = spaces.filter((s) => s !== 'X' && s.endsWith('a'))
  const xRow = rowY(4)

  return (
    <section aria-label={closed ? `${b.distantTitle}: ${b.distantClosed}` : b.distantTitle} className="flex h-[27rem] w-full flex-col gap-1.5 rounded-lg border border-bronze-500/40 bg-soot-950/80 p-2 lg:h-auto lg:min-h-[21rem] lg:flex-1">
      <h2 className="font-display text-[0.65rem] font-bold tracking-[0.12em] text-parchment-300 uppercase">{b.distantTitle}</h2>
      <div className="flex min-h-0 flex-1 gap-1.5">
        <div ref={box} className="relative min-h-0 min-w-0 flex-1">
          <svg
            ref={plaqueRef}
            viewBox={`0 0 ${W} ${h}`}
            preserveAspectRatio="xMaxYMid meet"
            className="absolute inset-0 size-full"
            style={closed ? { filter: 'grayscale(0.9) brightness(0.72)' } : undefined}
            role="img"
            aria-label={b.distantMarker(here + 1, spaces.length, income === 'X' ? null : income)}
          >
            <defs>
              <linearGradient id="dm-iron" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#3b3833" />
                <stop offset="0.5" stopColor="#24221f" />
                <stop offset="1" stopColor="#171513" />
              </linearGradient>
              <radialGradient id="dm-hole" cx="0.5" cy="0.4" r="0.6">
                <stop offset="0" stopColor="#0a0807" />
                <stop offset="0.8" stopColor="#1c1814" />
                <stop offset="1" stopColor="#2c251d" />
              </radialGradient>
              <radialGradient id="dm-coin" cx="0.38" cy="0.32" r="0.75">
                <stop offset="0" stopColor="#fff2b0" />
                <stop offset="0.45" stopColor="#f2c043" />
                <stop offset="1" stopColor="#a86a12" />
              </radialGradient>
              <radialGradient id="dm-rivet" cx="0.35" cy="0.3" r="0.7">
                <stop offset="0" stopColor="#e9d3a0" />
                <stop offset="1" stopColor="#6b4e22" />
              </radialGradient>
              <radialGradient id="dm-marker" cx="0.38" cy="0.32" r="0.75">
                <stop offset="0" stopColor="#fff6cf" />
                <stop offset="0.5" stopColor="#e7b34a" />
                <stop offset="1" stopColor="#8a5a10" />
              </radialGradient>
            </defs>

            {/* The hanging bracket. */}
            <path d={`M${W / 2 - 26} ${TOP + 2} L${W / 2 - 12} 8 H${W / 2 + 12} L${W / 2 + 26} ${TOP + 2}`} fill="none" stroke="#9a7a45" strokeWidth={3} strokeLinejoin="round" />
            <circle cx={W / 2} cy={7} r={5} fill="none" stroke="#c9a15a" strokeWidth={2.4} />

            {/* The plaque: dark riveted iron with a brass edge. */}
            <rect x={3} y={TOP} width={W - 6} height={h - TOP - 3} rx={9} fill="url(#dm-iron)" stroke="#b98c48" strokeWidth={2.5} />
            <rect x={8} y={TOP + 5} width={W - 16} height={h - TOP - 13} rx={6} fill="none" stroke="#000" strokeOpacity={0.5} strokeWidth={1.2} />
            {[
              [12, TOP + 9],
              [W - 12, TOP + 9],
              [12, h - 12],
              [W - 12, h - 12],
            ].map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r={3.2} fill="url(#dm-rivet)" stroke="#2a1c0c" strokeWidth={0.8} />
            ))}

            {/* The engraved path, then the spaces on it. */}
            <Engraved d={line} width={4.5} />
            {incomeRows.map((s) => (
              <CoinStack key={s} x={BADGE_X} y={rowY(rowOf(s)) - 4} income={Number(s[0])} />
            ))}
            <g data-distant-x>
              <Engraved d={`M${BADGE_X - 16} ${xRow - 16} L${BADGE_X + 16} ${xRow + 16} M${BADGE_X + 16} ${xRow - 16} L${BADGE_X - 16} ${xRow + 16}`} width={7.5} />
            </g>
            {spaces.map((s) => {
              const p = point(s)
              return <Space key={s} x={p.x} y={p.y} />
            })}

            {/* The plate at the bottom: a cotton mill. */}
            <rect x={W / 2 - 34} y={plate.y} width={68} height={plate.h} rx={5} fill="#3a2a17" stroke="#c9a15a" strokeWidth={1.5} />
            <image href={INDUSTRY_ICON_URLS.cotton} x={W / 2 - 18} y={plate.y + plate.h / 2 - 18} width={36} height={36} preserveAspectRatio="xMidYMid meet" />
            {[W / 2 - 29, W / 2 + 29].map((x) => (
              <circle key={x} cx={x} cy={plate.y + plate.h / 2} r={2} fill="url(#dm-rivet)" />
            ))}

            {/* The marker. */}
            <g id="distant-marker" ref={markerRef} style={{ transform: `translate(${at.x}px, ${at.y}px)` }}>
              <circle r={13} fill="#000" opacity={0.45} cy={2} />
              <circle r={12.5} fill="url(#dm-marker)" stroke="#2a1a06" strokeWidth={2} />
              <circle r={7} fill="none" stroke="#fff3c4" strokeOpacity={0.55} strokeWidth={1.2} />
            </g>
          </svg>
          {closed && (
            <span ref={lockRef} className="absolute top-[1%] w-6 translate-x-1/2 drop-shadow-[0_2px_3px_rgb(0_0_0/0.8)]" style={{ right: plaqueWidth / 2 }} title={b.distantClosed}>
              <Padlock className="w-full" />
            </span>
          )}
        </div>

        {/* Beside the plaque: the face-down stack, and the face-up pile of tiles flipped this era. */}
        <div className="flex w-10 shrink-0 flex-col items-center gap-3 pt-3">
          <span id="distant-stack" className="relative" role="img" aria-label={b.distantStack(deck.length)} title={b.distantStack(deck.length)}>
            {deck.length > 1 && <DistantTile move={null} className="absolute top-1 left-0.5 size-9 opacity-70" />}
            <DistantTile move={null} className={`relative size-9 ${deck.length ? '' : 'opacity-25'}`} />
            <span className="absolute -right-1.5 -bottom-1 rounded-full bg-soot-950 px-1 text-[0.6rem] font-bold text-parchment-100 tabular-nums">{deck.length}</span>
          </span>
          <span
            id="distant-used"
            className="relative"
            role="img"
            aria-label={lastMove === null ? b.distantNoneFlipped : b.distantLastFlipped(lastMove)}
            title={lastMove === null ? b.distantNoneFlipped : b.distantLastFlipped(lastMove)}
          >
            {lastMove === null ? (
              <span className="block size-9 rounded-full border border-dashed border-bronze-400/50" />
            ) : (
              <>
                {used.slice(-3, -1).map((i, k, below) => (
                  <DistantTile key={k} move={tiles[i].move} className={`absolute size-9 opacity-60 ${below.length - k === 1 ? 'top-1 left-0.5' : 'top-2 left-1'}`} />
                ))}
                <DistantTile move={lastMove} className="relative size-9" />
              </>
            )}
          </span>
        </div>
      </div>
      {closed && <p ref={closedRef} className="rounded bg-ember-700/80 px-1.5 py-0.5 text-center text-[0.7rem] font-bold text-parchment-50">{b.distantClosed}</p>}
    </section>
  )
}
