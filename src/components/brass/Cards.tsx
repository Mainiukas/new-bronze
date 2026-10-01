/**
 * The cards on the match screen: the hand as a row centred under the board,
 * the enlarged card (tap on touch screens), the "Play <card> as:" bar and the
 * two-card joker prompt.
 */

import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
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
import { BANNER_X, bannerPath, CARD_BOX, CARD_TEXT, fitName, NAME_MAX_PX, NAME_MIN_PX, nameLines, NAME_TRACKING, regionOf, RIBBON_BOTTOM, RIBBON_COLORS, RIBBON_MIN_H, RIBBON_PAD, RIBBON_TEXT_X, ribbonPath, ribbonTop } from './cardRibbon'

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

/* ---- One card ---------------------------------------------------------------------- */

/** Fonts finished loading (names are measured in Cinzel, so measure again once it's there). */
let fontsReady = typeof document === 'undefined' || !document.fonts ? true : document.fonts.status === 'loaded'
const fontListeners = new Set<() => void>()
if (!fontsReady)
  void document.fonts.ready.then(() => {
    fontsReady = true
    for (const listener of fontListeners) listener()
  })
function useFontsReady() {
  return useSyncExternalStore(
    (onChange) => {
      fontListeners.add(onChange)
      return () => fontListeners.delete(onChange)
    },
    () => fontsReady,
    () => true,
  )
}

let measureCtx: CanvasRenderingContext2D | null | undefined
/** A name's width in Cinzel 700 at 1 px, letter spacing included. */
function nameWidth(name: string): number {
  if (measureCtx === undefined) {
    try {
      measureCtx = document.createElement('canvas').getContext('2d')
    } catch {
      measureCtx = null
    }
  }
  if (!measureCtx) return name.length * 0.62
  measureCtx.font = '700 100px Cinzel, serif'
  return measureCtx.measureText(name).width / 100 + name.length * NAME_TRACKING
}

/** How a card's name is set: its lines, font size, and the ribbon's top (card units); null = no name drawn. */
interface NameLayout {
  lines: string[]
  size: number
  top: number
  /** px from the card's left edge, and the width the lines are centred in. */
  left: number
  width: number
}

/**
 * Lays the name out for a card `cardWidth` px wide of which `visible` (0–1)
 * shows: names of several words on two lines, single words on one, shrunk to
 * fit (~14 px at hand size, 2.5× in the large view, at least 9 px in
 * proportion). On an overlapped card the name fits the part that shows, or is
 * left off; it never overflows the ribbon.
 */
function layoutName(name: string, cardWidth: number, visible: number): NameLayout | null {
  const scale = cardWidth / CARD_BOX.w
  const shown = Math.min(1, visible)
  const left = RIBBON_TEXT_X.from * scale
  const space = Math.max(0, Math.min((RIBBON_TEXT_X.to - RIBBON_TEXT_X.from) * scale, cardWidth * shown - left - 3) - 4)
  const lines = nameLines(name)
  const min = NAME_MIN_PX * Math.max(1, cardWidth / 130)
  const max = Math.max(min, Math.min((NAME_MAX_PX * cardWidth) / 130, (RIBBON_MIN_H - 2 * RIBBON_PAD) * scale * 0.95))
  const fit = fitName(Math.max(...lines.map(nameWidth)), space, max, min)
  // A mostly hidden card whose name would have to go below the minimum keeps just its ribbon.
  if (fit.belowMin && shown < 0.95) return null
  return { lines, size: fit.size, top: ribbonTop(lines.length, fit.size, cardWidth), left, width: space + 4 }
}

/**
 * One card: front and back, so it can flip. The front's name is real text on
 * a ribbon drawn in code (over the art's own, too-small lettering): two lines
 * for names of several words (the ribbon grows taller), one for single words,
 * shrunk to fit. `compact` (hand size) also covers the side banners' tiny
 * names, keeping just their colour; the large views show them.
 */
