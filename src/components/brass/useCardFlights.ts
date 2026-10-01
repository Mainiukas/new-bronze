/**
 * Card animations, read from what the game log says just happened:
 * - deal (start of each era): cards fly face down from the deck to every
 *   player, slightly staggered; yours land in the hand and flip face up one
 *   by one;
 * - draw (after a turn): the same with the 1–2 new cards;
 * - discard (every action): your card flies to the discard pile; another
 *   player's card flies from their seat to the middle of the board, turns
 *   face up for everyone to see, then goes to the discard pile.
 * - market sale (a new mine or iron works): its cubes fly to the market's
 *   spaces and coins fly to the owner's seat;
 * - distant-market sale: the tile rises from its stack to the middle of the
 *   screen, turns over to show its value, then goes to the flipped pile.
 * Nothing moves when animations are off. With reduced motion preferred, what
 * changed simply fades in.
 */

import { useLayoutEffect, useRef } from 'react'
import coalUrl from '../../../assets/ui/player/coal.svg'
import coinUrl from '../../../assets/ui/player/coin.svg'
import ironUrl from '../../../assets/ui/player/iron.svg'
import type { GameState, LogEntry } from '../../rules/state'
import type { RulesContext } from '../../rules/engine'
import { INDUSTRY_ICON_URLS } from '../board/assets'
import { cardArt } from './cardArt'
import { fadeIn, flipUp, flyCard, flyDistantTile, flyIcon, motionOff, visibleRect } from './flights'

/** A match that hasn't started yet: its first deal is animated when the screen opens. */
const unplayed = (state: GameState) => !state.log.some((e) => e.kind === 'discard')

export function useCardFlights(state: GameState, ctx: RulesContext, me: number, speed: number) {
  const layer = useRef<HTMLDivElement>(null)
  const seen = useRef({ seed: state.seed, log: unplayed(state) ? 0 : state.log.length })
  const handRects = useRef(new Map<string, DOMRect>())

  useLayoutEffect(() => {
    const prev = seen.current
    const entries = prev.seed === state.seed && state.log.length >= prev.log ? state.log.slice(prev.log) : []
    seen.current = { seed: state.seed, log: state.log.length }
    if (!layer.current || !entries.length || speed <= 0) return
    if (motionOff()) fadeChanges(entries, state, me)
    else play(layer.current, entries, state, ctx, me, speed, handRects.current)
  }, [state, ctx, me, speed])

  // After every render: where the hand's cards are (a played card flies from where it was).
  useLayoutEffect(() => {
    const rects = new Map<string, DOMRect>()
    for (const el of document.querySelectorAll<HTMLElement>('li[data-card]')) rects.set(el.dataset.card!, el.getBoundingClientRect())
    handRects.current = rects
  })

  return layer
}

/** Reduced motion: new cards in the hand, the discard pile, market cubes and the distant market fade in. */
function fadeChanges(entries: readonly LogEntry[], state: GameState, me: number) {
  const fade = (selector: string) => document.querySelectorAll(selector).forEach(fadeIn)
  for (const e of entries) {
    if ((e.kind === 'draw' && e.player === me) || e.kind === 'deal') {
      const cards = e.kind === 'draw' ? state.players[me].hand.slice(-e.count) : state.players[me].hand
      for (const card of cards) fade(`li[data-card="${CSS.escape(card.id)}"]`)
    } else if (e.kind === 'discard') fade('#discard-pile')
    else if (e.kind === 'market-sale') fade(`#market-${e.industry}`)
    else if (e.kind === 'sell-failed' || (e.kind === 'sell' && e.distant)) fade('#distant-used')
  }
}

