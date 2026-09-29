/**
 * Card animations, read from what the game log says just happened:
 * - deal (start of each era): cards fly face down from the deck to every
 *   player, slightly staggered; yours land in the hand and flip face up one
 *   by one;
 * - draw (after a turn): the same with the 1–2 new cards;
 * - discard (every action): your card flies to the discard pile; another
 *   player's card flies from their seat to the middle of the board, turns
 *   face up for everyone to see, then goes to the discard pile.
 * Nothing moves when animations are off or reduced motion is preferred.
 */

import { useLayoutEffect, useRef } from 'react'
import type { GameState, LogEntry } from '../../rules/state'
import { cardArt } from './cardArt'
import { flipUp, flyCard, motionOff, visibleRect } from './flights'

/** A match that hasn't started yet: its first deal is animated when the screen opens. */
const unplayed = (state: GameState) => !state.log.some((e) => e.kind === 'discard')

export function useCardFlights(state: GameState, me: number, speed: number) {
  const layer = useRef<HTMLDivElement>(null)
  const seen = useRef({ seed: state.seed, log: unplayed(state) ? 0 : state.log.length })
  const handRects = useRef(new Map<string, DOMRect>())

  useLayoutEffect(() => {
    const prev = seen.current
    const entries = prev.seed === state.seed && state.log.length >= prev.log ? state.log.slice(prev.log) : []
    seen.current = { seed: state.seed, log: state.log.length }
    if (layer.current && entries.length && speed > 0 && !motionOff()) play(layer.current, entries, state, me, speed, handRects.current)
  }, [state, me, speed])

  // After every render: where the hand's cards are (a played card flies from where it was).
  useLayoutEffect(() => {
    const rects = new Map<string, DOMRect>()
    for (const el of document.querySelectorAll<HTMLElement>('li[data-card]')) rects.set(el.dataset.card!, el.getBoundingClientRect())
    handRects.current = rects
  })

  return layer
}

function play(layer: HTMLElement, entries: readonly LogEntry[], state: GameState, me: number, speed: number, handRects: ReadonlyMap<string, DOMRect>) {
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
    }
  }
}
