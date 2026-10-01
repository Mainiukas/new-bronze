/**
 * A player's rating over their rated games: one line (one series, so no
 * legend: the heading names it), the current rating labelled at its end, a
 * few recessive gridlines, and a crosshair with a tooltip on hover or
 * keyboard focus (arrow keys step through the games). A table of the same
 * points is there for screen readers.
 */

import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useT } from '../i18n'

export interface RatingPoint {
  at: number
  rating: number
  delta: number
}

const HEIGHT = 200
const PAD = { top: 16, right: 52, bottom: 26, left: 44 }

/** Gridline values: a round step that gives 3–5 lines across [min, max]. */
function ticks(min: number, max: number): number[] {
  const span = Math.max(1, max - min)
  const step = [25, 50, 100, 200, 250, 500].find((s) => span / s <= 4) ?? 1000
  const out: number[] = []
  for (let v = Math.ceil(min / step) * step; v <= max; v += step) out.push(v)
  return out
}

export function RatingGraph({ points, label }: { points: RatingPoint[]; label: string }) {
  const t = useT()
  const id = useId()
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(600)
  const [active, setActive] = useState<number | null>(null)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const observer = new ResizeObserver(() => setWidth(Math.max(240, el.clientWidth)))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const values = points.map((p) => p.rating)
  const lo = Math.floor((Math.min(...values) - 20) / 25) * 25
  const hi = Math.ceil((Math.max(...values) + 20) / 25) * 25
  const plotW = width - PAD.left - PAD.right
  const plotH = HEIGHT - PAD.top - PAD.bottom
  const x = (i: number) => PAD.left + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW)
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * plotH
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.rating).toFixed(1)}`).join(' ')
  const last = points.length - 1
  const date = (ms: number) => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

  const pick = (clientX: number) => {
    const rect = box.current!.getBoundingClientRect()
    const rel = clientX - rect.left - PAD.left
    setActive(Math.max(0, Math.min(last, Math.round(points.length === 1 ? 0 : (rel / plotW) * last))))
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') setActive((a) => Math.max(0, (a ?? last) - 1))
    else if (e.key === 'ArrowRight') setActive((a) => Math.min(last, (a ?? last) + 1))
    else return
    e.preventDefault()
  }
  const a = active === null ? null : points[active]

  return (
    <div ref={box} className="relative w-full" data-testid="rating-graph">
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={label}
        tabIndex={0}
        onKeyDown={onKey}
        onFocus={() => setActive((v) => v ?? last)}
        onBlur={() => setActive(null)}
        onPointerMove={(e) => pick(e.clientX)}
        onPointerLeave={() => setActive(null)}
        className="block touch-pan-y outline-none focus-visible:outline-2 focus-visible:outline-brass-200"
      >
        {/* Gridlines and their values: recessive. */}
        {ticks(lo, hi).map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} stroke="var(--color-bronze-500)" strokeOpacity={0.22} strokeWidth={1} />
            <text x={PAD.left - 8} y={y(v)} dy="0.32em" textAnchor="end" fill="var(--color-parchment-400)" fontSize={11} className="tabular-nums">
              {v}
            </text>
          </g>
        ))}
        <text x={PAD.left} y={HEIGHT - 6} fill="var(--color-parchment-400)" fontSize={11}>
          {date(points[0].at)}
        </text>
        <text x={width - PAD.right} y={HEIGHT - 6} textAnchor="end" fill="var(--color-parchment-400)" fontSize={11}>
          {date(points[last].at)}
        </text>
        {/* The rating: one 2 px line, the latest point marked and labelled. */}
        <path d={path} fill="none" stroke="var(--color-brass-300)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(last)} cy={y(points[last].rating)} r={4} fill="var(--color-brass-300)" stroke="var(--color-soot-950)" strokeWidth={2} />
        <text x={x(last) + 8} y={y(points[last].rating)} dy="0.32em" fill="var(--color-parchment-50)" fontSize={12} fontWeight={700} className="tabular-nums">
          {points[last].rating}
        </text>
        {a && active !== null && (
          <g pointerEvents="none">
            <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={HEIGHT - PAD.bottom} stroke="var(--color-parchment-300)" strokeOpacity={0.5} strokeWidth={1} />
            <circle cx={x(active)} cy={y(a.rating)} r={5} fill="var(--color-brass-200)" stroke="var(--color-soot-950)" strokeWidth={2} />
          </g>
        )}
      </svg>
      {a && active !== null && (
        <div
          role="status"
          className="pointer-events-none absolute top-1 z-10 rounded-md border border-bronze-400/60 bg-soot-950/[0.97] px-2.5 py-1.5 text-xs whitespace-nowrap text-parchment-100 shadow-xl"
          style={{ left: Math.min(Math.max(x(active) - 70, 0), width - 150) }}
        >
          <span className="font-display text-sm font-bold tabular-nums">{a.rating}</span>{' '}
          <span className={a.delta >= 0 ? 'text-verdigris-300' : 'text-rust-300'}>{t.online.rating.change(a.delta)}</span>
          <span className="text-parchment-400"> · {date(a.at)}</span>
        </div>
      )}
      {/* The same numbers as a table, for screen readers. */}
      <table className="sr-only" aria-labelledby={`${id}-caption`}>
        <caption id={`${id}-caption`}>{label}</caption>
        <tbody>
          {points.map((p, i) => (
            <tr key={i}>
              <td>{date(p.at)}</td>
              <td>{p.rating}</td>
              <td>{t.online.rating.change(p.delta)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
