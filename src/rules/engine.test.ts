import { describe, expect, it } from 'vitest'
import { applyAction, supplyLeft, createGame, currentPlayerId, eraScores, incomeOf, linkValueAt, planBuild, rankPlayers, roundsInEra, saleOptions, type RulesContext } from './engine'
import { resolveRulesData, type RulesData } from './data'
import { buildDeck, cardsRemoved } from './config/cards'
import { BRASS_MAP } from './map'
import { buildBlocker, buildOptions, legalActions, linkOptions, loanOptions } from './options'
import { configTables, RULES_DATA } from './rulesData'
import { COLORS, RuleError, type Action, type Card, type GameState, type Tile } from './state'
import type { IndustryId } from './tileTable'

/*
 * Every test runs on our real board with the PLACEHOLDER numbers (the real
 * ones aren't in docs/TILES.md yet). Tests name the placeholder values they
 * rely on, e.g. "cotton I costs £12 (placeholder)".
 */
const ctx: RulesContext = { data: RULES_DATA, map: BRASS_MAP }
const seats = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `P${i}`, isAI: false }))

let serial = 0
const L = (town: string): Card => ({ id: `t-loc-${town}-${++serial}`, kind: 'location', town })
const I = (industry: IndustryId): Card => ({ id: `t-ind-${industry}-${++serial}`, kind: 'industry', industry })

/**
 * A 2-player (or n-player) game in a known state: turn order 0, 1, …; P0 to
 * play; hands replaced when given (an empty hand gets one spare card, so the
 * round doesn't end, with income, as soon as P0 has played).
 */
function game(n = 2, options: { hands?: Card[][]; era?: 'canal' | 'rail'; round?: number; actions?: number; seed?: number } = {}): GameState {
  const s = createGame(ctx, seats(n), options.seed ?? 11)
  s.order = s.players.map((_, i) => i)
  s.turn = 0
  if (options.era) s.era = options.era
  if (options.round) s.round = options.round
  s.actionsLeft = options.actions ?? (s.era === 'canal' && s.round === 1 ? 1 : 2)
  options.hands?.forEach((hand, i) => (s.players[i].hand = hand.length || i === 0 ? hand : [L('oxford')]))
  return s
}

const tile = (owner: number, industry: IndustryId, level = 1, cubes = 0, flipped = false): Tile => ({ owner, industry, level, cubes, flipped })

function act(state: GameState, action: Action): GameState {
  return applyAction(state, ctx, currentPlayerId(state), action)
}

function code(fn: () => unknown): string {
  try {
    fn()
  } catch (error) {
    if (error instanceof RuleError) return error.code
    throw error
  }
  return 'no error'
}

/** Everyone passes until the round (or era) changes. */
function finishRound(state: GameState): GameState {
  const { era, round } = state
  let s = state
  while (!s.finished && s.era === era && s.round === round) {
    const p = currentPlayerId(s)
    if (s.players[p].hand.length === 0) s.players[p].hand = [L('oxford')]
    s = act(s, { type: 'pass', cards: [s.players[p].hand[0].id] })
  }
  return s
}

describe('setup (RULES.md §1)', () => {
  it('gives each player £30, the £0 income space (10), 0 VP, 8 cards and a full mat', () => {
    for (const n of [2, 3, 4]) {
      const s = createGame(ctx, seats(n), 5)
      for (const p of s.players) {
        expect(p.money).toBe(30)
        expect(p.incomeSpace).toBe(10)
        expect(incomeOf(ctx, p)).toBe(0)
        expect(p.vp).toBe(0)
        expect(p.hand).toHaveLength(8)
        expect(p.mat.cotton.reduce((a, b) => a + b)).toBe(12)
        expect(p.mat.shipyard[0]).toBe(RULES_DATA.industries.shipyard.levels[0].tiles)
      }
    }
  })

  it('gives random, different colours from purple/red/yellow/blue/white, and a random turn order', () => {
    const colours = new Set<string>()
    const orders = new Set<string>()
    for (let seed = 1; seed <= 20; seed++) {
      const s = createGame(ctx, seats(4), seed)
      const cs = s.players.map((p) => p.color)
      expect(new Set(cs).size).toBe(4)
      cs.forEach((c) => expect(COLORS).toContain(c))
      colours.add(cs.join())
      orders.add(s.order.join())
    }
    expect(colours.size).toBeGreaterThan(5)
    expect(orders.size).toBeGreaterThan(5)
  })

  it('is deterministic for a seed', () => {
    expect(createGame(ctx, seats(3), 42)).toEqual(createGame(ctx, seats(3), 42))
  })

  it('builds the deck for the player count: outer-ring town cards only in bigger games', () => {
    const towns = (s: GameState) => new Set([...s.deck, ...s.players.flatMap((p) => p.hand)].flatMap((c) => (c.kind === 'location' ? [c.town] : [])))
    expect(towns(createGame(ctx, seats(4), 1)).has('plymouth')).toBe(true)
    expect(towns(createGame(ctx, seats(3), 1)).has('plymouth')).toBe(false)
    expect(towns(createGame(ctx, seats(3), 1)).has('southampton')).toBe(true)
    expect(towns(createGame(ctx, seats(2), 1)).has('southampton')).toBe(false)
    const size = (n: number) => {
      const s = createGame(ctx, seats(n), 1)
      return s.deck.length + s.setAside.length + n * 8
    }
    expect([size(4), size(3), size(2)]).toEqual([66, 60, 42])
  })

  it('lasts 8 / 9 / 10 rounds per era for 4 / 3 / 2 players (the deck sizes), and starts with full markets', () => {
    expect([4, 3, 2].map((n) => roundsInEra(createGame(ctx, seats(n), 1), 'canal'))).toEqual([8, 9, 10])
    expect([4, 3, 2].map((n) => roundsInEra(createGame(ctx, seats(n), 1), 'rail'))).toEqual([8, 9, 10])
    expect(createGame(ctx, seats(2), 1).market).toEqual({ coal: 8, iron: 8 })
  })

  it('leaves out distant-market tiles marked "!" and those above the player count', () => {
    // Placeholder tiles (12): #5 and #10 are for 3+ players, #6 and #11 for 4 players, #7 is marked "!".
    const sorted = (n: number) => createGame(ctx, seats(n), 1).distant.deck.sort((a, b) => a - b)
    expect(sorted(2)).toEqual([0, 1, 2, 3, 4, 8, 9])
    expect(sorted(3)).toEqual([0, 1, 2, 3, 4, 5, 8, 9, 10])
    expect(sorted(4)).toEqual([0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11])
  })

  it('refuses fewer than 2 or more than 4 players', () => {
    expect(code(() => createGame(ctx, seats(1), 1))).toBe('input')
    expect(code(() => createGame(ctx, seats(5), 1))).toBe('input')
  })
})

