import { describe, expect, it } from 'vitest'
import { buildDeck, CANAL_SET_ASIDE_PER_PLAYER, faceOf, INDUSTRY_CARDS, LOCATION_CARDS, LOCATION_CARDS_MIN_PLAYERS, RAIL_MARKER_CARDS_PER_PLAYER } from './cards'
import { HAND_SIZE } from './constants'
import { applyAction, createGame, currentPlayerId, incomeOf, loanProblem, railMarkerReached, roundsInEra, type RulesContext } from './engine'
import { BRASS_MAP } from './map'
import { linkOptions } from './options'
import { PLACEHOLDER_DATA } from './placeholder'
import type { Card, GameState } from './state'

const ctx: RulesContext = { data: PLACEHOLDER_DATA, map: BRASS_MAP }
const seats = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `P${i}`, isAI: false }))
const count = (cards: readonly Card[], pick: (c: Card) => string) => cards.reduce<Record<string, number>>((m, c) => ({ ...m, [pick(c)]: (m[pick(c)] ?? 0) + 1 }), {})
const everyCard = (s: GameState) => [...s.deck, ...s.discard, ...s.setAside, ...s.players.flatMap((p) => p.hand)]

/** The current player passes with their first card. */
const pass = (s: GameState) => applyAction(s, ctx, currentPlayerId(s), { type: 'pass', cards: [s.players[currentPlayerId(s)].hand[0].id] })

describe('the deck (cards.ts)', () => {
  it('has 64 playable cards on the full map: 43 location cards and 21 industry cards', () => {
    const deck = buildDeck(BRASS_MAP, 4)
    expect(deck).toHaveLength(64)
    expect(deck.filter((c) => c.kind === 'location')).toHaveLength(43)
    expect(count(deck.filter((c) => c.kind === 'industry'), (c) => (c.kind === 'industry' ? c.industry : ''))).toEqual({ cotton: 7, coal: 5, iron: 3, port: 4, shipyard: 2 })
    expect(Object.values(INDUSTRY_CARDS).reduce((a, b) => a + b)).toBe(21)
  })

  it('has one location card per building slot: Birmingham and Bristol 4, the 3-slot towns 3, …', () => {
    for (const town of BRASS_MAP.towns) expect([town.id, LOCATION_CARDS[town.id]]).toEqual([town.id, town.slots.length])
    expect(Object.keys(LOCATION_CARDS).sort()).toEqual(BRASS_MAP.towns.map((t) => t.id).sort())
  })

  it('names each card loc_<town> or industry_<name>, with a copy number, and every face has its art', () => {
    const deck = buildDeck(BRASS_MAP, 4)
    expect(new Set(deck.map((c) => c.id)).size).toBe(64)
    expect(deck.find((c) => c.kind === 'location' && c.town === 'stoke')?.id).toBe('loc_stoke_on_trent#1')
    expect(deck.find((c) => c.kind === 'industry' && c.industry === 'cotton')?.id).toBe('industry_cotton_mill#1')
    const faces = new Set(deck.map(faceOf))
    expect(faces.size).toBe(24)
    const art = new Set(Object.keys(import.meta.glob('../../assets/cards/front/*.png')).map((path) => path.split('/').at(-1)!.replace('.png', '')))
    for (const face of faces) expect([face, art.has(face)]).toEqual([face, true])
  })

  it('leaves out location cards in smaller games, like the rulebook: 64 / 54 / 40 cards for 4 / 3 / 2 players', () => {
    expect([4, 3, 2].map((n) => buildDeck(BRASS_MAP, n).length)).toEqual([64, 54, 40])
    const towns = (n: number) => new Set(buildDeck(BRASS_MAP, n).flatMap((c) => (c.kind === 'location' ? [c.town] : [])))
    const out3 = BRASS_MAP.towns.filter((t) => !towns(3).has(t.id)).map((t) => t.id)
    const out2 = BRASS_MAP.towns.filter((t) => !towns(2).has(t.id)).map((t) => t.id)
    expect(out3.sort()).toEqual(['barnstaple', 'caernarfon', 'carmarthen', 'exeter', 'nottingham', 'plymouth'])
    expect(out2.sort()).toEqual(['barnstaple', 'caernarfon', 'carmarthen', 'exeter', 'leicester', 'lichfield', 'merthyr', 'nottingham', 'plymouth', 'southampton', 'stoke', 'wrexham'])
    expect(Object.keys(LOCATION_CARDS_MIN_PLAYERS).sort()).toEqual(out2.sort())
  })

  it('smaller maps (Blitz, Bullet) only have the cards of their towns', () => {
    expect([3, 2, 1].map((ring) => buildDeck(BRASS_MAP, 4, ring as 1 | 2 | 3).length)).toEqual([64, 58, 46])
    for (const card of buildDeck(BRASS_MAP, 4, 1)) if (card.kind === 'location') expect(BRASS_MAP.places[card.town].ring).toBe(1)
    const bullet = createGame(ctx, seats(4), 3, { mapRing: 1 })
    expect(everyCard(bullet)).toHaveLength(46)
  })

  it('towns off a smaller map are out of play: no building there, no links to them', () => {
    const s = createGame(ctx, seats(2), 3, { mapRing: 1 })
    const me = currentPlayerId(s)
    s.players[me].hand = [{ id: 'joker-a', kind: 'industry', industry: 'port' }, { id: 'joker-b', kind: 'industry', industry: 'port' }]
    s.actionsLeft = 2
    const build = (slot: string) => {
      try {
        applyAction(s, ctx, me, { type: 'build', cards: ['joker-a', 'joker-b'], slot, industry: 'cotton' })
        return 'ok'
      } catch (error) {
        return (error as { code?: string }).code
      }
    }
    expect(build('carmarthen:0')).toBe('closed') // ring 2
    expect(build('oxford:0')).toBe('ok') // ring 1 (cotton needs no coal)
    const offMap = Object.values(BRASS_MAP.links).filter((l) => [l.from, l.to].some((p) => BRASS_MAP.places[p].ring > 1))
    expect(offMap.length).toBeGreaterThan(0)
    for (const link of offMap) expect(linkOptions(s, ctx, me, 1).map((o) => o.link)).not.toContain(link.id)
  })
})

