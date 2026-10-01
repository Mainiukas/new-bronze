/**
 * The turn order track in the top bar: one circle per player, left to right
 * in turn order. Each is the player's avatar in a thick ring of their colour;
 * the player acting is larger and glows, players who have finished their turn
 * this round are dimmed. Under each circle: the money spent this round. At the
 * end of a round the circles slide into the new order (least spent first).
 * Hovering (or focusing) a circle shows the player's money, income, VP and
 * cards; clicking it shows their mat.
 */

import { useLayoutEffect, useRef, useState } from 'react'
import { presetAvatar } from '../../data/avatars'
import { useT } from '../../i18n'
import { incomeOf, type RulesContext } from '../../rules/engine'
import type { GameState } from '../../rules/state'
import { motionOff } from './flights'
import { Coin, IncomeArrow, VpHex } from './Symbols'
import { CARD_BACK_URL } from './cardArt'
import { clockLevel, formatClock, ringShare, type SeatClock } from './clock'

/** A round avatar: an illustrated one ('preset:<id>'), a picture, or the initial on the player's colour. */
function SeatAvatar({ url, name, color, className }: { url: string | null; name: string; color: string; className: string }) {
  const [failed, setFailed] = useState<string | null>(null)
  const preset = presetAvatar(url)
  if (preset)
    return (
      <span className={`block overflow-hidden rounded-full ${className}`} style={{ background: preset.ground ?? '#1b1714' }}>
        <img src={preset.src} alt="" draggable={false} className={`size-full ${preset.fit === 'cover' ? 'object-cover' : 'scale-90 object-contain'}`} />
      </span>
    )
  if (url && failed !== url) return <img src={url} alt="" referrerPolicy="no-referrer" onError={() => setFailed(url)} className={`rounded-full object-cover ${className}`} />
  return (
    <span className={`grid place-items-center rounded-full font-display leading-none font-extrabold text-soot-950 uppercase ${className}`} style={{ background: color }}>
      {name.trim().charAt(0) || '?'}
    </span>
  )
}