describe('turns and rounds (§2)', () => {
  it('canal round 1 is 1 action each, then 2 actions per turn', () => {
    let s = game(2, { hands: [[L('oxford'), L('oxford')], [L('oxford'), L('oxford')]] })
    expect(s.actionsLeft).toBe(1)
    s = act(s, { type: 'pass', cards: [s.players[0].hand[0].id] })
    expect(currentPlayerId(s)).toBe(1)
    s = act(s, { type: 'pass', cards: [s.players[1].hand[0].id] })
    expect(s.round).toBe(2)
    expect(s.actionsLeft).toBe(2)
  })

  it('every action discards a card; the hand refills to 8 after each turn', () => {
    let s = game(2)
    const deck = s.deck.length
    const first = s.players[0].hand[0].id
    s = act(s, { type: 'pass', cards: [first] })
    expect(s.discard.map((c) => c.id)).toEqual([first])
    expect(s.players[0].hand).toHaveLength(8) // 1 action in round 1, so the turn is over: 1 card drawn
    expect(s.deck.length).toBe(deck - 1)
    expect(s.log.slice(-3)).toEqual([
      { kind: 'discard', player: 0, cards: [first] },
      { kind: 'pass', player: 0 },
      { kind: 'draw', player: 0, count: 1 },
    ])
    s = act(s, { type: 'pass', cards: [s.players[1].hand[0].id] })
    expect(s.round).toBe(2)
    // Round 2: 2 actions; no drawing until the turn is over.
    s = act(s, { type: 'pass', cards: [s.players[0].hand[0].id] })
    expect(s.players[0].hand).toHaveLength(7)
    s = act(s, { type: 'pass', cards: [s.players[0].hand[0].id] })
    expect(s.players[0].hand).toHaveLength(8)
    expect(s.deck.length).toBe(deck - 4)
  })

  it('orders the next round by money spent, least first; ties keep their order', () => {
    let s = game(3, { hands: [[L('oxford')], [L('oxford')], [L('oxford')]] })
    s = act(s, { type: 'build', cards: [s.players[0].hand[0].id], slot: 'oxford:0', industry: 'cotton' }) // £12 (placeholder)
    s = act(s, { type: 'pass', cards: [s.players[1].hand[0].id] })
    s = act(s, { type: 'pass', cards: [s.players[2].hand[0].id] })
    expect(s.order).toEqual([1, 2, 0])
    expect(s.players.map((p) => p.spent)).toEqual([0, 0, 0])
  })

  it('with 4 players: least spent first, ties keep their current relative order (a stable sort)', () => {
    let s = game(4, { hands: [[L('oxford')], [L('oxford')], [L('oxford')], [L('oxford')]] })
    s.order = [2, 0, 3, 1]
    s.players[2].spent = 5
    s.players[0].spent = 5
    s = finishRound(s)
    expect(s.order).toEqual([3, 1, 2, 0]) // £0: 3 then 1 (as they were); £5: 2 then 0 (as they were)
    s = finishRound(s)
    expect(s.order).toEqual([3, 1, 2, 0]) // nobody spent: the order stays
  })

  it("refuses a move when it isn't the player's turn", () => {
    const s = game(2)
    expect(code(() => applyAction(s, ctx, 1, { type: 'pass', cards: [s.players[1].hand[0].id] }))).toBe('not-your-turn')
  })

  it('refuses a card that isn\'t in the hand', () => {
    const s = game(2)
    expect(code(() => act(s, { type: 'pass', cards: ['nope'] }))).toBe('card')
  })
})

