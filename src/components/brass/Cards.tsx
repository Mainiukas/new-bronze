/**
 * The cards on the match screen: the hand as a fan centred under the board,
 * the enlarged card (tap on touch screens), the "Play <card> as:" bar and the
 * two-card joker prompt.
 */

import { useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import actCanalUrl from '../../../assets/ui/player/act_canal.svg'
import actDevelopUrl from '../../../assets/ui/player/act_develop.svg'
import actLoanUrl from '../../../assets/ui/player/act_loan.svg'
import actRailUrl from '../../../assets/ui/player/act_rail.svg'
import actSellUrl from '../../../assets/ui/player/act_sell.svg'
import actSkipUrl from '../../../assets/ui/player/act_skip.svg'
import { useT } from '../../i18n'
import type { CardAction } from '../../rules/options'
import type { Card, Era } from '../../rules/state'
import { INDUSTRY_ICON_URLS } from '../board/assets'
import { Dialog } from '../Dialog'
import { CARD_BACK_URL, CARD_RATIO, NO_LOAN_URL, cardArt } from './cardArt'

/** Width of an element, kept up to date. */
function useWidth(ref: React.RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.clientWidth)
    const observer = new ResizeObserver(() => setWidth(el.clientWidth))
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return width
}

/** One card: front and back, so it can flip. `label` lays a readable name over the front's name banner. */
export function CardImage({ card, label, visible, className = '' }: { card: Card | string; label?: string; visible?: number; className?: string }) {
  return (
    <span className={`card3d block ${className}`}>
      <span className="card3d-inner block size-full">
        <img src={cardArt(card)} alt="" draggable={false} className="card3d-face size-full rounded-[7%] object-cover select-none" />
        {label && <CardName name={label} visible={visible} />}
        <img src={CARD_BACK_URL} alt="" draggable={false} className="card3d-face card3d-back size-full rounded-[7%] object-cover select-none" />
      </span>
    </span>
  )
}

/**
 * The card's name, crisp and readable at hand size, laid over the name
 * ribbon at the foot of the card (the art's own lettering is too small
 * there). The plate is centred on the ribbon's inner frame (tools/build-cards.js:
 * x 44–256, y 366–390 of 300 × 420) and the name is centred in it both ways;
 * trimming the line box to the capitals keeps it truly centred vertically.
 */
function CardName({ name, visible = 1 }: { name: string; visible?: number }) {
  // Overlapped cards show only their left part: the plate shrinks to that part, the name stays centred in it.
  const overlapped = visible < 0.95
  const right = overlapped ? `${Math.max(4, Math.round((1 - visible) * 100) + 2)}%` : '9%'
  return (
    <span
      aria-hidden="true"
      className="absolute top-[84.7%] grid h-[10.6%] [transform:translateZ(1px)] place-items-center overflow-hidden rounded-[4px] border border-brass-300/40 bg-soot-950/90 px-1 [backface-visibility:hidden] [container-type:size]"
      style={{ left: overlapped ? '4%' : '9%', right }}
    >
      <span className="text-center font-display leading-none font-bold whitespace-nowrap text-parchment-50 uppercase [font-size:min(60cqh,11cqw)] [text-box:trim-both_cap_alphabetic]">{name}</span>
    </span>
  )
}

interface HandRowProps {
  cards: readonly Card[]
  /** Cards chosen for the action being prepared (gold outline, lifted). */
  selected: readonly string[]
  /** Clicking plays (else it only enlarges). */
  interactive: boolean
  /** Card width in px (the hand strip sets it from the screen height). */
  cardWidth: number
  name: (card: Card) => string
  kind: (card: Card) => string
  label: string
  onSelect: (cardId: string) => void
  onZoom: (cardId: string) => void
}

const GAP = 8
/** A picked card rises 16 px (hovering: 6 px). */
const LIFT_SELECTED = 16

/**
 * The hand: one straight row, centred, re-centring smoothly as the number of
 * cards changes. When the cards don't fit they overlap evenly, and each
 * card's name plate stays in its visible part.
 */