function play(layer: HTMLElement, entries: readonly LogEntry[], state: GameState, ctx: RulesContext, me: number, speed: number, handRects: ReadonlyMap<string, DOMRect>) {
  const deck = document.getElementById('deck-pile')?.getBoundingClientRect()
  const pile = document.getElementById('discard-pile')
  const board = document.querySelector('[data-board]')?.getBoundingClientRect()
  if (!deck || !pile || !board) return
  const pileRect = pile.getBoundingClientRect()
  const handCard = (id: string) => document.querySelector<HTMLElement>(`li[data-card="${CSS.escape(id)}"]`)
  // A player's seat: their row in the player list, else (panel closed) the board's top-right corner.
  const seat = (p: number) => visibleRect(`[data-seat="${p}"]`) ?? new DOMRect(board.right - 70, board.top + 16, 40, 56)
  const middle = new DOMRect(board.left + board.width / 2 - 75, board.top + board.height / 2 - 105, 150, 210)
  const fanMiddle = () => {
    const fan = document.querySelector('ul[data-fan]')?.getBoundingClientRect()
    return fan ? new DOMRect(fan.left + fan.width / 2 - 45, fan.bottom - 130, 90, 126) : deck
  }

  // The discard pile's top card appears when the last card lands on it.
  let landing = 0
  const toPile = (promise: Promise<void>) => {
    landing++
    pile.dataset.arriving = ''
    void promise.then(() => {
      if (--landing === 0) delete pile.dataset.arriving
    })
  }
  // Your new card keeps its place in the hand, hidden, until it lands; then it flips face up.
  const intoHand = (id: string, delay: number) => {
    const el = handCard(id)
    if (!el) return
    el.dataset.arriving = ''
    void flyCard(layer, { from: deck, to: el.getBoundingClientRect(), front: cardArt(id), show: 'back', delay, speed }).then(() => {
      delete el.dataset.arriving
      flipUp(el, speed)
    })
  }
  const toSeat = (p: number, delay: number) => void flyCard(layer, { from: deck, to: seat(p), front: null, show: 'back', delay, speed })

  let t = 0
  const step = (ms: number) => (t += ms * speed)
  for (const e of entries) {
    if (e.kind === 'deal') {
      const order = state.order
      for (let k = 0; k < e.cards; k++) {
        order.forEach((p, i) => {
          const card = state.players[p].hand[k]
          if (!card) return
          const delay = t + (k * order.length + i) * 70 * speed
          if (p === me) intoHand(card.id, delay)
          else toSeat(p, delay)
        })
      }
      step(e.cards * order.length * 70 + 600)
    } else if (e.kind === 'draw') {
      const drawn = state.players[e.player].hand.slice(-e.count)
      drawn.forEach((card, i) => {
        if (e.player === me) intoHand(card.id, t + i * 140 * speed)
        else toSeat(e.player, t + i * 140 * speed)
      })
      step(e.count * 140 + 400)
    } else if (e.kind === 'discard') {
      e.cards.forEach((id, i) => {
        const delay = t + i * 120 * speed
        if (e.player === me) toPile(flyCard(layer, { from: handRects.get(id) ?? fanMiddle(), to: pileRect, front: cardArt(id), show: 'front', delay, speed }))
        else toPile(flyCard(layer, { from: seat(e.player), to: pileRect, via: { rect: middle, hold: 700 }, front: cardArt(id), show: 'reveal', delay, speed }))
      })
      step(e.player === me ? 300 : 1100)
    } else if (e.kind === 'market-sale') {
      // Cubes from the new tile to the market spaces they fill (the cheapest filled ones), then coins to the owner.
      const from = document.querySelector(`[data-slot="${CSS.escape(e.slot)}"]`)?.getBoundingClientRect()
      const total = ctx.data.markets[e.industry].spaces.length
      const first = total - state.market[e.industry]
      const seat = visibleRect(`[data-seat="${e.player}"]`)
      for (let i = 0; i < e.cubes; i++) {
        const space = document.querySelector<HTMLElement>(`[data-market-space="${e.industry}-${first + e.cubes - 1 - i}"]`)
        if (!from || !space) continue
        space.dataset.arriving = ''
        void flyIcon(layer, { from, to: space.getBoundingClientRect(), src: e.industry === 'coal' ? coalUrl : ironUrl, delay: t + i * 160 * speed, speed }).then(() => delete space.dataset.arriving)
        if (seat) void flyIcon(layer, { from: space.getBoundingClientRect(), to: seat, src: coinUrl, size: 22, delay: t + (i * 160 + 520) * speed, speed })
      }
      step(e.cubes * 160 + 1100)
    } else if ((e.kind === 'sell' && e.distant) || e.kind === 'sell-failed') {
      const stack = document.getElementById('distant-stack')?.getBoundingClientRect()
      const used = document.getElementById('distant-used')
      if (!stack || !used) continue
      const move = e.kind === 'sell' ? e.distant!.move : e.move
      used.dataset.arriving = ''
      const middle = new DOMRect(board.left + board.width / 2 - 55, board.top + board.height / 2 - 55, 110, 110)
      void flyDistantTile(layer, { from: stack, middle, to: used.getBoundingClientRect(), move, backIcon: INDUSTRY_ICON_URLS.cotton ?? '', delay: t, speed }).then(() => delete used.dataset.arriving)
      step(1900)
    }
  }
}
