/**
 * What a viewer may see of a game. The server keeps the full state; everyone
 * else gets a copy with the hidden information taken out:
 * - other players' hands (only how many cards they hold),
 * - the draw deck and the cards put aside (only how many),
 * - the order of the distant-market tiles still face down,
 * - the shuffle seed and the random generator's state.
 * A spectator (seat null) sees no hand at all.
 */

import type { Card, GameState } from '../rules/state'

/** A face-down card: nothing about it but that it's there. */
export const HIDDEN_CARD_PREFIX = 'hidden#'
const hidden = (n: number, from = 0): Card[] => Array.from({ length: n }, (_, i) => ({ id: `${HIDDEN_CARD_PREFIX}${from + i}`, kind: 'location', town: '' }))

export function isHiddenCard(card: Card): boolean {
  return card.id.startsWith(HIDDEN_CARD_PREFIX)
}

export function redactState(state: GameState, seat: number | null): GameState {
  let n = 0
  const cover = (cards: Card[]) => {
    const out = hidden(cards.length, n)
    n += cards.length
    return out
  }
  return {
    ...state,
    seed: 0,
    rng: 0,
    players: state.players.map((p, i) => (i === seat ? { ...p, hand: [...p.hand] } : { ...p, hand: cover(p.hand) })),
    deck: cover(state.deck),
    setAside: cover(state.setAside),
    distant: { ...state.distant, deck: state.distant.deck.map(() => -1) },
    log: state.log,
  }
}