export function HandRow({ cards, selected, interactive, cardWidth, name, kind, label, onSelect, onZoom }: HandRowProps) {
  const t = useT()
  const ref = useRef<HTMLUListElement>(null)
  const width = useWidth(ref)
  const pointer = useRef('mouse')
  const cardW = cardWidth
  const cardH = Math.round(cardW / CARD_RATIO)
  const n = cards.length
  const natural = n * cardW + Math.max(0, n - 1) * GAP
  const step = n > 1 ? (natural <= width ? cardW + GAP : Math.max(16, (width - cardW) / (n - 1))) : 0
  const total = n ? cardW + step * (n - 1) : 0
  const start = Math.max(0, (width - total) / 2)
  const visible = step >= cardW ? 1 : step / cardW
  return (
    <ul ref={ref} data-fan aria-label={label} className="relative w-full" style={{ height: cardH + LIFT_SELECTED + 2 }}>
      {n === 0 && <li className="absolute inset-x-0 bottom-3 text-center text-sm text-parchment-400">{t.brass.handEmpty}</li>}
      {cards.map((card, i) => {
        const isSelected = selected.includes(card.id)
        const text = `${kind(card)}: ${name(card)}`
        const last = i === n - 1
        return (
          <li
            key={card.id}
            data-card={card.id}
            className="fan-card absolute bottom-0 left-0 z-[var(--z)] has-[:focus-visible]:z-50 has-[:hover]:z-50"
            style={{ width: cardW, height: cardH, '--z': isSelected ? 40 : i + 1, transform: `translateX(${(start + i * step).toFixed(1)}px)` } as CSSProperties}
          >
            <button
              type="button"
              aria-label={text}
              aria-pressed={interactive ? isSelected : undefined}
              title={text}
              onPointerDown={(event) => (pointer.current = event.pointerType)}
              onClick={() => {
                const touch = pointer.current === 'touch'
                pointer.current = 'mouse'
                if (touch || !interactive) onZoom(card.id)
                else onSelect(card.id)
              }}
              className={`fan-card-button relative block size-full rounded-[7%] outline-none ${
                isSelected
                  ? 'shadow-[0_0_0_3px_#ffd66b,0_0_22px_6px_rgb(255_214_107/0.6)]'
                  : 'shadow-[0_6px_14px_rgb(0_0_0/0.55)] hover:-translate-y-[6px] focus-visible:-translate-y-[6px] focus-visible:shadow-[0_0_0_3px_var(--color-brass-200)]'
              }`}
              style={isSelected ? { translate: `0 -${LIFT_SELECTED}px` } : undefined}
            >
              <CardImage card={card} label={name(card)} visible={last || isSelected ? 1 : visible} className="size-full" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** A card shown large (tap on touch screens, or any card when it isn't your turn). */
export function CardZoom({ card, name, kind, canPlay, selected, onPlay, onClose }: { card: Card | null; name: string; kind: string; canPlay: boolean; selected: boolean; onPlay: () => void; onClose: () => void }) {
  const t = useT()
  const b = t.brass
  const id = useId()
  return (
    <Dialog open={card !== null} onClose={onClose} labelledBy={id}>
      {card && (
        <div className="flex flex-col items-center gap-3 p-2">
          <CardImage card={card} className="aspect-[5/7] w-[min(78vw,20rem)] drop-shadow-[0_10px_24px_rgb(0_0_0/0.7)]" />
          <p id={id} className="font-display text-lg font-bold tracking-[0.06em] text-parchment-50">
            {kind}: {name}
          </p>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              {b.close}
            </button>
            {canPlay && (
              <button type="button" className="btn btn-primary px-6" onClick={onPlay} autoFocus>
                {selected ? b.deselect : b.playThis}
              </button>
            )}
          </div>
        </div>
      )}
    </Dialog>
  )
}

const ACTION_ICONS: Record<Exclude<CardAction, 'build' | 'network'>, string> = {
  develop: actDevelopUrl,
  sell: actSellUrl,
  loan: actLoanUrl,
  pass: actSkipUrl,
}

/** "Play <card> as: [Build] [Network] [Develop] [Sell] [Loan] [Pass]": each enabled only when legal, else its reason as the tooltip. */
export function CardActionBar({
  card,
  name,
  era,
  blocked,
  noLoans,
  onChoose,
  onCancel,
}: {
  card: Card
  name: string
  era: Era
  blocked: Record<CardAction, string | null>
  /** Show the no-loan icon on Loan: 'last' = the last round to take one, 'none' = no more loans. */
  noLoans: 'last' | 'none' | null
  onChoose: (action: CardAction) => void
  onCancel: () => void
}) {
  const t = useT()
  const b = t.brass
  const icon = (action: CardAction) =>
    action === 'build' ? (card.kind === 'industry' ? INDUSTRY_ICON_URLS[card.industry] : null) : action === 'network' ? (era === 'canal' ? actCanalUrl : actRailUrl) : action === 'loan' && noLoans ? NO_LOAN_URL : ACTION_ICONS[action]
  return (
    <div role="toolbar" aria-label={b.playAs(name)} className="flex flex-wrap items-center justify-center gap-1.5 rounded-lg border border-brass-300/50 bg-soot-900/[0.96] px-2 py-1 shadow-lg">
      <span className="font-display text-sm font-bold tracking-[0.04em] text-parchment-100">{b.playAs(name)}</span>
      {(['build', 'network', 'develop', 'sell', 'loan', 'pass'] as const).map((action) => {
        const reason = blocked[action]
        const src = icon(action)
        const label = b.cardActions[action](era)
        return (
          <button
            key={action}
            type="button"
            onClick={reason ? undefined : () => onChoose(action)}
            aria-disabled={reason ? true : undefined}
            title={reason ?? (action === 'loan' && noLoans === 'last' ? b.lastLoanRound : label)}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-md border-2 px-2.5 font-display text-xs font-bold tracking-[0.08em] uppercase transition ${
              reason ? 'cursor-not-allowed border-bronze-500/25 text-parchment-500 opacity-60' : 'border-bronze-400/70 bg-linear-to-b from-bronze-700/60 to-soot-900 text-parchment-50 hover:border-brass-300'
            }`}
          >
            {src && <img src={src} alt="" aria-hidden="true" className="size-4" />}
            {label}
          </button>
        )
      })}
      <button type="button" onClick={onCancel} aria-label={b.cancel} title={b.cancel} className="grid size-8 place-items-center rounded-md text-lg text-parchment-300 hover:bg-bronze-500/20 hover:text-parchment-50">
        ×
      </button>
    </div>
  )
}

/** A second card clicked while one is chosen: use both as the joker (any location, both actions), or switch. */
export function JokerPrompt({ first, second, blocked, onJoker, onSwitch, onCancel }: { first: string; second: string; blocked: string | null; onJoker: () => void; onSwitch: () => void; onCancel: () => void }) {
  const t = useT()
  const b = t.brass
  const id = useId()
  return (
    <div role="dialog" aria-labelledby={id} className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-lg border border-brass-300/50 bg-soot-900/[0.97] px-3 py-1 text-center shadow-lg">
      <p id={id} className="font-display text-sm font-bold text-parchment-100">
        {b.jokerTitle(first, second)}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" className="btn btn-primary min-h-9 px-4 text-sm aria-disabled:cursor-not-allowed aria-disabled:opacity-45 aria-disabled:grayscale" onClick={blocked ? undefined : onJoker} aria-disabled={blocked ? true : undefined} title={blocked ?? b.jokerHint} autoFocus={!blocked}>
          {b.jokerUse}
        </button>
        <button type="button" className="btn btn-ghost min-h-9 px-3 text-sm" onClick={onSwitch}>
          {b.jokerSwitch(second)}
        </button>
        <button type="button" className="btn btn-ghost min-h-9 px-3 text-sm" onClick={onCancel}>
          {b.cancel}
        </button>
      </div>
      {blocked && <p className="w-full text-xs text-ember-300">{blocked}</p>}
    </div>
  )
}