describe('dealing and the canal era (RULES.md §1–§2)', () => {
  it('sets 1 card per player aside, deals 8 each, and keeps the rest as the draw deck', () => {
    for (const n of [2, 3, 4]) {
      const s = createGame(ctx, seats(n), 7)
      expect(s.setAside).toHaveLength(CANAL_SET_ASIDE_PER_PLAYER * n)
      for (const p of s.players) expect(p.hand).toHaveLength(HAND_SIZE)
      expect(everyCard(s)).toHaveLength(buildDeck(BRASS_MAP, n).length)
      expect(s.log[0]).toEqual({ kind: 'deal', era: 'canal', cards: 8 })
    }
  })

  it('never draws the set-aside cards; the era ends when every hand is played out', () => {
    let s = createGame(ctx, seats(4), 9)
    const aside = s.setAside.map((c) => c.id)
    let rounds = 1
    while (s.era === 'canal') {
      const round = s.round
      s = pass(s)
      if (s.era === 'canal') {
        expect(s.setAside.map((c) => c.id)).toEqual(aside)
        if (s.round !== round) rounds++
        // Draws come only from the deck: hands never hold a set-aside card.
        for (const p of s.players) for (const c of p.hand) expect(aside).not.toContain(c.id)
      }
    }
    expect(rounds).toBe(8)
    expect(s.round).toBe(1)
  })

  it('hands shrink once the deck is used up (8 → 6 → 4 → 2), and income is still paid at the end of the canal era', () => {
    let s = createGame(ctx, seats(2), 4)
    s.players[0].incomeSpace = 20 // £5 (placeholder)
    const sizes: number[] = []
    while (s.era === 'canal') {
      const p = currentPlayerId(s)
      s = pass(s)
      const turnOver = p === 0 && (s.era !== 'canal' || currentPlayerId(s) !== 0)
      if (turnOver && s.era === 'canal' && s.deck.length === 0) sizes.push(s.players[0].hand.length)
    }
    expect(sizes).toEqual([8, 6, 4, 2]) // the deck runs out on P0's draw; then 2 fewer each turn, and the era ends at 0
    expect(s.players[0].money).toBe(30 + 5 * 10) // 10 rounds of £5, the last one included
  })
})

