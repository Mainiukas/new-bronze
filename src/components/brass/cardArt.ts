/**
 * Card images: the fronts and back at web size (assets/cards/web, made from
 * assets/cards/front by tools/card-webp.mjs) and the deck icons.
 */

import deckUrl from '../../../assets/cards/deck.svg'
import deckTrainUrl from '../../../assets/cards/deck_train.svg'
import noLoanUrl from '../../../assets/cards/no_loan.svg'
import { faceOf } from '../../rules/cards'
import { railMarkerReached } from '../../rules/engine'
import type { Card, GameState } from '../../rules/state'

const WEB = import.meta.glob<string>('../../../assets/cards/web/*.webp', { eager: true, import: 'default' })
const byName = Object.fromEntries(Object.entries(WEB).map(([path, url]) => [path.split('/').at(-1)!.replace('.webp', ''), url]))

export const CARD_BACK_URL = byName.card_back ?? ''
export const DECK_URL = deckUrl
export const DECK_TRAIN_URL = deckTrainUrl
export const NO_LOAN_URL = noLoanUrl

/** The front of a card (by card or card id). */
export function cardArt(card: Card | string): string {
  return byName[faceOf(card)] ?? CARD_BACK_URL
}

/** Card width ÷ height (600 × 840). */
export const CARD_RATIO = 600 / 840

/** What the deck shows: the deck, the train (canal deck used up), or the no-loan coin (rail era: last round of loans, then none). */
export type DeckMode = 'deck' | 'train' | 'last-loans' | 'no-loans'

export function deckMode(state: GameState): DeckMode {
  if (state.era === 'canal') return state.deck.length ? 'deck' : 'train'
  if (!state.deck.length) return 'no-loans'
  return railMarkerReached(state) ? 'last-loans' : 'deck'
}