export function TurnOrder({
  state,
  ctx,
  colorOf,
  avatarOf,
  current,
  viewing,
  speed,
  onView,
  clocks,
}: {
  state: GameState
  ctx: RulesContext
  colorOf: (player: number) => string
  avatarOf: (player: number) => string | null
  current: number
  viewing: number | null
  /** The animation-speed setting (0 = off). */
  speed: number
  onView: (player: number) => void
  /** Online games: each player's chess clock, by player. */
  clocks?: Record<number, SeatClock>
}) {
  const t = useT()
  const b = t.brass
  const items = useRef(new Map<number, HTMLElement>())
  const lastX = useRef(new Map<number, number>())
  const orderKey = state.order.join()

  // When the order changes, each circle slides from where it was (FLIP).
  useLayoutEffect(() => {
    const now = new Map<number, number>()
    for (const [id, el] of items.current) {
      const x = el.getBoundingClientRect().left
      const before = lastX.current.get(id)
      if (before !== undefined && Math.abs(before - x) > 1 && speed > 0 && !motionOff()) {
        el.animate([{ transform: `translateX(${before - x}px)` }, { transform: 'translateX(0)' }], { duration: 650 * speed, easing: 'cubic-bezier(.2,.8,.2,1)' })
      }
      now.set(id, x)
    }
    lastX.current = now
  }, [orderKey, speed])

  return (
    <ol aria-label={b.turnOrder} className="flex items-end gap-2.5 sm:gap-3.5">
      {state.order.map((id, index) => {
        const p = state.players[id]
        const color = colorOf(id)
        const active = id === current && !state.finished
        const done = !state.finished && index < state.turn
        const income = incomeOf(ctx, p)
        return (
          <li
            key={id}
            ref={(el) => {
              if (el) items.current.set(id, el)
              else items.current.delete(id)
            }}
            className="group relative flex flex-col items-center gap-0.5"
          >
            <button
              type="button"
              data-seat={id}
              onClick={() => onView(id)}
              aria-pressed={viewing === id}
              aria-label={`${index + 1}. ${b.opponentLabel(p.name, p.money, income, p.vp, p.hand.length)}${active ? `. ${b.turnMarker}` : ''}`}
              className={`rounded-full transition-[transform,opacity,filter] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass-200 ${active ? 'scale-[1.14]' : ''} ${done ? 'opacity-55 saturate-50' : ''}`}
            >
              <span className="relative block rounded-full p-[5px]" style={{ background: color, boxShadow: active ? `0 0 0 2px #1a120a, 0 0 16px 5px ${color}b0` : '0 0 0 2px #1a120a, 0 3px 8px rgb(0 0 0 / 0.6)' }}>
                <SeatAvatar url={avatarOf(id)} name={p.name} color={color} className="size-8 text-base sm:size-9" />
                {active && clocks?.[id]?.running && <ClockRing clock={clocks[id]} color={color} />}
              </span>
            </button>
            <span className="inline-flex items-center gap-0.5 font-display text-[0.7rem] leading-none font-bold text-parchment-100 tabular-nums" title={b.spentThisRound(p.spent)}>
              <Coin className="size-3.5" />£{p.spent}
            </span>
            {clocks?.[id] && <ClockPill clock={clocks[id]} />}
            <div
              role="tooltip"
              className="pointer-events-none invisible absolute top-full left-1/2 z-50 mt-1.5 w-max -translate-x-1/2 rounded-lg border border-bronze-400/60 bg-soot-950/[0.97] px-3 py-2 opacity-0 shadow-xl transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
            >
              <p className="mb-1.5 font-display text-sm font-bold text-parchment-50">
                {index + 1}. {p.name}
              </p>
              <p className="flex items-center gap-2.5 text-sm text-parchment-100">
                <span className="inline-flex items-center gap-1 font-bold tabular-nums">
                  <Coin className="size-4" />£{p.money}
                </span>
                <IncomeArrow value={income} size="sm" label={`${b.income}: £${income}`} />
                <VpHex value={p.vp} size="sm" label={`${b.vp}: ${p.vp}`} />
                <span className="inline-flex items-center gap-1 font-bold tabular-nums">
                  <img src={CARD_BACK_URL} alt="" className="h-5 w-auto rounded-[2px]" />
                  {p.hand.length}
                </span>
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** The time left on a player's clock: amber under 2:00, red (pulsing gently) under 0:30. */
function ClockPill({ clock }: { clock: SeatClock }) {
  const b = useT().brass
  const level = clockLevel(clock.ms)
  const tone =
    level === 'critical'
      ? 'clock-critical border-rust-400/90 bg-rust-500/40 text-parchment-50'
      : level === 'low'
        ? 'border-ember-400/90 bg-ember-500/25 text-ember-300'
        : clock.running
          ? 'border-brass-300/80 bg-soot-950/90 text-brass-100'
          : 'border-bronze-500/40 bg-soot-950/80 text-parchment-300'
  return (
    <span
      data-testid="seat-clock"
      data-level={level}
      title={b.clockTitle(formatClock(clock.ms))}
      className={`inline-flex items-center rounded-full border px-1.5 py-px font-display text-[0.7rem] leading-none font-bold tabular-nums ${tone} ${clock.running ? 'shadow-[0_0_8px_rgb(240_215_138/0.45)]' : ''}`}
    >
      {formatClock(clock.ms)}
    </span>
  )
}

/** Around the player to move: a ring in their colour that drains as their clock runs down. */
function ClockRing({ clock, color }: { clock: SeatClock; color: string }) {
  const r = 23
  const c = 2 * Math.PI * r
  const level = clockLevel(clock.ms)
  return (
    <svg aria-hidden="true" data-testid="clock-ring" viewBox="0 0 52 52" className={`pointer-events-none absolute -inset-[7px] size-[calc(100%+14px)] -rotate-90 ${level === 'critical' ? 'clock-critical' : ''}`}>
      <circle cx="26" cy="26" r={r} fill="none" stroke="rgb(0 0 0 / 0.55)" strokeWidth="3" />
      <circle
        cx="26"
        cy="26"
        r={r}
        fill="none"
        stroke={level === 'normal' ? color : level === 'low' ? 'var(--color-ember-300)' : 'var(--color-rust-300)'}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - ringShare(clock))}
        className="transition-[stroke-dashoffset] duration-1000 ease-linear"
      />
    </svg>
  )
}