describe('build (§3)', () => {
  it('with a location card: any industry there, no network needed; the lowest tile, its £ cost', () => {
    const s0 = game(2, { hands: [[L('birmingham')], []] })
    const s = act(s0, { type: 'build', cards: [s0.players[0].hand[0].id], slot: 'birmingham:0', industry: 'cotton' })
    expect(s.tiles['birmingham:0']).toEqual(tile(0, 'cotton', 1))
    expect(s.players[0].money).toBe(30 - 12) // cotton I £12 (placeholder)
    expect(s.players[0].mat.cotton).toEqual([2, 3, 3, 3])
    expect(s.players[0].hand.map((c) => c.id)).not.toContain(s0.players[0].hand[0].id)
    expect(s.discard.map((c) => c.id)).toEqual([s0.players[0].hand[0].id])
    expect(s0.tiles).toEqual({}) // the old state isn't changed
  })

  it('with an industry card: only in your network', () => {
    const s = game(2, { hands: [[I('cotton')], []] })
    expect(code(() => act(s, { type: 'build', cards: [s.players[0].hand[0].id], slot: 'birmingham:0', industry: 'cotton' }))).toBe('network')
    s.tiles['lichfield:0'] = tile(0, 'coal', 1, 2)
    s.links['lichfield-birmingham'] = { owner: 0 }
    expect(act(s, { type: 'build', cards: [s.players[0].hand[0].id], slot: 'birmingham:0', industry: 'cotton' }).tiles['birmingham:0'].owner).toBe(0)
  })

  it('with two cards: as any location, using both actions', () => {
    const one = game(2, { hands: [[I('coal'), L('oxford')], []] })
    expect(code(() => act(one, { type: 'build', cards: one.players[0].hand.map((c) => c.id), slot: 'birmingham:0', industry: 'cotton' }))).toBe('two-cards')
    const two = game(2, { round: 2, hands: [[I('coal'), L('oxford')], [L('oxford')]] })
    const s = act(two, { type: 'build', cards: two.players[0].hand.map((c) => c.id), slot: 'birmingham:0', industry: 'cotton' })
    expect(s.tiles['birmingham:0'].owner).toBe(0)
    expect(currentPlayerId(s)).toBe(1)
  })

  it('refuses a card for another town or industry', () => {
    const s = game(2, { hands: [[L('oxford'), I('coal')], []], round: 2 })
    expect(code(() => act(s, { type: 'build', cards: [s.players[0].hand[0].id], slot: 'birmingham:0', industry: 'cotton' }))).toBe('card')
  })

  it('uses a slot showing only that industry before a mixed one', () => {
    const s = game(2, { hands: [[L('birmingham')], []] })
    // Birmingham: cotton, cotton, cotton/iron, coal.
    expect(code(() => act(s, { type: 'build', cards: [s.players[0].hand[0].id], slot: 'birmingham:2', industry: 'cotton' }))).toBe('slot-preference')
    s.tiles['birmingham:0'] = tile(1, 'cotton')
    s.tiles['birmingham:1'] = tile(1, 'cotton')
    expect(act(s, { type: 'build', cards: [s.players[0].hand[0].id], slot: 'birmingham:2', industry: 'cotton' }).tiles['birmingham:2'].owner).toBe(0)
  })

  it('refuses an industry the slot doesn\'t take', () => {
    const s = game(2, { hands: [[L('birmingham')], []] })
    expect(code(() => act(s, { type: 'build', cards: [s.players[0].hand[0].id], slot: 'birmingham:3', industry: 'cotton' }))).toBe('slot')
  })

  it('canal era: at most one of your tiles per town; rail era: no limit', () => {
    const s = game(2, { hands: [[L('birmingham')], []] })
    s.tiles['birmingham:0'] = tile(0, 'cotton')
    expect(code(() => act(s, { type: 'build', cards: [s.players[0].hand[0].id], slot: 'birmingham:1', industry: 'cotton' }))).toBe('one-per-town')
    const r = game(2, { era: 'rail', hands: [[L('birmingham')], []] })
    r.players[0].mat.cotton = [0, 3, 3, 3]
    r.tiles['birmingham:0'] = tile(0, 'cotton', 2)
    r.tiles['lichfield:0'] = tile(1, 'coal', 2, 3)
    r.links['lichfield-birmingham'] = { owner: 1 }
    expect(act(r, { type: 'build', cards: [r.players[0].hand[0].id], slot: 'birmingham:1', industry: 'cotton' }).tiles['birmingham:1'].owner).toBe(0)
  })

  it('era limits: rail-only towns and "not in canal/rail era" tiles', () => {
    const c = game(2, { hands: [[L('plymouth')], []] })
    expect(code(() => act(c, { type: 'build', cards: [c.players[0].hand[0].id], slot: 'plymouth:0', industry: 'iron' }))).toBe('era')
    const r = game(2, { era: 'rail', hands: [[L('oxford')], []] })
    expect(code(() => act(r, { type: 'build', cards: [r.players[0].hand[0].id], slot: 'oxford:0', industry: 'cotton' }))).toBe('era') // cotton I: not in rail era (placeholder)
    const y = game(2, { hands: [[L('plymouth')], []] })
    y.players[0].mat.shipyard = [0, 0, 2]
    y.era = 'canal'
    expect(buildBlocker(y, ctx, 0, 'shipyard')).toBe('era') // shipyard II: not in canal era
  })

  it('a locked shipyard (level 0) can\'t be built', () => {
    const r = game(2, { era: 'rail', hands: [[L('plymouth')], []] })
    expect(code(() => act(r, { type: 'build', cards: [r.players[0].hand[0].id], slot: 'plymouth:1', industry: 'shipyard' }))).toBe('locked')
    expect(buildBlocker(r, ctx, 0, 'shipyard')).toBe('locked')
  })

  it('never lets money go negative', () => {
    const s = game(2, { hands: [[L('oxford')], []] })
    s.players[0].money = 11
    expect(code(() => act(s, { type: 'build', cards: [s.players[0].hand[0].id], slot: 'oxford:0', industry: 'cotton' }))).toBe('money')
    expect(buildBlocker(s, ctx, 0, 'cotton')).toBe('money')
  })

  it('shipyards flip when built', () => {
    const r = game(2, { era: 'rail', hands: [[L('plymouth')], []] })
    r.players[0].mat.shipyard = [0, 2, 2]
    r.links['exeter-plymouth'] = { owner: 1 } // Exeter has a port slot: coal market access
    const s = act(r, { type: 'build', cards: [r.players[0].hand[0].id], slot: 'plymouth:1', industry: 'shipyard' })
    expect(s.tiles['plymouth:1']).toMatchObject({ flipped: true, level: 1 })
    expect(s.players[0].incomeSpace).toBe(10 + 2) // shipyard I income 2 (placeholder)
    expect(s.players[0].money).toBe(30 - 16 - 1 - 1) // £16 + market coal £1 + market iron £1
  })
})

describe('overbuilding (§3)', () => {
  it('your own tile: only with a higher level of the same industry', () => {
    const s = game(2, { hands: [[L('gloucester')], []] })
    s.tiles['gloucester:1'] = tile(0, 'cotton', 1)
    s.players[0].mat.cotton = [2, 3, 3, 3]
    expect(code(() => act(s, { type: 'build', cards: [s.players[0].hand[0].id], slot: 'gloucester:1', industry: 'cotton' }))).toBe('overbuild')
    s.players[0].mat.cotton = [0, 3, 3, 3]
    const after = act(s, { type: 'build', cards: [s.players[0].hand[0].id], slot: 'gloucester:1', industry: 'cotton' })
    expect(after.tiles['gloucester:1']).toMatchObject({ owner: 0, level: 2 })
  })

  it("another player's tile: only a coal mine or iron works, and only when none of that cube is left on the board", () => {
    const s = game(2, { hands: [[L('bristol')], []] })
    s.tiles['bristol:0'] = tile(1, 'cotton')
    expect(code(() => act(s, { type: 'build', cards: [s.players[0].hand[0].id], slot: 'bristol:0', industry: 'cotton' }))).toBe('overbuild')
    s.tiles['bristol:3'] = tile(1, 'coal', 1, 0, true)
    s.tiles['stoke:0'] = tile(1, 'coal', 1, 1)
    expect(code(() => act(s, { type: 'build', cards: [s.players[0].hand[0].id], slot: 'bristol:3', industry: 'coal' }))).toBe('overbuild')
    s.tiles['stoke:0'].cubes = 0
    expect(code(() => act(s, { type: 'build', cards: [s.players[0].hand[0].id], slot: 'bristol:3', industry: 'coal' }))).toBe('overbuild') // the market still has coal
    s.market.coal = 0
    const built = act(s, { type: 'build', cards: [s.players[0].hand[0].id], slot: 'bristol:3', industry: 'coal' })
    expect(built.tiles['bristol:3']).toMatchObject({ owner: 0, level: 1 })
    expect(built.market.coal).toBe(2) // Bristol is a trade location: the new mine sold its 2 cubes
  })
})

