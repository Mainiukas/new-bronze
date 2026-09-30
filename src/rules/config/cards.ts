/**
 * The cards: every card number in one place, so they're easy to change.
 *
 * - LOCATION_CARDS: cards per town (one per building slot on our map).
 * - INDUSTRY_CARDS: cards per industry. 66 cards in all.
 * - PLAYER_MARK: towns whose cards carry a player-count mark: they're only in
 *   games with at least that many players.
 * - CARDS_REMOVED: cards put aside face down at the start of each era (the
 *   canal-era ones come back when the rail era's deck is shuffled).
 * - The Rothschild marker in the rail era, and when loans stop.
 *
 * `unverified(label, value)` marks a number not checked against the physical
 * game yet (`verified: false`, listed in docs/TILES.md); a plain number is
 * checked. Lobby modes on a smaller map (Blitz, Bullet) only use the cards of
 * the towns on their map.
 */

import type { BrassMap } from '../map.ts'
import type { Card } from '../state.ts'
import { unverified, valueOf, type IndustryId, type Maybe } from '../tileTable.ts'

const check = <T,>(label: string, value: T) => unverified(label, value)
const n = <T,>(v: Maybe<T>): T => valueOf(v) as T

/** Location cards per town id (our towns: see src/data/board.json). */
export const LOCATION_CARDS: Readonly<Record<string, Maybe<number>>> = Object.fromEntries(
  Object.entries({
    // Inner ring
    birmingham: 4,
    bristol: 4,
    stoke: 3,
    wolverhampton: 3,
    derby: 2,
    leicester: 2,
    gloucester: 2,
    oxford: 2,
    swindon: 2,
    lichfield: 1,
    // Middle ring
    merthyr: 3,
    southampton: 3,
    wrexham: 2,
    carmarthen: 2,
    nottingham: 2,
    // Outer ring
    exeter: 2,
    plymouth: 2,
    caernarfon: 1,
    barnstaple: 1,
  }).map(([town, count]) => [town, check(`Cards: ${town} location cards`, count)]),
)

/** Industry cards per industry. */
export const INDUSTRY_CARDS: Readonly<Record<IndustryId, Maybe<number>>> = {
  cotton: check('Cards: cotton mill industry cards', 8),
  coal: check('Cards: coal mine industry cards', 5),
  iron: check('Cards: iron works industry cards', 3),
  port: check('Cards: port industry cards', 5),
  shipyard: check('Cards: shipyard industry cards', 2),
}

/** Cards in the full deck (the rulebook's component list). */
export const DECK_SIZE = 66

/**
 * Towns whose location cards carry a player-count mark: in games with fewer
 * players than the mark they're left out. With 4 players all 66 are used;
 * with 3, the six "4" cards are out (60); with 2, the "3" cards too (42).
 */
export const PLAYER_MARK: Readonly<Record<string, Maybe<3 | 4>>> = Object.fromEntries(
  Object.entries({
    caernarfon: 4,
    barnstaple: 4,
    exeter: 4,
    plymouth: 4,
    carmarthen: 3,
    nottingham: 3,
    wrexham: 3,
    merthyr: 3,
    southampton: 3,
    stoke: 3,
    leicester: 3,
    lichfield: 3,
  } as const).map(([town, mark]) => [town, check(`Cards: player-count mark on ${town}'s cards`, mark)]),
)

/**
 * Cards put aside face down at the start of each era, by player count
 * (rulebook: 3 players 9 / 6, 4 players 6 / 2). With them out, an era lasts
 * 8 / 9 / 10 rounds with 4 / 3 / 2 players.
 */
export const CARDS_REMOVED: Readonly<Record<'canal' | 'rail', Readonly<Record<2 | 3 | 4, Maybe<number>>>>> = {
  canal: { 2: check('Cards removed at the start of the canal era, 2 players', 4), 3: 9, 4: 6 },
  rail: { 2: check('Cards removed at the start of the rail era, 2 players', 2), 3: 6, 4: 2 },
}

/** Cards put aside at the start of an era. A mode on a smaller map sets aside 1 per player in the canal era, none in the rail era. */
export function cardsRemoved(era: 'canal' | 'rail', players: number, mapRing: 1 | 2 | 3 = 3): number {
  if (mapRing < 3) return era === 'canal' ? players : 0
  return n(CARDS_REMOVED[era][players as 2 | 3 | 4] ?? 0)
}

/** Rail era: cards per player under the Rothschild marker. */
export const RAIL_MARKER_CARDS_PER_PLAYER = 2

/**
 * When loans stop in the rail era: 'marker' (the gameplay spec: once the draw
 * reaches the Rothschild marker, no more loans; that round is the last in
 * which one was possible) or 'deck-empty' (RULES.md §3's wording: once the
 * draw deck is empty, one round later).
 */
export const LOANS_STOP: 'deck-empty' | 'marker' = 'marker'

/* ---- Card faces --------------------------------------------------------------- */

const INDUSTRY_FACES: Readonly<Record<IndustryId, string>> = {
  cotton: 'industry_cotton_mill',
  coal: 'industry_coal_mine',
  iron: 'industry_iron_works',
  port: 'industry_port',
  shipyard: 'industry_shipyard',
}

/** "Stoke-on-Trent" → "stoke_on_trent" (the art's file names). */
const slug = (name: string) => name.toLowerCase().replace(/[^a-z]+/g, '_')

/** The card's face: its id without the copy number, e.g. "loc_birmingham" or "industry_port" (assets/cards/front/<face>.png). */
export function faceOf(card: Card | string): string {
  const id = typeof card === 'string' ? card : card.id
  return id.split('#')[0]
}

/** Every card in a game with this many players, on a map cut to `mapRing` (1 = the core only, 3 = everything). */
export function buildDeck(map: BrassMap, players: number, mapRing: 1 | 2 | 3 = 3): Card[] {
  const cards: Card[] = []
  for (const [town, count] of Object.entries(LOCATION_CARDS)) {
    const place = map.places[town]
    if (!place || place.kind !== 'town') throw new Error(`Cards: "${town}" isn't a town on the board`)
    const mark = PLAYER_MARK[town]
    if (place.ring > mapRing || (mark === undefined ? 2 : n(mark)) > players) continue
    const face = `loc_${slug(place.name)}`
    for (let i = 1; i <= n(count); i++) cards.push({ id: `${face}#${i}`, kind: 'location', town })
  }
  for (const [industry, count] of Object.entries(INDUSTRY_CARDS) as [IndustryId, Maybe<number>][]) {
    for (let i = 1; i <= n(count); i++) cards.push({ id: `${INDUSTRY_FACES[industry]}#${i}`, kind: 'industry', industry })
  }
  return cards
}

/**
 * Rounds an era lasts with `cards` in play: everyone plays their hand out,
 * drawing back up to `handSize` after each turn while the deck lasts.
 * `firstRoundActions` is the first round's actions per player.
 */
export function roundsFor(cards: number, players: number, handSize: number, actions: number, firstRoundActions = actions): number {
  let deck = cards
  const hands = Array.from({ length: players }, () => {
    const n = Math.min(handSize, deck)
    deck -= n
    return n
  })
  let rounds = 0
  while (hands.some((h) => h > 0)) {
    rounds++
    for (let p = 0; p < players; p++) {
      hands[p] -= Math.min(rounds === 1 ? firstRoundActions : actions, hands[p])
      const draw = Math.min(handSize - hands[p], deck)
      hands[p] += draw
      deck -= draw
    }
  }
  return rounds
}