describe('the rail era (§5): every card reshuffled, the Rothschild marker, loans', () => {
  function railStart(n: number, seed = 5): GameState {
    let s = createGame(ctx, seats(n), seed)
    while (s.era === 'canal') s = pass(s)
    return s
  }

  it('reshuffles all the cards, the set-aside ones too, and deals 8 each', () => {
    for (const n of [2, 3, 4]) {
      const s = railStart(n)
      expect(s.setAside).toEqual([])
      expect(s.discard).toEqual([])
      expect(everyCard(s)).toHaveLength(buildDeck(BRASS_MAP, n).length)
      for (const p of s.players) expect(p.hand).toHaveLength(8)
      expect(s.log.filter((e) => e.kind === 'deal').at(-1)).toEqual({ kind: 'deal', era: 'rail', cards: 8 })
    }
  })

  it('puts 2 cards per player under the marker: the draw reaches it one round before the deck runs out', () => {
    for (const n of [2, 3, 4]) {
      let s = railStart(n)
      let reachedIn: number | null = null
      let emptyAfter: number | null = null
      while (!s.finished) {
        const round = s.round
        s = pass(s)
        if (reachedIn === null && railMarkerReached(s)) {
          reachedIn = round
          expect(s.deck.length).toBeLessThanOrEqual(RAIL_MARKER_CARDS_PER_PLAYER * n)
        }
        if (emptyAfter === null && s.deck.length === 0) emptyAfter = round
      }
      expect([n, emptyAfter! - reachedIn!]).toEqual([n, 1])
    }
  })

  it('still allows loans after the draw reaches the marker, and none once the deck is empty (RULES.md §3)', () => {
    let s = railStart(4)
    while (!railMarkerReached(s)) s = pass(s)
    const me = currentPlayerId(s)
    expect(s.deck.length).toBeGreaterThan(0)
    expect(loanProblem(s, ctx, me, 10)).toBeNull()
    const loan = applyAction(s, ctx, me, { type: 'loan', cards: [s.players[me].hand[0].id], amount: 10 })
    expect(loan.players[me].money).toBe(s.players[me].money + 10)
    while (s.deck.length > 0) s = pass(s)
    expect(loanProblem(s, ctx, currentPlayerId(s), 10)?.code).toBe('no-more-loans')
  })

  it('ends the game after its last round without paying income', () => {
    let s = railStart(2)
    s.players.forEach((p) => (p.incomeSpace = 20)) // £5 each (placeholder)
    let paid = 0
    let rounds = 1
    while (!s.finished) {
      const round = s.round
      const money = s.players[0].money
      s = pass(s)
      if (!s.finished && s.round !== round) {
        rounds++
        paid += s.players[0].money - money
      }
      if (s.finished) expect(s.players[0].money).toBe(money) // the last round: no income
    }
    expect(rounds).toBe(10)
    expect(paid).toBe(9 * 5)
    expect(incomeOf(ctx, s.players[0])).toBe(5)
  })

  it('the round count follows the deck: Bullet (the core only) is shorter', () => {
    const s = createGame(ctx, seats(4), 1, { mapRing: 1 })
    expect([roundsInEra(s, 'canal'), roundsInEra(s, 'rail')]).toEqual([6, 6])
  })
})