describe('coal and iron (§4)', () => {
  it('coal comes free from the closest connected mine (fewest links), any player\'s', () => {
    const s = game(2, { hands: [[L('birmingham')], []] })
    s.players[0].mat.cotton = [0, 3, 3, 3] // cotton II needs 1 coal (placeholder)
    s.tiles['lichfield:0'] = tile(1, 'coal', 1, 2)
    s.tiles['stoke:0'] = tile(1, 'coal', 1, 2)
    s.links['lichfield-birmingham'] = { owner: 1 }
    s.links['stoke-lichfield'] = { owner: 1 }
    const plan = planBuild(s, ctx, 0, { type: 'build', cards: [s.players[0].hand[0].id], slot: 'birmingham:0', industry: 'cotton' })
    expect(plan.coal).toEqual([{ from: 'lichfield:0', price: 0 }])
    expect(code(() => act(s, { type: 'build', cards: [s.players[0].hand[0].id], slot: 'birmingham:0', industry: 'cotton', coal: ['stoke:0'] }))).toBe('coal')
    const after = act(s, { type: 'build', cards: [s.players[0].hand[0].id], slot: 'birmingham:0', industry: 'cotton' })
    expect(after.tiles['lichfield:0'].cubes).toBe(1)
    expect(after.players[0].money).toBe(30 - 14)
  })

  it('then from the coal market at its price, if connected to a market place (hub or port town)', () => {
    const s = game(2, { hands: [[L('birmingham'), L('gloucester')], []], round: 2 })
    s.players[0].mat.cotton = [0, 3, 3, 3]
    expect(code(() => act(s, { type: 'build', cards: [s.players[0].hand[0].id], slot: 'birmingham:0', industry: 'cotton' }))).toBe('coal')
    const g = act(s, { type: 'build', cards: [s.players[0].hand[1].id], slot: 'gloucester:1', industry: 'cotton' })
    expect(g.players[0].money).toBe(30 - 14 - 1) // full market: cheapest cube £1 (placeholder)
    expect(g.market.coal).toBe(7)
  })

  it('the market gets dearer as it empties, and costs £5 a cube when empty', () => {
    const s = game(2, { hands: [[L('gloucester')], []] })
    s.players[0].mat.cotton = [0, 3, 3, 3]
    s.market.coal = 3 // filled: the three dearest spaces 3, 4, 4 (placeholder)
    expect(planBuild(s, ctx, 0, { type: 'build', cards: [s.players[0].hand[0].id], slot: 'gloucester:1', industry: 'cotton' }).coal).toEqual([{ from: 'market', price: 3 }])
    s.market.coal = 0
    expect(planBuild(s, ctx, 0, { type: 'build', cards: [s.players[0].hand[0].id], slot: 'gloucester:1', industry: 'cotton' }).coal).toEqual([{ from: 'market', price: 5 }])
  })

  it('iron comes from any iron works (no connection needed), then the iron market', () => {
    const s = game(2, { hands: [[L('gloucester')], []] })
    s.players[0].mat.cotton = [0, 0, 3, 3] // cotton III: 1 coal, 1 iron (placeholder)
    s.tiles['merthyr:0'] = tile(1, 'iron', 1, 1)
    const after = act(s, { type: 'build', cards: [s.players[0].hand[0].id], slot: 'gloucester:1', industry: 'cotton' })
    expect(after.tiles['merthyr:0']).toMatchObject({ cubes: 0, flipped: true }) // last cube: flips
    expect(after.players[1].incomeSpace).toBe(10 + 3) // iron I income 3 (placeholder)
    expect(after.players[0].money).toBe(30 - 16 - 1)
  })

  it('a new coal mine sells its cubes to the coal market at once, most expensive empty space first, and the owner is paid', () => {
    // Bristol has port slots: it is a trade location itself.
    const s = game(2, { hands: [[L('bristol')], []] })
    s.market.coal = 4 // empty spaces: £1, £1, £2, £2 (placeholder)
    const after = act(s, { type: 'build', cards: [s.players[0].hand[0].id], slot: 'bristol:3', industry: 'coal' })
    expect(after.market.coal).toBe(6)
    expect(after.players[0].money).toBe(30 - 5 + 2 + 2)
    expect(after.tiles['bristol:3']).toMatchObject({ cubes: 0, flipped: true })
    expect(after.players[0].incomeSpace).toBe(10 + 4) // coal I income 4 (placeholder)
    expect(after.log).toContainEqual({ kind: 'market-sale', player: 0, slot: 'bristol:3', industry: 'coal', cubes: 2, money: 4 })
  })

  it('a new mine gets only the cubes left in the supply (24 coal, 16 iron: config)', () => {
    const s = game(2, { hands: [[L('lichfield')], []] })
    const supply = ctx.data.markets.coal.supply
    // The market holds 8; put all but one of the rest on another mine.
    s.market.coal = 8
    s.tiles['wolverhampton:0'] = tile(1, 'coal', 2, supply - 8 - 1)
    expect(supplyLeft(s, ctx, 'coal')).toBe(1)
    const after = act(s, { type: 'build', cards: [s.players[0].hand[0].id], slot: 'lichfield:0', industry: 'coal' })
    expect(after.tiles['lichfield:0']).toMatchObject({ cubes: 1, flipped: false }) // coal I would get 2
    expect(supplyLeft(after, ctx, 'coal')).toBe(0)
  })

  it('a coal mine not connected to a trade location keeps its cubes', () => {
    const s = game(2, { hands: [[L('lichfield')], []] })
    s.market.coal = 4
    const after = act(s, { type: 'build', cards: [s.players[0].hand[0].id], slot: 'lichfield:0', industry: 'coal' })
    expect(after.tiles['lichfield:0']).toMatchObject({ cubes: 2, flipped: false })
    expect(after.market.coal).toBe(4)
    expect(after.log.some((e) => e.kind === 'market-sale')).toBe(false)
  })

  it('a new iron works always sells to the iron market (no connection needed); cubes that don\'t fit stay on the tile', () => {
    // Wrexham: no port, no links. Its own coal mine supplies the iron works' coal.
    const s = game(2, { hands: [[L('wrexham')], []] })
    s.tiles['wrexham:0'] = tile(1, 'coal', 1, 2)
    s.market.iron = 5 // empty spaces: £1, £1, £2 (placeholder)
    const after = act(s, { type: 'build', cards: [s.players[0].hand[0].id], slot: 'wrexham:1', industry: 'iron' })
    expect(after.market.iron).toBe(8)
    expect(after.tiles['wrexham:1']).toMatchObject({ cubes: 1, flipped: false }) // iron I: 4 cubes, 3 fit (placeholder)
    expect(after.players[0].money).toBe(30 - 5 + 2 + 1 + 1)
    expect(after.log).toContainEqual({ kind: 'market-sale', player: 0, slot: 'wrexham:1', industry: 'iron', cubes: 3, money: 4 })
  })

  it('buying takes the cheapest cube there is; an empty market still sells at £5', () => {
    const s = game(2, { hands: [[L('gloucester')], []] })
    s.players[0].mat.cotton = [0, 0, 3, 3] // cotton III: 1 coal, 1 iron (placeholder)
    s.market.iron = 3 // cubes on the three dearest spaces: £3, £4, £4
    expect(planBuild(s, ctx, 0, { type: 'build', cards: [s.players[0].hand[0].id], slot: 'gloucester:1', industry: 'cotton' }).iron).toEqual([{ from: 'market', price: 3 }])
    s.market.iron = 0
    expect(planBuild(s, ctx, 0, { type: 'build', cards: [s.players[0].hand[0].id], slot: 'gloucester:1', industry: 'cotton' }).iron).toEqual([{ from: 'market', price: 5 }])
  })
})

