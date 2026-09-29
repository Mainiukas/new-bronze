/**
 * The cards on the match screen: the hand as a fan centred under the board,
 * the enlarged card (tap on touch screens), the "Play <card> as:" bar and the
 * two-card joker prompt.
 */

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
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
export function CardImage({ card, label, className = '' }: { card: Card | string; label?: string; className?: string }) {
  return (
    <span className={`card3d block ${className}`}>
      <span className="card3d-inner block size-full">
        <img src={cardArt(card)} alt="" draggable={false} className="card3d-face size-full rounded-[7%] object-cover select-none" />
        {label && <CardName name={label} />}
        <img src={CARD_BACK_URL} alt="" draggable={false} className="card3d-face card3d-back size-full rounded-[7%] object-cover select-none" />
      </span>
    </span>
  )
}

/**
 * The card's name, crisp and readable at hand size, laid over the name
 * banner at the foot of the card (the art's own lettering is too small there).
 */
function CardName({ name }: { name: string }) {
  return (
    <span aria-hidden="true" className="absolute inset-x-[9%] top-[84.6%] grid [transform:translateZ(1px)] [backface-visibility:hidden] h-[10.6%] place-items-center overflow-hidden rounded-[4px] border border-brass-300/40 bg-soot-950/90 px-0.5 [container-type:size]">
      <span className="font-display leading-none font-bold whitespace-nowrap text-parchment-50 uppercase [font-size:min(60cqh,9.6cqw)]">{name}</span>
    </span>
  )
}

interface HandFanProps {
  cards: readonly Card[]
  /** Cards chosen for the action being prepared (gold outline, lifted). */
  selected: readonly string[]
  /** Clicking plays (else it only enlarges). */
  interactive: boolean
  name: (card: Card) => string
  kind: (card: Card) => string
  label: string
  onSelect: (cardId: string) => void
  onZoom: (cardId: string) => void
}

/** The hand: a gentle fan, centred, that re-centres smoothly as the number of cards changes. */
export function HandFan({ cards, selected, interactive, name, kind, label, onSelect, onZoom }: HandFanProps) {
  const t = useT()
  const ref = useRef<HTMLUListElement>(null)
  const width = useWidth(ref)
  const pointer = useRef('mouse')
  const viewportH = typeof window === 'undefined' ? 900 : window.innerHeight
  const cardW = Math.round(Math.max(66, Math.min(124, width / 6.6, viewportH * 0.19 * CARD_RATIO)))
  const cardH = Math.round(cardW / CARD_RATIO)
  const n = cards.length
  const room = Math.max(0, width - cardW - 12)
  const step = n > 1 ? Math.min(cardW * 0.82, room / (n - 1)) : 0
  const tilt = n > 1 ? Math.min(3.2, 20 / n) : 0
  const lift = Math.round(cardH * 0.14)
  const drop = cardW / 90
  // The outer cards sit lower (the arc) and turn: keep the lowest corner inside the fan.
  const sink = Math.ceil(((n - 1) / 2) ** 2 * drop + Math.sin(((((n - 1) / 2) * tilt) / 180) * Math.PI) * cardW * 0.5) + 4
  const height = cardH + lift + sink
  return (
    <ul ref={ref} data-fan aria-label={label} className="relative w-full" style={{ height, '--lift': `${lift}px` } as CSSProperties}>
      {n === 0 && <li className="absolute inset-x-0 bottom-3 text-center text-sm text-parchment-400">{t.brass.handEmpty}</li>}
      {cards.map((card, i) => {
        const mid = i - (n - 1) / 2
        const isSelected = selected.includes(card.id)
        const style = {
          width: cardW,
          height: cardH,
          bottom: sink,
          '--z': isSelected ? 40 : i + 1,
          transform: `translateX(calc(-50% + ${(mid * step).toFixed(1)}px)) translateY(${(mid * mid * drop).toFixed(1)}px) rotate(${(mid * tilt).toFixed(2)}deg)`,
        } as CSSProperties
        const text = `${kind(card)}: ${name(card)}`
        return (
          <li
            key={card.id}
            data-card={card.id}
            className="fan-card absolute left-1/2 z-[var(--z)] origin-bottom has-[:focus-visible]:z-50 has-[:hover]:z-50"
            style={style}
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
                  ? '-translate-y-[var(--lift)] shadow-[0_0_0_3px_#ffd66b,0_0_22px_6px_rgb(255_214_107/0.6)]'
                  : 'shadow-[0_6px_14px_rgb(0_0_0/0.55)] hover:-translate-y-[calc(var(--lift)*0.55)] focus-visible:-translate-y-[calc(var(--lift)*0.55)] focus-visible:shadow-[0_0_0_3px_var(--color-brass-200)]'
              }`}
            >
              <CardImage card={card} label={name(card)} className="size-full" />
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
    <div role="toolbar" aria-label={b.playAs(name)} className="plate rivets flex flex-wrap items-center justify-center gap-1.5 bg-soot-900/[0.96] px-2.5 py-2 shadow-2xl">
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
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onCancel()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])
  return (
    <div role="dialog" aria-labelledby={id} className="plate rivets flex flex-col items-center gap-2 bg-soot-900/[0.97] px-4 py-3 text-center shadow-2xl">
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
      {blocked && <p className="text-xs text-ember-300">{blocked}</p>}
    </div>
  )
}
