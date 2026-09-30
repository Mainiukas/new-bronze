/**
 * The cards: every card number in one place, so they're easy to change.
 *
 * - LOCATION_CARDS: cards per town, one per building slot (43 on the full map).
 * - INDUSTRY_CARDS: cards per industry (21).
 * - LOCATION_CARDS_MIN_PLAYERS: like the rulebook, 2- and 3-player games leave
 *   some location cards out. A town listed here only has its cards in games
 *   with at least that many players. (A proposal: see docs/BRASS_STATUS.md.)
 * - The deck flow: cards set aside in the canal era, cards under the
 *   Rothschild marker in the rail era, and when loans stop.
 *
 * Lobby modes on a smaller map (Blitz, Bullet) only use the cards of the
 * towns on their map.
 */

import type { BrassMap } from '../map'
import type { Card } from '../state'
import type { IndustryId } from '../tileTable'

/** Location cards per town id (our towns: see src/data/board.json). */
export const LOCATION_CARDS: Readonly<Record<string, number>> = {
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
}

/** Industry cards per industry. */
export const INDUSTRY_CARDS: Readonly<Record<IndustryId, number>> = {
  cotton: 7,
  coal: 5,
  iron: 3,
  port: 4,
  shipyard: 2,
}

/**
 * Towns whose location cards are only in games with at least this many
 * players. Chosen so the decks have the rulebook's sizes: 64 cards for 4
 * players, 54 for 3 and 40 for 2, which gives its 8, 9 and 10 rounds per era.
 */
export const LOCATION_CARDS_MIN_PLAYERS: Readonly<Record<string, 3 | 4>> = {
  // Out of 3- and 2-player games: the outer ring, Carmarthen and Nottingham (10 cards).
  caernarfon: 4,
  barnstaple: 4,
  exeter: 4,
  plymouth: 4,
  carmarthen: 4,
  nottingham: 4,
  // Also out of 2-player games: the rest of the middle ring, Stoke, Leicester and Lichfield (14 more).
  wrexham: 3,
  merthyr: 3,
  southampton: 3,
  stoke: 3,
  leicester: 3,
  lichfield: 3,
}

/** Canal era: cards per player set aside face down under the deck, not drawn that era. */
export const CANAL_SET_ASIDE_PER_PLAYER = 1

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
    if (place.ring > mapRing || (LOCATION_CARDS_MIN_PLAYERS[town] ?? 2) > players) continue
    const face = `loc_${slug(place.name)}`
    for (let i = 1; i <= count; i++) cards.push({ id: `${face}#${i}`, kind: 'location', town })
  }
  for (const [industry, count] of Object.entries(INDUSTRY_CARDS) as [IndustryId, number][]) {
    for (let i = 1; i <= count; i++) cards.push({ id: `${INDUSTRY_FACES[industry]}#${i}`, kind: 'industry', industry })
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