describe('network (§3)', () => {
  it('canal era: one canal, £3, no coal; anywhere while you have nothing on the board, then touching your network', () => {
    let s = game(2, { hands: [[L('oxford')], [L('oxford')]] })
    s = act(s, { type: 'network', cards: [s.players[0].hand[0].id], links: ['stoke-derby'] })
    expect(s.links['stoke-derby']).toEqual({ owner: 0 })
    expect(s.players[0].money).toBe(27)
    const t = game(2, { hands: [[L('oxford')], []] })
    t.links['stoke-derby'] = { owner: 0 }
    expect(code(() => act(t, { type: 'network', cards: [t.players[0].hand[0].id], links: ['barnstaple-exeter'] }))).toBe('network')
    expect(act(t, { type: 'network', cards: [t.players[0].hand[0].id], links: ['stoke-lichfield'] }).links['stoke-lichfield']).toBeDefined()
  })

  it('only this era\'s links, only once, and no canals to rail-only places', () => {
    const c = game(2, { hands: [[L('oxford')], []] })
    expect(code(() => act(c, { type: 'network', cards: [c.players[0].hand[0].id], links: ['the_north-stoke'] }))).toBe('link')
    c.links['stoke-derby'] = { owner: 1 }
    expect(code(() => act(c, { type: 'network', cards: [c.players[0].hand[0].id], links: ['stoke-derby'] }))).toBe('link')
    const r = game(2, { era: 'rail', hands: [[L('oxford')], []] })
    expect(code(() => act(r, { type: 'network', cards: [r.players[0].hand[0].id], links: ['stoke-derby'] }))).toBe('link')
  })

  it('rail era: one rail £5 + 1 coal, or two rails £15 + 2 coal', () => {
    const r = game(2, { era: 'rail', hands: [[L('oxford')], []] })
    r.tiles['bristol:0'] = tile(0, 'port', 2)
    const one = act(r, { type: 'network', cards: [r.players[0].hand[0].id], links: ['bristol-swindon'] })
    expect(one.players[0].money).toBe(30 - 5 - 1) // coal from the market via Bristol's port slot
    const two = act(r, { type: 'network', cards: [r.players[0].hand[0].id], links: ['bristol-swindon', 'oxford-swindon'] })
    expect(two.players[0].money).toBe(30 - 15 - 1 - 1)
    expect(Object.keys(two.links).sort()).toEqual(['bristol-swindon', 'oxford-swindon'])
  })

  it('each rail takes coal from the closest mine; the second takes the next when the first used the last cube', () => {
    const r = game(2, { era: 'rail', hands: [[L('oxford')], []] })
    r.tiles['bristol:0'] = tile(0, 'port', 2)
    r.tiles['swindon:1'] = tile(1, 'coal', 2, 1)
    const two = act(r, { type: 'network', cards: [r.players[0].hand[0].id], links: ['bristol-swindon', 'oxford-swindon'] })
    expect(two.tiles['swindon:1']).toMatchObject({ cubes: 0, flipped: true })
    expect(two.market.coal).toBe(7)
    expect(two.players[0].money).toBe(30 - 15 - 1)
  })

  it('lists legal link spaces for the UI', () => {
    const t = game(2, { hands: [[L('oxford')], []] })
    t.tiles['oxford:0'] = tile(0, 'cotton')
    expect(linkOptions(t, ctx, 0, 1).map((o) => o.link).sort()).toEqual(['birmingham-oxford', 'oxford-swindon', 'reading-oxford'])
  })
})