export function CardImage({ card, label, width, visible = 1, compact = false, className = '', style }: { card: Card | string; label?: string; width?: number; visible?: number; compact?: boolean; className?: string; style?: CSSProperties }) {
  useFontsReady()
  const layout = label && width ? layoutName(label, width, visible) : null
  const top = layout?.top ?? (label && width ? ribbonTop(nameLines(label).length, (NAME_MIN_PX * Math.max(1, width / 130)), width) : RIBBON_BOTTOM - RIBBON_MIN_H)
  return (
    <span className={`card3d block ${className}`} style={style}>
      <span className="card3d-inner block size-full">
        <span className="card3d-face block overflow-hidden rounded-[7%]">
          <img src={cardArt(card)} alt="" draggable={false} className="size-full object-cover select-none" />
          {label && <CardRibbon card={card} compact={compact} top={top} />}
          {layout && width ? <CardName layout={layout} cardWidth={width} /> : null}
        </span>
        <img src={CARD_BACK_URL} alt="" draggable={false} className="card3d-face card3d-back size-full rounded-[7%] object-cover select-none" />
      </span>
    </span>
  )
}

/** The ribbon (from `top` down, in card units) and, at hand size, plain side banners, in the region's colours, drawn over the art. */
function CardRibbon({ card, compact, top }: { card: Card | string; compact: boolean; top: number }) {
  const id = useId()
  const region = regionOf(card)
  const [from, to] = RIBBON_COLORS[region]
  const banners = compact && region !== 'industry'
  return (
    <svg aria-hidden="true" viewBox={`0 0 ${CARD_BOX.w} ${CARD_BOX.h}`} preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full">
      <defs>
        <linearGradient id={`${id}r`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      {banners &&
        BANNER_X.map((x) => (
          <g key={x}>
            <path d={bannerPath(x)} fill={`url(#${id}r)`} stroke="#120c08" strokeWidth="2" />
            <path d={bannerPath(x)} fill="none" stroke="#d9b877" strokeOpacity="0.5" strokeWidth="1" />
          </g>
        ))}
      <path d={ribbonPath(top)} fill={`url(#${id}r)`} stroke="#120c08" strokeWidth="2" />
      <path d={ribbonPath(top, 4)} fill="none" stroke="#e6cc92" strokeOpacity="0.55" strokeWidth="1" />
    </svg>
  )
}

/** The name, centred both ways in the ribbon: Cinzel 700, cream with a thin dark outline and a soft shadow, line height 1. */
function CardName({ layout, cardWidth }: { layout: NameLayout; cardWidth: number }) {
  const scale = cardWidth / CARD_BOX.w
  const top = (layout.top + RIBBON_PAD) * scale
  return (
    <span
      aria-hidden="true"
      data-card-name
      data-lines={layout.lines.length}
      className="pointer-events-none absolute flex flex-col items-center justify-center text-center [backface-visibility:hidden]"
      style={{ left: layout.left, width: layout.width, top, height: (RIBBON_BOTTOM - RIBBON_PAD) * scale - top }}
    >
      {layout.lines.map((line) => (
        <span
          key={line}
          className="block whitespace-nowrap"
          style={{
            fontFamily: 'Cinzel, serif',
            fontWeight: 700,
            fontSize: `${layout.size.toFixed(2)}px`,
            lineHeight: 1,
            letterSpacing: `${NAME_TRACKING}em`,
            // The spacing after the last letter, taken back so the line is truly centred.
            marginRight: `-${NAME_TRACKING}em`,
            color: CARD_TEXT,
            textShadow: '1px 0 0 #120c08, -1px 0 0 #120c08, 0 1px 0 #120c08, 0 -1px 0 #120c08, 0 2px 4px rgb(0 0 0 / 0.6)',
          }}
        >
          {line}
        </span>
      ))}
    </span>
  )
}

/* ---- The hand ------------------------------------------------------------------------ */

interface HandRowProps {
  cards: readonly Card[]
  /** Cards chosen for the action being prepared (brass glow, lifted). */
  selected: readonly string[]
  /** Clicking plays (else it only enlarges). */
  interactive: boolean
  /** Card width in px (the game screen sets it from the screen's size). */
  cardWidth: number
  /** Space between cards when they fit side by side (12 px; 6 px on phones). */
  gap?: number
  name: (card: Card) => string
  kind: (card: Card) => string
  /** One line on what the card allows ("Build in Derby"), shown in the large preview. */
  allows?: (card: Card) => string
  label: string
  onSelect: (cardId: string) => void
  onZoom: (cardId: string) => void
}

/** Hovering lifts a card 14 px; a picked card rises 24 px. */
const LIFT_HOVER = 14
const LIFT_SELECTED = 24
/** The large preview: after hovering this long (or a long press), at this size. */
const PREVIEW_DELAY_MS = 400
const LONG_PRESS_MS = 450
const PREVIEW_SCALE = 2.5

/**
 * The hand: one straight row, centred in its box (the game screen lines the
 * box up with the map), sliding back to centre when a card leaves or arrives.
 * When the cards don't fit they overlap evenly, and each card's name stays in
 * its visible part. A picked card rises with a brass glow and the rest dim;
 * hovering 400 ms (or a long press) shows the card large above the hand.
 */
export function HandRow({ cards, selected, interactive, cardWidth, gap = 12, name, kind, allows, label, onSelect, onZoom }: HandRowProps) {
  const t = useT()
  const ref = useRef<HTMLUListElement>(null)
  const width = useWidth(ref)
  const pointer = useRef('mouse')
  const [preview, setPreview] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const pressed = useRef(false)
  const cardW = cardWidth
  const cardH = Math.round(cardW / CARD_RATIO)
  const n = cards.length
  const natural = n * cardW + Math.max(0, n - 1) * gap
  const step = n > 1 ? (natural <= width ? cardW + gap : Math.max(16, (width - cardW) / (n - 1))) : 0
  const total = n ? cardW + step * (n - 1) : 0
  const start = Math.max(0, (width - total) / 2)
  const visible = step >= cardW ? 1 : step / cardW
  const anySelected = selected.length > 0
  const clear = () => {
    window.clearTimeout(timer.current)
    setPreview(null)
  }
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const previewIndex = preview ? cards.findIndex((c) => c.id === preview) : -1
  const previewCard = previewIndex >= 0 ? cards[previewIndex] : null
  const bigW = Math.round(cardW * PREVIEW_SCALE)
  const bigLeft = previewCard ? Math.max(0, Math.min(width - bigW, start + previewIndex * step + cardW / 2 - bigW / 2)) : 0

  return (
    <ul ref={ref} data-fan aria-label={label} className="relative w-full" style={{ height: cardH + LIFT_SELECTED + 2 }} onPointerLeave={clear}>
      {n === 0 && <li className="absolute inset-x-0 bottom-3 text-center text-sm text-parchment-400">{t.brass.handEmpty}</li>}
      {cards.map((card, i) => {
        const isSelected = selected.includes(card.id)
        const text = `${kind(card)}: ${name(card)}`
        const last = i === n - 1
        return (
          <li
            key={card.id}
            data-card={card.id}
            className={`fan-card absolute bottom-0 left-0 z-[var(--z)] has-[:focus-visible]:z-50 has-[:hover]:z-50 ${anySelected && !isSelected ? 'fan-card-dim' : ''}`}
            style={{ width: cardW, height: cardH, '--z': isSelected ? 40 : i + 1, transform: `translateX(${(start + i * step).toFixed(1)}px)` } as CSSProperties}
          >
            <button
              type="button"
              aria-label={text}
              aria-pressed={interactive ? isSelected : undefined}
              title={text}
              onPointerEnter={(event) => {
                if (event.pointerType !== 'mouse') return
                window.clearTimeout(timer.current)
                timer.current = window.setTimeout(() => setPreview(card.id), PREVIEW_DELAY_MS)
              }}
              onPointerLeave={clear}
              onPointerDown={(event) => {
                pointer.current = event.pointerType
                pressed.current = false
                if (event.pointerType === 'mouse') return clear()
                window.clearTimeout(timer.current)
                timer.current = window.setTimeout(() => {
                  pressed.current = true
                  setPreview(card.id)
                }, LONG_PRESS_MS)
              }}
              onPointerUp={(event) => {
                if (event.pointerType !== 'mouse') clear()
              }}
              onPointerCancel={clear}
              onContextMenu={(event) => event.preventDefault()}
              onClick={() => {
                const touch = pointer.current === 'touch'
                pointer.current = 'mouse'
                clear()
                // A long press only previews.
                if (pressed.current) {
                  pressed.current = false
                  return
                }
                if (touch || !interactive) onZoom(card.id)
                else onSelect(card.id)
              }}
              className={`fan-card-button relative block size-full rounded-[7%] outline-none ${
                isSelected
                  ? 'shadow-[0_0_0_2px_#ecc76e,0_0_20px_6px_rgb(236_199_110/0.55),0_16px_24px_rgb(0_0_0/0.5)]'
                  : 'shadow-[0_6px_14px_rgb(0_0_0/0.55)] hover:shadow-[0_18px_26px_rgb(0_0_0/0.5)] focus-visible:shadow-[0_0_0_3px_var(--color-brass-200)]'
              }`}
              style={{ '--lift': `-${isSelected ? LIFT_SELECTED : LIFT_HOVER}px`, translate: isSelected ? `0 -${LIFT_SELECTED}px` : undefined } as CSSProperties}
            >
              <CardImage card={card} label={name(card)} width={cardW} compact visible={last || isSelected ? 1 : visible} className="size-full" />
            </button>
          </li>
        )
      })}
      {previewCard && (
        <li
          aria-hidden="true"
          data-testid="card-preview"
          className="card-preview pointer-events-none absolute z-[60] flex flex-col items-center gap-2"
          style={{ left: bigLeft, bottom: cardH + LIFT_SELECTED + 10, width: bigW }}
        >
          <CardImage card={previewCard} label={name(previewCard)} width={bigW} className="aspect-[5/7] w-full drop-shadow-[0_18px_30px_rgb(0_0_0/0.75)]" />
          {allows && (
            <span className="rounded-md border border-brass-300/50 bg-soot-950/95 px-3 py-1 text-center text-sm font-semibold text-parchment-50 shadow-lg">{allows(previewCard)}</span>
          )}
        </li>
      )}
    </ul>
  )
}

/**
 * A card shown large (tap on touch screens, or any card when it isn't your turn).
 * Swipe left or right (or use the arrow keys) to look through the rest of the hand.
 */
export function CardZoom({
  card,
  name,
  kind,
  canPlay,
  selected,
  onPlay,
  onClose,
  onStep,
  position,
}: {
  card: Card | null
  name: string
  kind: string
  canPlay: boolean
  selected: boolean
  onPlay: () => void
  onClose: () => void
  /** Show the previous (−1) or next (+1) card of the hand. */
  onStep?: (direction: -1 | 1) => void
  /** "3 / 8": where this card is in the hand. */
  position?: string
}) {
  const t = useT()
  const b = t.brass
  const id = useId()
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const zoomWidth = Math.round(Math.min(typeof window === 'undefined' ? 320 : window.innerWidth * 0.7, 320))
  return (
    <Dialog open={card !== null} onClose={onClose} labelledBy={id}>
      {card && (
        <div
          className="flex touch-pan-y flex-col items-center gap-3 p-2 select-none"
          onPointerDown={(e) => (swipe.current = { x: e.clientX, y: e.clientY })}
          onPointerUp={(e) => {
            const from = swipe.current
            swipe.current = null
            if (!from || !onStep) return
            const dx = e.clientX - from.x
            if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - from.y)) onStep(dx < 0 ? 1 : -1)
          }}
          onKeyDown={(e) => {
            if (!onStep) return
            if (e.key === 'ArrowRight') onStep(1)
            else if (e.key === 'ArrowLeft') onStep(-1)
          }}
          data-testid="card-zoom"
        >
          <div className="flex items-center gap-2">
            {onStep && (
              <button type="button" className="icon-btn" aria-label={b.prevCard} onClick={() => onStep(-1)}>
                ‹
              </button>
            )}
            <CardImage card={card} label={name} width={zoomWidth} className="aspect-[5/7] drop-shadow-[0_10px_24px_rgb(0_0_0/0.7)]" style={{ width: zoomWidth }} />
            {onStep && (
              <button type="button" className="icon-btn" aria-label={b.nextCard} onClick={() => onStep(1)}>
                ›
              </button>
            )}
          </div>
          <p id={id} className="font-display text-lg font-bold tracking-[0.06em] text-parchment-50">
            {kind}: {name}
            {position && <span className="ml-2 text-sm font-semibold text-parchment-400">{position}</span>}
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