describe('develop (§3)', () => {
  it('removes 1 or 2 lowest tiles (any industries), 1 iron each', () => {
    let s = game(2, { hands: [[L('oxford')], [L('oxford')]] })
    s = act(s, { type: 'develop', cards: [s.players[0].hand[0].id], industries: ['cotton', 'coal'] })
    expect(s.players[0].mat.cotton).toEqual([2, 3, 3, 3])
    expect(s.players[0].mat.coal).toEqual([0, 2, 2, 2])
    expect(s.players[0].money).toBe(30 - 1 - 1)
    const t = game(2, { hands: [[L('oxford')], []] })
    const twice = act(t, { type: 'develop', cards: [t.players[0].hand[0].id], industries: ['iron', 'iron'] })
    expect(twice.players[0].mat.iron).toEqual([0, 0, 1, 1])
  })

  it('unlocks the shipyard (level 0 is removed only by developing)', () => {
    const s = game(2, { hands: [[L('oxford')], []] })
    const after = act(s, { type: 'develop', cards: [s.players[0].hand[0].id], industries: ['shipyard', 'shipyard'] })
    expect(after.players[0].mat.shipyard).toEqual([0, 2, 2])
  })

  it("can't remove a non-developable tile", () => {
    const tables = configTables()
    const table = tables.tiles
    const data: RulesData = resolveRulesData({
      ...tables,
      tiles: { ...table, industries: { ...table.industries, coal: { ...table.industries.coal, levels: table.industries.coal.levels.map((l, i) => (i === 0 ? { ...l, developable: false } : l)) } } },
    })
    const s = createGame({ data, map: BRASS_MAP }, seats(2), 11)
    s.order = [0, 1]
    s.turn = 0
    s.actionsLeft = 1
    expect(code(() => applyAction(s, { data, map: BRASS_MAP }, 0, { type: 'develop', cards: [s.players[0].hand[0].id], industries: ['coal'] }))).toBe('develop')
  })
})

/** Player 0 has a cotton mill in Oxford connected to London (a trade hub); with `second`, one in Gloucester too, and 2 cards. */
function distantGame({ second = false } = {}): GameState {
  const s = game(2, { hands: [second ? [L('oxford'), L('oxford')] : [L('oxford')], []], actions: second ? 2 : 1 })
  s.tiles['oxford:0'] = tile(0, 'cotton')
  s.links['reading-oxford'] = { owner: 1 }
  s.links['london-reading'] = { owner: 1 }
  if (second) {
    s.tiles['gloucester:1'] = tile(0, 'cotton')
    s.links['birmingham-oxford'] = { owner: 1 }
    s.links['wolverhampton-birmingham'] = { owner: 1 }
    s.links['wolverhampton-gloucester'] = { owner: 1 }
  }
  return s
}

describe('sell cotton (§3)', () => {
  it('via a port: flips your mill and the port; both owners gain their income', () => {
    const s = game(2, { hands: [[L('oxford')], []] })
    s.tiles['gloucester:1'] = tile(0, 'cotton')
    s.tiles['gloucester:0'] = tile(1, 'port')
    const after = act(s, { type: 'sell', cards: [s.players[0].hand[0].id], sale: { mill: 'gloucester:1', port: 'gloucester:0' } })
    expect(after.tiles['gloucester:1'].flipped).toBe(true)
    expect(after.tiles['gloucester:0'].flipped).toBe(true)
    expect(after.players[0].incomeSpace).toBe(15) // cotton I +5 (placeholder)
    expect(after.players[1].incomeSpace).toBe(13) // port I +3
  })

  it('needs a connection between the mill and the port', () => {
    const s = game(2, { hands: [[L('oxford')], []] })
    s.tiles['oxford:0'] = tile(0, 'cotton')
    s.tiles['gloucester:0'] = tile(1, 'port')
    expect(code(() => act(s, { type: 'sell', cards: [s.players[0].hand[0].id], sale: { mill: 'oxford:0', port: 'gloucester:0' } }))).toBe('sale')
  })

  it('via the distant market: the marker moves down by the tile, you gain that row\'s income, then the mill flips', () => {
    const s = game(2, { hands: [[L('oxford')], []] })
    s.tiles['oxford:0'] = tile(0, 'cotton')
    s.links['reading-oxford'] = { owner: 1 }
    s.links['london-reading'] = { owner: 1 }
    s.distant.deck = [0] // move 1 (placeholder)
    const after = act(s, { type: 'sell', cards: [s.players[0].hand[0].id], sale: { mill: 'oxford:0', distant: true } })
    expect(after.distant.marker).toBe(1)
    expect(after.players[0].incomeSpace).toBe(10 + 3 + 5) // row 1: 3; cotton I: 5
    expect(after.tiles['oxford:0'].flipped).toBe(true)
  })

  it('the track is the path in config: 3a, 3b, 2b, 2a, 1a, 1b, 0b, 0a, X, with incomes 3/3/2/2/1/1/0/0', () => {
    expect(ctx.data.distantMarket.spaces).toEqual(['3a', '3b', '2b', '2a', '1a', '1b', '0b', '0a', 'X'])
    expect(ctx.data.distantMarket.track).toEqual([3, 3, 2, 2, 1, 1, 0, 0, 'X'])
  })

  it('a successful sale pays the income of the row the marker ends in (3 / 2 / 1 / 0)', () => {
    for (const [marker, income] of [
      [0, 3],
      [2, 2],
      [3, 2],
      [4, 1],
      [6, 0],
      [7, 0],
    ] as const) {
      const s = distantGame()
      s.distant.marker = marker
      s.distant.deck = [8] // move 0 (placeholder): the marker stays on its space
      const after = act(s, { type: 'sell', cards: [s.players[0].hand[0].id], sale: { mill: 'oxford:0', distant: true } })
      expect(after.distant.marker).toBe(marker)
      expect(after.players[0].incomeSpace).toBe(10 + income + 5) // + cotton I: 5
      expect(after.log.find((e) => e.kind === 'sell')).toMatchObject({ distant: { move: 0, income } })
    }
  })

  it('landing exactly on X fails: nothing sold, no income, the card is spent, the market closes for the era', () => {
    const s = distantGame({ second: true })
    s.distant.marker = 7 // 0a
    s.distant.deck = [0, 1] // move 1 → X
    const after = act(s, { type: 'sell', cards: [s.players[0].hand[0].id], sale: { mill: 'oxford:0', distant: true } })
    expect(after.distant).toMatchObject({ marker: 8, closed: true })
    expect(after.tiles['oxford:0'].flipped).toBe(false)
    expect(after.players[0].incomeSpace).toBe(10)
    expect(after.players[0].hand).toHaveLength(1)
    expect(after.actionsLeft).toBe(1)
    expect(after.selling).toBeNull()
    expect(after.log.at(-1)).toMatchObject({ kind: 'sell-failed', mill: 'oxford:0', move: 1 })
    // With the marker on X, distant sales aren't offered at all.
    expect(saleOptions(after, ctx, 0)).toEqual([])
    expect(code(() => act(after, { type: 'sell', cards: [after.players[0].hand[0].id], sale: { mill: 'gloucester:1', distant: true } }))).toBe('distant-closed')
  })

  it('a tile that would take the marker past X fails too; the marker stops on X', () => {
    const s = distantGame()
    s.distant.marker = 5 // 1b
    s.distant.deck = [7] // move 4 → past X
    const after = act(s, { type: 'sell', cards: [s.players[0].hand[0].id], sale: { mill: 'oxford:0', distant: true } })
    expect(after.distant).toMatchObject({ marker: 8, closed: true })
    expect(after.tiles['oxford:0'].flipped).toBe(false)
    expect(after.players[0].incomeSpace).toBe(10)
  })

  it('continuing sales flip a new tile each; they stop at the first failure', () => {
    let s = distantGame({ second: true })
    s.distant.marker = 6 // 0b
    s.distant.deck = [8, 0, 1] // move 0 (sells, £0), then move 1 (0a, sells), then move 1 (X)
    s.tiles['bristol:0'] = tile(0, 'cotton')
    s.links['gloucester-bristol'] = { owner: 1 }
    s = act(s, { type: 'sell', cards: [s.players[0].hand[0].id], sale: { mill: 'oxford:0', distant: true } })
    expect(s.selling).toEqual({ player: 0 })
    expect(s.distant.used).toEqual([8])
    s = act(s, { type: 'sell-more', sale: { mill: 'gloucester:1', distant: true } })
    expect(s.distant.marker).toBe(7)
    expect(s.tiles['gloucester:1'].flipped).toBe(true)
    expect(s.selling).toEqual({ player: 0 })
    s = act(s, { type: 'sell-more', sale: { mill: 'bristol:0', distant: true } })
    expect(s.distant).toMatchObject({ marker: 8, closed: true, used: [8, 0, 1] })
    expect(s.tiles['bristol:0'].flipped).toBe(false)
    expect(s.selling).toBeNull()
    expect(code(() => act(s, { type: 'sell-more', sale: { mill: 'bristol:0', distant: true } }))).toBe('not-selling')
  })

  it('after a sale you may sell more mills without another card, then stop', () => {
    let s = game(2, { hands: [[L('oxford')], [L('oxford')]] })
    s.tiles['gloucester:1'] = tile(0, 'cotton')
    s.tiles['bristol:0'] = tile(0, 'cotton')
    s.tiles['gloucester:0'] = tile(1, 'port')
    s.tiles['bristol:1'] = tile(1, 'port')
    s = act(s, { type: 'sell', cards: [s.players[0].hand[0].id], sale: { mill: 'gloucester:1', port: 'gloucester:0' } })
    expect(s.selling).toEqual({ player: 0 })
    expect(code(() => act(s, { type: 'pass', cards: [] }))).toBe('selling')
    s = act(s, { type: 'sell-more', sale: { mill: 'bristol:0', port: 'bristol:1' } })
    expect(s.tiles['bristol:0'].flipped).toBe(true)
    expect(s.selling).toBeNull() // nothing left to sell: the action ends
    expect(currentPlayerId(s)).toBe(1)
  })
})

describe('loan and pass (§3)', () => {
  it('£10 / £20 / £30 moves income back 1 / 2 / 3 levels (to the top space of that level)', () => {
    for (const [amount, space] of [
      [10, 9],
      [20, 8],
      [30, 7],
    ] as const) {
      const s = game(2, { hands: [[L('oxford')], []] })
      const after = act(s, { type: 'loan', cards: [s.players[0].hand[0].id], amount })
      expect(after.players[0].money).toBe(30 + amount)
      expect(after.players[0].incomeSpace).toBe(space)
    }
    const up = game(2, { hands: [[L('oxford')], []] })
    up.players[0].incomeSpace = 22 // £6 (placeholder: spaces 21–22)
    expect(act(up, { type: 'loan', cards: [up.players[0].hand[0].id], amount: 10 }).players[0].incomeSpace).toBe(20) // top of £5
  })

  it('not below −£10 income, and not once the deck is empty', () => {
    const s = game(2, { hands: [[L('oxford')], []] })
    s.players[0].incomeSpace = 1 // −£9
    expect(code(() => act(s, { type: 'loan', cards: [s.players[0].hand[0].id], amount: 20 }))).toBe('loan')
    expect(loanOptions(s, ctx, 0).map((l) => l.problem === null)).toEqual([true, false, false])
    s.players[0].incomeSpace = 10
    s.deck = []
    expect(code(() => act(s, { type: 'loan', cards: [s.players[0].hand[0].id], amount: 10 }))).toBe('no-more-loans')
  })

  it('pass discards a card and does nothing else', () => {
    const s = game(2)
    const after = act(s, { type: 'pass', cards: [s.players[0].hand[0].id] })
    expect(after.players[0].money).toBe(30)
    expect(after.discard.map((c) => c.id)).toEqual([s.players[0].hand[0].id])
  })
})

describe('income (§2)', () => {
  it('everyone collects their income at the end of the round', () => {
    let s = game(2)
    s.players[0].incomeSpace = 20 // £5 (placeholder)
    s = finishRound(s)
    expect(s.players[0].money).toBe(35)
    expect(s.players[1].money).toBe(30)
  })

  it("negative income: pay it; if you can't, sell tiles for half their cost, then lose 1 VP per £ still owed", () => {
    let s = game(2)
    s.players[0].incomeSpace = 5 // −£5
    s.players[0].money = 2
    s.tiles['oxford:0'] = tile(0, 'cotton') // £12 → sells for £6
    s = finishRound(s)
    expect(s.tiles['oxford:0']).toBeUndefined()
    expect(s.players[0].money).toBe(2 + 6 - 5)
    let t = game(2)
    t.players[0].incomeSpace = 5
    t.players[0].money = 2
    t.players[0].vp = 10
    t = finishRound(t)
    expect(t.players[0]).toMatchObject({ money: 0, vp: 7 })
  })
})

describe('end of the canal era (§5)', () => {
  /** The last round of the canal era: the deck is used up and each player has one card left. */
  function canalEnd(): GameState {
    const s = game(2, { round: 10, actions: 1 })
    s.discard = [...s.deck, ...s.players.flatMap((p) => p.hand.slice(1))]
    s.deck = []
    s.players.forEach((p) => (p.hand = p.hand.slice(0, 1)))
    s.tiles['gloucester:1'] = tile(0, 'cotton', 1, 0, true)
    s.tiles['gloucester:0'] = tile(1, 'port', 1, 0, true)
    s.tiles['wolverhampton:0'] = tile(1, 'iron', 2, 4) // unflipped: no VP, no link icons
    s.links['wolverhampton-gloucester'] = { owner: 0 }
    s.links['london-reading'] = { owner: 1 }
    s.distant = { deck: [2, 3, 4], used: [0, 1], marker: 3, closed: true }
    return s
  }

  // The values come from config: level I of each industry, and London's link value.
  const cottonI = ctx.data.industries.cotton.levels[0]
  const portI = ctx.data.industries.port.levels[0]
  const london = ctx.data.hubs.london.linkValue

  it('scores links (flipped tiles\' link values, and hubs\') and flipped tiles', () => {
    const s = canalEnd()
    expect(linkValueAt(s, ctx, 'gloucester')).toBe(cottonI.link + portI.link)
    expect(linkValueAt(s, ctx, 'london')).toBe(london)
    expect(linkValueAt(s, ctx, 'reading')).toBe(0) // a stop
    expect(eraScores(s, ctx)).toEqual([
      { player: 0, links: cottonI.link + portI.link, tiles: cottonI.vp },
      { player: 1, links: london, tiles: portI.vp },
    ])
  })

  it('then removes canals and level I tiles, resets the distant market and deals new hands for the rail era', () => {
    const s = finishRound(canalEnd())
    expect(s.era).toBe('rail')
    expect(s.round).toBe(1)
    expect(s.players.map((p) => p.vp)).toEqual([cottonI.link + portI.link + cottonI.vp, london + portI.vp])
    expect(s.links).toEqual({})
    expect(s.tiles).toEqual({ 'wolverhampton:0': tile(1, 'iron', 2, 4) })
    expect(s.distant).toMatchObject({ used: [], marker: 0, closed: false })
    expect(s.distant.deck.sort()).toEqual([0, 1, 2, 3, 4])
    expect(s.players.map((p) => p.hand.length)).toEqual([8, 8])
    expect(s.actionsLeft).toBe(2)
    expect(s.discard).toEqual([])
    // Every card again (the canal era's set-aside ones too), less the rail era's put aside.
    expect(s.setAside).toHaveLength(cardsRemoved('rail', 2))
    expect(s.deck.length + s.setAside.length + 16).toBe(buildDeck(BRASS_MAP, 2).length)
    // The log names what came off (the board fades it away).
    const ended = s.log.find((e) => e.kind === 'era-end')
    expect(ended?.kind === 'era-end' && ended.removed).toEqual({
      tiles: { 'gloucester:1': tile(0, 'cotton', 1, 0, true), 'gloucester:0': tile(1, 'port', 1, 0, true) },
      links: { 'wolverhampton-gloucester': { owner: 0 }, 'london-reading': { owner: 1 } },
    })
  })
})

describe('end of the game (§6)', () => {
  it('scores the rail era, +1 VP per £10, no income after the last turn, and ranks the players', () => {
    // The last round of the game: the deck is used up and each player has one card left.
    let s = game(2, { era: 'rail', round: 10, actions: 1 })
    s.discard = [...s.deck, ...s.setAside, ...s.players.flatMap((p) => p.hand.slice(1))]
    s.deck = []
    s.setAside = []
    s.players.forEach((p) => (p.hand = p.hand.slice(0, 1)))
    s.players[0].money = 25
    s.players[1].money = 9
    s.players[1].incomeSpace = 30 // income would be paid if it were collected
    s.tiles['bristol:0'] = tile(1, 'cotton', 2, 0, true) // VP 5 (placeholder)
    s = finishRound(s)
    expect(s.finished).toBe(true)
    expect(s.players.map((p) => p.money)).toEqual([25, 9])
    expect(s.players.map((p) => p.vp)).toEqual([2, 5])
    expect(s.ranking).toEqual([1, 0])
    expect(code(() => act(s, { type: 'pass', cards: [] }))).toBe('game-over')
  })

  it('breaks ties by income position, then money', () => {
    const s = game(3)
    s.players.forEach((p) => (p.vp = 10))
    s.players[0].incomeSpace = 20
    s.players[1].incomeSpace = 25
    s.players[2].incomeSpace = 25
    s.players[2].money = 40
    expect(rankPlayers(s)).toEqual([2, 1, 0])
  })
})

describe('options for the UI and the computer players', () => {
  it('lists legal build slots, and every listed action is legal', () => {
    const s = game(2, { hands: [[L('birmingham'), I('coal')], []], round: 2 })
    expect(buildOptions(s, ctx, 0, 'cotton').map((o) => o.slot)).toContain('birmingham:0')
    for (const action of legalActions(s, ctx, 0)) expect(() => applyAction(s, ctx, 0, action)).not.toThrow()
  })
})
