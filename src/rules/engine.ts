/**
 * The Brass rules (docs/RULES.md) on our map. Pure and deterministic: every
 * function takes the state and returns a new one; randomness (cards, the
 * distant market) comes from the seeded generator kept in the state.
 *
 * Every illegal action throws a RuleError with a code (for the UI) and a
 * plain-English message. plan* functions check an action and work out its
 * cost without changing anything; applyAction checks and applies it.
 */

import {
  ACTIONS_PER_TURN,
  CANAL_COST,
  COAL_PER_RAIL,
  DOUBLE_RAIL_COST,
  FIRST_ROUND_ACTIONS,
  HAND_SIZE,
  IRON_PER_DEVELOP,
  LOANS,
  MAX_PLAYERS,
  MIN_INCOME,
  MIN_PLAYERS,
  MONEY_PER_VP,
  RAIL_COST,
  SHORTFALL_TILE_SHARE,
  START_INCOME_SPACE,
  START_MONEY,
} from './constants'
import { buildDeck, CANAL_SET_ASIDE_PER_PLAYER, LOANS_STOP, RAIL_MARKER_CARDS_PER_PLAYER, roundsFor } from './cards'
import { incomeAt, perIndustry, topSpaceOfLevel, type IndustryId, type IndustryLevel, type RulesData } from './data'
import { linkInEra, type BrassMap, type MapLink, type MapTown } from './map'
import { nextRandom, shuffle } from './random'
import { COLORS, RuleError, RULES_VERSION, type Action, type AILevel, type Card, type Era, type GameState, type LogEntry, type PlayerState, type Sale, type Source, type Tile } from './state'

/** The rules' numbers and the board: everything the engine needs besides the state. */
export interface RulesContext {
  readonly data: RulesData
  readonly map: BrassMap
}

export interface SeatSetup {
  readonly name: string
  readonly isAI: boolean
  readonly aiLevel?: AILevel
}

export interface GameOptions {
  /** Only towns up to this ring of the map are in play (the lobby mode's map size). Default: the whole map. */
  readonly mapRing?: 1 | 2 | 3
}

const MAX_SPACE = 100

/* ---- Setup ---------------------------------------------------------------------- */

export function createGame(ctx: RulesContext, seats: readonly SeatSetup[], seed: number, options: GameOptions = {}): GameState {
  const n = seats.length
  if (n < MIN_PLAYERS || n > MAX_PLAYERS) throw new RuleError('input', `Brass is for ${MIN_PLAYERS}–${MAX_PLAYERS} players, not ${n}`)
  let rng = seed | 0
  let colors: string[]
  ;[colors, rng] = shuffle([...COLORS], rng)
  let order: number[]
  ;[order, rng] = shuffle(
    seats.map((_, i) => i),
    rng,
  )

  // The deck (cards.ts), shuffled; 1 card per player set aside under it for the canal era.
  const mapRing = options.mapRing ?? 3
  let deck: Card[]
  ;[deck, rng] = shuffle(buildDeck(ctx.map, n, mapRing), rng)
  const setAside = deck.splice(Math.max(0, deck.length - CANAL_SET_ASIDE_PER_PLAYER * n))

  const players: PlayerState[] = seats.map((seat, i) => ({
    name: seat.name,
    color: colors[i] as PlayerState['color'],
    isAI: seat.isAI,
    aiLevel: seat.aiLevel ?? 'normal',
    money: START_MONEY,
    incomeSpace: START_INCOME_SPACE,
    vp: 0,
    hand: [],
    mat: perIndustry((id) => ctx.data.industries[id].levels.map((l) => l.tiles)),
    spent: 0,
  }))
  for (const p of players) p.hand = deck.splice(0, HAND_SIZE)

  let distantDeck: number[]
  ;[distantDeck, rng] = shuffle(
    ctx.data.distantMarket.tiles.flatMap((t, i) => (t.flagged || (t.players !== null && t.players > n) ? [] : [i])),
    rng,
  )

  const state: GameState = {
    version: RULES_VERSION,
    seed,
    rng,
    players,
    era: 'canal',
    round: 1,
    mapRing,
    order,
    turn: 0,
    actionsLeft: 0,
    deck,
    discard: [],
    setAside,
    tiles: {},
    links: {},
    market: { coal: ctx.data.markets.coal.spaces.length, iron: ctx.data.markets.iron.spaces.length },
    distant: { deck: distantDeck, used: [], marker: 0, closed: false },
    selling: null,
    finished: false,
    ranking: null,
    log: [
      { kind: 'deal', era: 'canal', cards: HAND_SIZE },
      { kind: 'round', era: 'canal', round: 1, order: [...order] },
    ],
  }
  startTurn(state, ctx)
  return state
}

/* ---- Queries -------------------------------------------------------------------- */

export function currentPlayerId(state: GameState): number {
  return state.selling?.player ?? state.order[state.turn]
}

export function incomeOf(ctx: RulesContext, player: PlayerState): number {
  return incomeAt(ctx.data, player.incomeSpace)
}

/** Is a place on this game's map (inside the lobby mode's rings)? */
export function inPlay(state: GameState, ctx: RulesContext, place: string): boolean {
  return (ctx.map.places[place]?.ring ?? 1) <= state.mapRing
}

/** Can the link be built this era: it exists in the era and both ends are in play. */
export function linkOpen(state: GameState, ctx: RulesContext, link: MapLink): boolean {
  return linkInEra(ctx.map, link, state.era) && inPlay(state, ctx, link.from) && inPlay(state, ctx, link.to)
}

/** Every card in the game (it never changes): deck, discard, set aside and hands. */
export function totalCards(state: GameState): number {
  return state.deck.length + state.discard.length + state.setAside.length + state.players.reduce((n, p) => n + p.hand.length, 0)
}

/** Rounds an era lasts: until everyone has played their hand out (canal era: without the cards set aside). */
export function roundsInEra(state: GameState, era: Era = state.era): number {
  const n = state.players.length
  const total = totalCards(state)
  return era === 'canal'
    ? roundsFor(Math.max(0, total - CANAL_SET_ASIDE_PER_PLAYER * n), n, HAND_SIZE, ACTIONS_PER_TURN, FIRST_ROUND_ACTIONS)
    : roundsFor(total, n, HAND_SIZE, ACTIONS_PER_TURN)
}

/** Rail era: the draw has reached the Rothschild marker (only the cards under it are left). */
export function railMarkerReached(state: GameState): boolean {
  return state.era === 'rail' && state.deck.length <= RAIL_MARKER_CARDS_PER_PLAYER * state.players.length
}

/** Actions a player gets on a turn this round. */
export function actionsThisRound(state: GameState): number {
  return state.era === 'canal' && state.round === 1 ? FIRST_ROUND_ACTIONS : ACTIONS_PER_TURN
}

/** Row index (in the tile table) of the lowest tile left on the mat, or -1. */
export function lowestLevelIndex(player: PlayerState, industry: IndustryId): number {
  return player.mat[industry].findIndex((n) => n > 0)
}

export function levelRow(ctx: RulesContext, industry: IndustryId, index: number): IndustryLevel {
  return ctx.data.industries[industry].levels[index]
}

/** The tile a player would build next in this industry (lowest level), or null when none are left. */
export function nextTile(ctx: RulesContext, player: PlayerState, industry: IndustryId): IndustryLevel | null {
  const i = lowestLevelIndex(player, industry)
  return i < 0 ? null : levelRow(ctx, industry, i)
}

function townOfSlot(ctx: RulesContext, slot: string): MapTown {
  const s = ctx.map.slots[slot]
  if (!s) throw new RuleError('input', `No slot "${slot}"`)
  return ctx.map.places[s.town] as MapTown
}

function hasAnythingOnBoard(state: GameState, player: number): boolean {
  return Object.values(state.tiles).some((t) => t.owner === player) || Object.values(state.links).some((l) => l.owner === player)
}

/** A player's network: places with their tiles, and both ends of their links. */
export function networkOf(state: GameState, ctx: RulesContext, player: number): Set<string> {
  const places = new Set<string>()
  for (const [slot, tile] of Object.entries(state.tiles)) if (tile.owner === player) places.add(ctx.map.slots[slot].town)
  for (const [id, link] of Object.entries(state.links)) {
    if (link.owner !== player) continue
    places.add(ctx.map.links[id].from)
    places.add(ctx.map.links[id].to)
  }
  return places
}

/** Links-away from `from` over built links (anyone's), plus `extra` links. Unreachable places are absent. */
export function distancesFrom(state: GameState, ctx: RulesContext, from: readonly string[], extra: readonly string[] = []): Map<string, number> {
  const built = new Set([...Object.keys(state.links), ...extra])
  const dist = new Map<string, number>(from.map((p) => [p, 0]))
  const queue = [...from]
  while (queue.length) {
    const place = queue.shift()!
    for (const link of ctx.map.linksAt[place] ?? []) {
      if (!built.has(link.id)) continue
      const other = link.from === place ? link.to : link.from
      if (dist.has(other)) continue
      dist.set(other, dist.get(place)! + 1)
      queue.push(other)
    }
  }
  return dist
}

/** Places that give access to the coal and iron markets (hubs, and towns with a port slot, per docs/TILES.md). */
function isMarketPlace(ctx: RulesContext, place: string): boolean {
  const p = ctx.map.places[place]
  if (p.kind === 'hub') return ctx.data.hubs[p.id]?.marketAccess ?? false
  if (p.kind === 'town') return ctx.data.portTownsGiveMarketAccess && p.hasPortSlot
  return false
}

export function hasMarketAccess(ctx: RulesContext, reachable: Map<string, number>): boolean {
  for (const place of reachable.keys()) if (isMarketPlace(ctx, place)) return true
  return false
}

/** Price of the next cube bought from a market holding `cubes` (filled spaces are the most expensive ones). */
export function marketBuyPrice(ctx: RulesContext, kind: 'coal' | 'iron', cubes: number): number {
  const m = ctx.data.markets[kind]
  return cubes <= 0 ? m.empty : m.spaces[m.spaces.length - cubes]
}

/** Money for the next cube sold to a market holding `cubes` (its most expensive empty space), or null when full. */
export function marketSellPrice(ctx: RulesContext, kind: 'coal' | 'iron', cubes: number): number | null {
  const m = ctx.data.markets[kind]
  return cubes >= m.spaces.length ? null : m.spaces[m.spaces.length - cubes - 1]
}

/* ---- Coal and iron ---------------------------------------------------------------- */

export interface CubeTake {
  /** Slot key of the tile, or 'market'. */
  readonly from: Source
  /** £ paid (0 from a tile). */
  readonly price: number
}

/**
 * Where `count` coal cubes come from for something at `places`: each from the
 * closest connected coal mine (fewest links; `chosen` picks among ties), then
 * the coal market (needs a connection to a market place; £ empty price when
 * it has none). Throws when there's no connected coal at all.
 */
export function planCoal(
  state: GameState,
  ctx: RulesContext,
  player: number,
  places: readonly string[],
  count: number,
  options: {
    /** Links being built in the same action (they connect too). */
    extraLinks?: readonly string[]
    chosen?: readonly Source[]
    /** Cubes in the coal market (after earlier purchases in the same action). */
    market?: number
    /** Cubes already taken from tiles earlier in the same action. */
    taken?: ReadonlyMap<string, number>
  } = {},
): { takes: CubeTake[]; marketLeft: number } {
  const { extraLinks = [], chosen, market = state.market.coal, taken } = options
  const takes: CubeTake[] = []
  if (count <= 0) return { takes, marketLeft: market }
  const dist = distancesFrom(state, ctx, places, extraLinks)
  const left = new Map(
    Object.entries(state.tiles).flatMap(([slot, t]) => {
      const cubes = t.cubes - (taken?.get(slot) ?? 0)
      return t.industry === 'coal' && cubes > 0 && dist.has(ctx.map.slots[slot].town) ? [[slot, cubes] as const] : []
    }),
  )
  let marketCubes = market
  for (let i = 0; i < count; i++) {
    const open = [...left].filter(([, n]) => n > 0).map(([slot]) => slot)
    const want = chosen?.[i]
    if (open.length) {
      const nearest = Math.min(...open.map((s) => dist.get(ctx.map.slots[s].town)!))
      const closest = open.filter((s) => dist.get(ctx.map.slots[s].town) === nearest)
      const pick = want ?? defaultSource(state, player, closest)
      if (!closest.includes(pick)) throw new RuleError('coal', `Coal must come from the closest connected coal mine (${closest.join(' or ')}), not ${pick}`)
      left.set(pick, left.get(pick)! - 1)
      takes.push({ from: pick, price: 0 })
    } else {
      if (!hasMarketAccess(ctx, dist)) throw new RuleError('coal', 'No coal: no connected coal mine with coal, and no connection to the coal market')
      if (want !== undefined && want !== 'market') throw new RuleError('coal', `No coal left at ${want}`)
      takes.push({ from: 'market', price: marketBuyPrice(ctx, 'coal', marketCubes) })
      marketCubes = Math.max(0, marketCubes - 1)
    }
  }
  return { takes, marketLeft: marketCubes }
}

/** Iron: from any iron works with iron (no connection needed; `chosen` picks which), then the iron market. */
export function planIron(state: GameState, ctx: RulesContext, player: number, count: number, chosen?: readonly Source[], market = state.market.iron): { takes: CubeTake[]; marketLeft: number } {
  const takes: CubeTake[] = []
  const left = new Map(Object.entries(state.tiles).flatMap(([slot, t]) => (t.industry === 'iron' && t.cubes > 0 ? [[slot, t.cubes] as const] : [])))
  let marketCubes = market
  for (let i = 0; i < count; i++) {
    const open = [...left].filter(([, n]) => n > 0).map(([slot]) => slot)
    const want = chosen?.[i]
    if (open.length) {
      const pick = want ?? defaultSource(state, player, open)
      if (!open.includes(pick)) throw new RuleError('iron', `Iron must come from an iron works with iron (${open.join(', ')}), not ${pick}`)
      left.set(pick, left.get(pick)! - 1)
      takes.push({ from: pick, price: 0 })
    } else {
      if (want !== undefined && want !== 'market') throw new RuleError('iron', `No iron left at ${want}`)
      takes.push({ from: 'market', price: marketBuyPrice(ctx, 'iron', marketCubes) })
      marketCubes = Math.max(0, marketCubes - 1)
    }
  }
  return { takes, marketLeft: marketCubes }
}

/** Among equal choices: the player's own tile first (its flip is theirs), then board order. */
function defaultSource(state: GameState, player: number, options: readonly string[]): string {
  return [...options].sort((a, b) => Number(state.tiles[b].owner === player) - Number(state.tiles[a].owner === player) || a.localeCompare(b))[0]
}

const cost = (takes: readonly CubeTake[]) => takes.reduce((n, t) => n + t.price, 0)

/* ---- Cards ---------------------------------------------------------------------- */

function cardsInHand(player: PlayerState, ids: readonly string[]): Card[] {
  if (new Set(ids).size !== ids.length) throw new RuleError('card', 'The same card twice')
  return ids.map((id) => {
    const card = player.hand.find((c) => c.id === id)
    if (!card) throw new RuleError('card', `Card ${id} isn't in your hand`)
    return card
  })
}

function oneCard(state: GameState, player: PlayerState, ids: readonly string[]): Card {
  if (ids.length !== 1) throw new RuleError('card', 'This action discards exactly 1 card')
  if (state.actionsLeft < 1) throw new RuleError('no-actions', 'No actions left this turn')
  return cardsInHand(player, ids)[0]
}

/* ---- Build ---------------------------------------------------------------------- */

export interface BuildPlan {
  readonly player: number
  readonly slot: string
  readonly town: string
  readonly industry: IndustryId
  readonly levelIndex: number
  readonly tile: IndustryLevel
  readonly cards: readonly string[]
  /** 2 when two cards are discarded (as any location card). */
  readonly actions: number
  readonly overbuild: Tile | null
  readonly coal: readonly CubeTake[]
  readonly iron: readonly CubeTake[]
  /** £ in all: the tile plus coal and iron bought. */
  readonly money: number
  /** Cubes the new mine or works sells to its market at once, and the £ they bring. */
  readonly sold: { readonly cubes: number; readonly money: number }
}

export function planBuild(state: GameState, ctx: RulesContext, playerId: number, action: Extract<Action, { type: 'build' }>): BuildPlan {
  const player = state.players[playerId]
  const town = townOfSlot(ctx, action.slot)
  const slot = ctx.map.slots[action.slot]
  const industry = action.industry
  if (!slot.industries.includes(industry)) throw new RuleError('slot', `${town.name} slot ${slot.index + 1} doesn't take a ${industry}`)
  if (!inPlay(state, ctx, town.id)) throw new RuleError('closed', `${town.name} isn't on this game's map`)
  if (state.era === 'canal' && town.railOnly) throw new RuleError('era', `${town.name} can only be built in during the rail era`)

  const levelIndex = lowestLevelIndex(player, industry)
  if (levelIndex < 0) throw new RuleError('no-tiles', `No ${industry} tiles left on your mat`)
  const tile = levelRow(ctx, industry, levelIndex)
  if (tile.locked) throw new RuleError('locked', `Your next ${industry} tile is locked: develop it away first`)
  if (state.era === 'canal' && tile.noCanal) throw new RuleError('era', `This ${industry} tile can't be built in the canal era`)
  if (state.era === 'rail' && tile.noRail) throw new RuleError('era', `This ${industry} tile can't be built in the rail era`)

  // Cards: a location card for this town, an industry card (town in your network), or any two cards (uses both actions).
  const cards = cardsInHand(player, action.cards)
  let actions = 1
  if (cards.length === 2) {
    if (state.actionsLeft < 2) throw new RuleError('two-cards', 'Building with two cards uses both actions: you have only one left')
    actions = 2
  } else if (cards.length === 1) {
    if (state.actionsLeft < 1) throw new RuleError('no-actions', 'No actions left this turn')
    const card = cards[0]
    if (card.kind === 'location') {
      if (card.town !== town.id) throw new RuleError('card', `That card is for ${ctx.map.places[card.town].name}, not ${town.name}`)
    } else {
      if (card.industry !== industry) throw new RuleError('card', `That card is for a ${card.industry}, not a ${industry}`)
      if (!networkOf(state, ctx, playerId).has(town.id)) throw new RuleError('network', `${town.name} isn't in your network (an industry card builds only there)`)
    }
  } else {
    throw new RuleError('card', 'Build with one card, or two cards as any location')
  }

  // The slot: empty (single-industry slots first), or an overbuild.
  const existing = state.tiles[action.slot] ?? null
  if (!existing) {
    if (slot.industries.length > 1 && town.slots.some((s) => s.industries.length === 1 && s.industries[0] === industry && !state.tiles[s.key])) {
      throw new RuleError('slot-preference', `Use ${town.name}'s ${industry}-only slot first`)
    }
  } else {
    if (existing.industry !== industry) throw new RuleError('overbuild', 'Only a tile of the same industry can be built over')
    if (existing.owner === playerId) {
      if (tile.level <= existing.level) throw new RuleError('overbuild', 'Your own tile can only be replaced by a higher level')
    } else {
      if (industry !== 'coal' && industry !== 'iron') throw new RuleError('overbuild', "Another player's tile can only be replaced if it's a coal mine or iron works")
      const cubesLeft = Object.values(state.tiles).some((t) => t.industry === industry && t.cubes > 0) || state.market[industry] > 0
      if (cubesLeft) throw new RuleError('overbuild', `Another player's ${industry === 'coal' ? 'coal mine' : 'iron works'} can only be replaced when no ${industry} is left on the board`)
    }
  }
  if (state.era === 'canal') {
    const mine = town.slots.some((s) => s.key !== action.slot && state.tiles[s.key]?.owner === playerId)
    if (mine) throw new RuleError('one-per-town', `In the canal era you can have only one industry tile in ${town.name}`)
  }

  // Coal (connected), then iron (anywhere), then money.
  const coal = planCoal(state, ctx, playerId, [town.id], tile.cost.coal, { chosen: action.coal })
  const iron = planIron(state, ctx, playerId, tile.cost.iron, action.iron)
  const money = tile.cost.money + cost(coal.takes) + cost(iron.takes)
  if (money > player.money) throw new RuleError('money', `This costs £${money}; you have £${player.money}`)

  // Selling the new tile's cubes to its market (coal or iron, when connected to a market place).
  let sold = { cubes: 0, money: 0 }
  if (action.sellCubes && (industry === 'coal' || industry === 'iron') && tile.cubes > 0) {
    const reach = distancesFrom(state, ctx, [town.id])
    if (hasMarketAccess(ctx, reach)) {
      let cubes = industry === 'coal' ? coal.marketLeft : iron.marketLeft
      let n = 0
      let income = 0
      while (n < tile.cubes) {
        const price = marketSellPrice(ctx, industry, cubes)
        if (price === null) break
        income += price
        cubes++
        n++
      }
      sold = { cubes: n, money: income }
    }
  }

  return { player: playerId, slot: action.slot, town: town.id, industry, levelIndex, tile, cards: action.cards, actions, overbuild: existing, coal: coal.takes, iron: iron.takes, money, sold }
}

/* ---- Network -------------------------------------------------------------------- */

export interface NetworkPlan {
  readonly player: number
  readonly links: readonly string[]
  readonly card: string
  readonly coal: readonly CubeTake[]
  readonly money: number
}

export function planNetwork(state: GameState, ctx: RulesContext, playerId: number, action: Extract<Action, { type: 'network' }>): NetworkPlan {
  const player = state.players[playerId]
  const card = oneCard(state, player, action.cards)
  const ids = action.links
  if (state.era === 'canal' && ids.length !== 1) throw new RuleError('link', 'In the canal era you build one canal at a time')
  if (state.era === 'rail' && (ids.length < 1 || ids.length > 2)) throw new RuleError('link', 'Build one rail, or two')
  if (new Set(ids).size !== ids.length) throw new RuleError('link', 'The same link twice')

  const network = networkOf(state, ctx, playerId)
  const anywhere = !hasAnythingOnBoard(state, playerId)
  const takes: CubeTake[] = []
  const taken = new Map<string, number>()
  let market = state.market.coal
  ids.forEach((id, i) => {
    const link = ctx.map.links[id]
    if (!link) throw new RuleError('input', `No link "${id}"`)
    if (!linkOpen(state, ctx, link)) throw new RuleError('link', `There's no ${state.era === 'canal' ? 'canal' : 'railway'} there in this era`)
    if (state.links[id]) throw new RuleError('link', 'That link is already built')
    if (!anywhere && !network.has(link.from) && !network.has(link.to)) throw new RuleError('network', 'A link must touch your network')
    network.add(link.from)
    network.add(link.to)
    if (state.era === 'rail') {
      const plan = planCoal(state, ctx, playerId, [link.from, link.to], COAL_PER_RAIL, {
        extraLinks: ids.slice(0, i + 1),
        chosen: action.coal?.slice(i * COAL_PER_RAIL, (i + 1) * COAL_PER_RAIL),
        market,
        taken,
      })
      for (const t of plan.takes) if (t.from !== 'market') taken.set(t.from, (taken.get(t.from) ?? 0) + 1)
      market = plan.marketLeft
      takes.push(...plan.takes)
    }
  })
  const base = state.era === 'canal' ? CANAL_COST : ids.length === 2 ? DOUBLE_RAIL_COST : RAIL_COST
  const money = base + cost(takes)
  if (money > player.money) throw new RuleError('money', `This costs £${money}; you have £${player.money}`)
  return { player: playerId, links: ids, card: card.id, coal: takes, money }
}

/* ---- Develop -------------------------------------------------------------------- */

export interface DevelopPlan {
  readonly player: number
  readonly card: string
  /** Industry and level row of each tile removed. */
  readonly removed: readonly { industry: IndustryId; levelIndex: number }[]
  readonly iron: readonly CubeTake[]
  readonly money: number
}

export function planDevelop(state: GameState, ctx: RulesContext, playerId: number, action: Extract<Action, { type: 'develop' }>): DevelopPlan {
  const player = state.players[playerId]
  const card = oneCard(state, player, action.cards)
  if (action.industries.length < 1 || action.industries.length > 2) throw new RuleError('develop', 'Develop removes 1 or 2 tiles')
  const mat = perIndustry((id) => [...player.mat[id]])
  const removed = action.industries.map((industry) => {
    const levelIndex = mat[industry].findIndex((n) => n > 0)
    if (levelIndex < 0) throw new RuleError('no-tiles', `No ${industry} tiles left on your mat`)
    if (!levelRow(ctx, industry, levelIndex).developable) throw new RuleError('develop', `Your next ${industry} tile can't be developed`)
    mat[industry][levelIndex]--
    return { industry, levelIndex }
  })
  const iron = planIron(state, ctx, playerId, removed.length * IRON_PER_DEVELOP, action.iron)
  const money = cost(iron.takes)
  if (money > player.money) throw new RuleError('money', `The iron costs £${money}; you have £${player.money}`)
  return { player: playerId, card: card.id, removed, iron: iron.takes, money }
}

/* ---- Sell ------------------------------------------------------------------------ */

/** Why a sale can't happen, or null when it can. */
export function saleProblem(state: GameState, ctx: RulesContext, playerId: number, sale: Sale): RuleError | null {
  const mill = state.tiles[sale.mill]
  if (!mill || mill.owner !== playerId || mill.industry !== 'cotton') return new RuleError('sale', 'Pick one of your cotton mills')
  if (mill.flipped) return new RuleError('sale', 'That mill has already sold')
  const millTown = ctx.map.slots[sale.mill].town
  const reach = distancesFrom(state, ctx, [millTown])
  if ('port' in sale) {
    const port = state.tiles[sale.port]
    if (!port || port.industry !== 'port') return new RuleError('sale', 'Pick a port')
    if (port.flipped) return new RuleError('sale', 'That port has already been used')
    if (!reach.has(ctx.map.slots[sale.port].town)) return new RuleError('sale', "The mill isn't connected to that port")
    return null
  }
  if (state.distant.closed) return new RuleError('sale', 'The distant market is closed for this era')
  if (!ctx.map.hubs.some((h) => reach.has(h.id))) return new RuleError('sale', "The mill isn't connected to a trade hub")
  return null
}

/** Every sale a player could make now. */
export function saleOptions(state: GameState, ctx: RulesContext, playerId: number): Sale[] {
  const out: Sale[] = []
  for (const [slot, tile] of Object.entries(state.tiles)) {
    if (tile.owner !== playerId || tile.industry !== 'cotton' || tile.flipped) continue
    for (const [portSlot, port] of Object.entries(state.tiles)) {
      if (port.industry !== 'port' || port.flipped) continue
      const sale = { mill: slot, port: portSlot }
      if (!saleProblem(state, ctx, playerId, sale)) out.push(sale)
    }
    const distant = { mill: slot, distant: true } as const
    if (!saleProblem(state, ctx, playerId, distant)) out.push(distant)
  }
  return out
}

/* ---- Loan -------------------------------------------------------------------------- */

export function loanProblem(state: GameState, ctx: RulesContext, playerId: number, amount: number): RuleError | null {
  const levels = LOANS[amount as keyof typeof LOANS]
  if (!levels) return new RuleError('loan', 'Loans are £10, £20 or £30')
  if (state.deck.length === 0) return new RuleError('no-more-loans', 'No loans once the draw deck is empty')
  if (LOANS_STOP === 'marker' && railMarkerReached(state)) return new RuleError('no-more-loans', 'No loans once the draw reaches the Rothschild marker')
  if (incomeOf(ctx, state.players[playerId]) - levels < MIN_INCOME) return new RuleError('loan', `Your income can't drop below £${MIN_INCOME}`)
  return null
}

/* ---- Applying actions -------------------------------------------------------------- */

function clone(state: GameState): GameState {
  return structuredClone(state)
}

function discardCards(state: GameState, playerId: number, ids: readonly string[]) {
  const player = state.players[playerId]
  for (const id of ids) {
    const i = player.hand.findIndex((c) => c.id === id)
    state.discard.push(player.hand.splice(i, 1)[0])
  }
  state.log.push({ kind: 'discard', player: playerId, cards: [...ids] })
}

/** After a turn: draw back up to a full hand while the deck lasts. */
function refill(state: GameState, playerId: number) {
  const p = state.players[playerId]
  let count = 0
  while (p.hand.length < HAND_SIZE && state.deck.length) {
    p.hand.push(state.deck.shift()!)
    count++
  }
  if (count) state.log.push({ kind: 'draw', player: playerId, count })
}

function pay(player: PlayerState, money: number) {
  player.money -= money
  player.spent += money
}

function advanceIncome(state: GameState, playerId: number, spaces: number) {
  const p = state.players[playerId]
  p.incomeSpace = Math.max(0, Math.min(MAX_SPACE, p.incomeSpace + spaces))
}

function flip(state: GameState, ctx: RulesContext, slot: string) {
  const tile = state.tiles[slot]
  if (tile.flipped) return
  tile.flipped = true
  const income = levelFor(ctx, tile).income
  advanceIncome(state, tile.owner, income)
  state.log.push({ kind: 'flip', player: tile.owner, slot, income })
}

export function levelFor(ctx: RulesContext, tile: Tile): IndustryLevel {
  return ctx.data.industries[tile.industry].levels.find((l) => l.level === tile.level && !l.locked)!
}

/** Takes cubes from tiles and markets; tiles left empty flip. */
function takeCubes(state: GameState, ctx: RulesContext, kind: 'coal' | 'iron', takes: readonly CubeTake[]) {
  for (const t of takes) {
    if (t.from === 'market') {
      state.market[kind] = Math.max(0, state.market[kind] - 1)
    } else {
      const tile = state.tiles[t.from]
      tile.cubes--
      if (tile.cubes === 0) flip(state, ctx, t.from)
    }
  }
}

/** Checks an action and applies it. Returns the new state; the old one isn't changed. */
export function applyAction(state: GameState, ctx: RulesContext, playerId: number, action: Action): GameState {
  if (state.finished) throw new RuleError('game-over', 'The game is over')
  if (playerId !== currentPlayerId(state)) throw new RuleError('not-your-turn', "It isn't your turn")
  if (state.selling && action.type !== 'sell-more' && action.type !== 'sell-stop') throw new RuleError('selling', 'Finish selling first: sell another mill or stop')
  if (!state.selling && (action.type === 'sell-more' || action.type === 'sell-stop')) throw new RuleError('not-selling', "You aren't selling")

  const next = clone(state)
  const player = next.players[playerId]
  switch (action.type) {
    case 'build': {
      const plan = planBuild(next, ctx, playerId, action)
      discardCards(next, playerId, plan.cards)
      next.actionsLeft -= plan.actions
      player.mat[plan.industry][plan.levelIndex]--
      takeCubes(next, ctx, 'coal', plan.coal)
      takeCubes(next, ctx, 'iron', plan.iron)
      pay(player, plan.money)
      next.tiles[plan.slot] = { owner: playerId, industry: plan.industry, level: plan.tile.level, cubes: plan.tile.cubes, flipped: false }
      next.log.push({
        kind: 'build',
        player: playerId,
        industry: plan.industry,
        level: plan.tile.level,
        slot: plan.slot,
        overbuilt: plan.overbuild?.owner,
        coal: plan.coal.length,
        iron: plan.iron.length,
        money: plan.money,
      })
      if (plan.industry === 'shipyard') flip(next, ctx, plan.slot)
      if (plan.sold.cubes > 0 && (plan.industry === 'coal' || plan.industry === 'iron')) {
        const tile = next.tiles[plan.slot]
        tile.cubes -= plan.sold.cubes
        next.market[plan.industry] += plan.sold.cubes
        player.money += plan.sold.money
        if (tile.cubes === 0) flip(next, ctx, plan.slot)
      }
      break
    }
    case 'network': {
      const plan = planNetwork(next, ctx, playerId, action)
      discardCards(next, playerId, [plan.card])
      next.actionsLeft -= 1
      takeCubes(next, ctx, 'coal', plan.coal)
      pay(player, plan.money)
      for (const id of plan.links) next.links[id] = { owner: playerId }
      next.log.push({ kind: 'network', player: playerId, links: [...plan.links], money: plan.money })
      break
    }
    case 'develop': {
      const plan = planDevelop(next, ctx, playerId, action)
      discardCards(next, playerId, [plan.card])
      next.actionsLeft -= 1
      for (const r of plan.removed) player.mat[r.industry][r.levelIndex]--
      takeCubes(next, ctx, 'iron', plan.iron)
      pay(player, plan.money)
      next.log.push({ kind: 'develop', player: playerId, industries: plan.removed.map((r) => r.industry), money: plan.money })
      break
    }
    case 'sell':
    case 'sell-more': {
      if (action.type === 'sell') {
        const card = oneCard(next, player, action.cards)
        const problem = saleProblem(next, ctx, playerId, action.sale)
        if (problem) throw problem
        discardCards(next, playerId, [card.id])
        next.actionsLeft -= 1
      } else {
        const problem = saleProblem(next, ctx, playerId, action.sale)
        if (problem) throw problem
      }
      const ok = sell(next, ctx, playerId, action.sale)
      next.selling = ok && saleOptions(next, ctx, playerId).length > 0 ? { player: playerId } : null
      break
    }
    case 'sell-stop':
      next.selling = null
      break
    case 'loan': {
      const card = oneCard(next, player, action.cards)
      const problem = loanProblem(next, ctx, playerId, action.amount)
      if (problem) throw problem
      discardCards(next, playerId, [card.id])
      next.actionsLeft -= 1
      const level = incomeOf(ctx, player) - LOANS[action.amount]
      player.incomeSpace = topSpaceOfLevel(ctx.data, level)
      player.money += action.amount
      next.log.push({ kind: 'loan', player: playerId, amount: action.amount })
      break
    }
    case 'pass': {
      const card = oneCard(next, player, action.cards)
      discardCards(next, playerId, [card.id])
      next.actionsLeft -= 1
      next.log.push({ kind: 'pass', player: playerId })
      break
    }
    default:
      throw new RuleError('input', `Unknown action ${(action as { type: string }).type}`)
  }
  advance(next, ctx)
  return next
}

/** One sale. Returns false when a distant-market sale fails (the market closes for the era). */
function sell(state: GameState, ctx: RulesContext, playerId: number, sale: Sale): boolean {
  if ('port' in sale) {
    flip(state, ctx, sale.mill)
    flip(state, ctx, sale.port)
    state.log.push({ kind: 'sell', player: playerId, mill: sale.mill, port: sale.port })
    return true
  }
  const track = ctx.data.distantMarket.track
  const tileIndex = state.distant.deck.shift()
  const move = tileIndex === undefined ? track.length : ctx.data.distantMarket.tiles[tileIndex].move
  if (tileIndex !== undefined) state.distant.used.push(tileIndex)
  state.distant.marker = Math.min(track.length - 1, state.distant.marker + move)
  const row = track[state.distant.marker]
  if (row === 'X' || tileIndex === undefined) {
    state.distant.closed = true
    state.log.push({ kind: 'sell-failed', player: playerId, mill: sale.mill, move })
    return false
  }
  advanceIncome(state, playerId, row)
  state.log.push({ kind: 'sell', player: playerId, mill: sale.mill, distant: { move, income: row } })
  flip(state, ctx, sale.mill)
  return true
}

/* ---- Turns, rounds, eras ------------------------------------------------------------ */

/** Starts the turn of the player at `state.turn`, skipping anyone without cards; ends the round when no one is left. */
function startTurn(state: GameState, ctx: RulesContext) {
  while (state.turn < state.order.length) {
    const player = state.players[state.order[state.turn]]
    state.actionsLeft = Math.min(actionsThisRound(state), player.hand.length)
    if (state.actionsLeft > 0) return
    state.turn++
  }
  endRound(state, ctx)
}

function advance(state: GameState, ctx: RulesContext) {
  if (state.selling || state.actionsLeft > 0 || state.finished) return
  refill(state, state.order[state.turn])
  state.turn++
  startTurn(state, ctx)
}

function endRound(state: GameState, ctx: RulesContext) {
  // The era ends when everyone has played their hand out (hands are refilled after each turn while the deck lasts).
  const eraOver = state.players.every((p) => p.hand.length === 0)
  const lastRoundOfGame = state.era === 'rail' && eraOver
  // 1. Least money spent goes first; ties keep their order.
  state.order = state.order.map((id, i) => ({ id, i })).sort((a, b) => state.players[a.id].spent - state.players[b.id].spent || a.i - b.i).map((x) => x.id)
  // 2. Spent money goes to the bank.
  for (const p of state.players) p.spent = 0
  // 3. Income (none after the very last turn of the game).
  if (!lastRoundOfGame) for (let id = 0; id < state.players.length; id++) collectIncome(state, ctx, id)
  if (eraOver) {
    endEra(state, ctx)
    return
  }
  state.round++
  state.turn = 0
  state.log.push({ kind: 'round', era: state.era, round: state.round, order: [...state.order] })
  startTurn(state, ctx)
}

function collectIncome(state: GameState, ctx: RulesContext, playerId: number) {
  const p = state.players[playerId]
  const income = incomeOf(ctx, p)
  state.log.push({ kind: 'income', player: playerId, amount: income })
  if (income >= 0 || p.money + income >= 0) {
    p.money += income
    return
  }
  // Can't pay: sell tiles for half their £ cost (unflipped first, then the fewest VP), then lose 1 VP per £ still owed.
  let owed = -(p.money + income)
  p.money = 0
  const tilesSold: string[] = []
  const mine = Object.entries(state.tiles)
    .filter(([, t]) => t.owner === playerId)
    .map(([slot, t]) => ({ slot, t, level: levelFor(ctx, t) }))
    .sort((a, b) => Number(a.t.flipped) - Number(b.t.flipped) || (a.t.flipped ? a.level.vp - b.level.vp : 0) || b.level.cost.money - a.level.cost.money || a.slot.localeCompare(b.slot))
  for (const { slot, level } of mine) {
    if (owed <= 0) break
    const refund = Math.floor(level.cost.money * SHORTFALL_TILE_SHARE)
    delete state.tiles[slot]
    tilesSold.push(slot)
    owed -= refund
  }
  let vpLost = 0
  if (owed > 0) {
    vpLost = Math.min(p.vp, owed)
    p.vp -= vpLost
  } else {
    p.money = -owed
  }
  state.log.push({ kind: 'shortfall', player: playerId, tilesSold, vpLost })
}

/** Link-value icons at a place: flipped tiles in a town, a hub's printed value, nothing at a stop. */
export function linkValueAt(state: GameState, ctx: RulesContext, place: string): number {
  const p = ctx.map.places[place]
  if (p.kind === 'hub') return ctx.data.hubs[p.id]?.linkValue ?? 0
  if (p.kind === 'stop') return 0
  return p.slots.reduce((n, s) => {
    const t = state.tiles[s.key]
    return t?.flipped ? n + levelFor(ctx, t).link : n
  }, 0)
}

/** VP each player scores now for links and flipped tiles (as at the end of an era). */
export function eraScores(state: GameState, ctx: RulesContext): { player: number; links: number; tiles: number }[] {
  const scores = state.players.map((_, player) => ({ player, links: 0, tiles: 0 }))
  for (const [id, link] of Object.entries(state.links)) {
    const l = ctx.map.links[id]
    scores[link.owner].links += linkValueAt(state, ctx, l.from) + linkValueAt(state, ctx, l.to)
  }
  for (const tile of Object.values(state.tiles)) if (tile.flipped) scores[tile.owner].tiles += levelFor(ctx, tile).vp
  return scores
}

function endEra(state: GameState, ctx: RulesContext) {
  const scores = eraScores(state, ctx)
  for (const s of scores) state.players[s.player].vp += s.links + s.tiles
  const removed = state.era === 'canal' ? { tiles: Object.fromEntries(Object.entries(state.tiles).filter(([, t]) => t.level === 1)), links: { ...state.links } } : undefined
  state.log.push({ kind: 'era-end', era: state.era, scores, ...(removed ? { removed: structuredClone(removed) } : {}) })

  if (state.era === 'rail') {
    for (const p of state.players) p.vp += Math.floor(p.money / MONEY_PER_VP)
    state.ranking = rankPlayers(state)
    state.finished = true
    state.actionsLeft = 0
    state.log.push({ kind: 'game-end', ranking: [...state.ranking] })
    return
  }

  // Into the rail era: canals and level I tiles come off, the distant market resets, all cards are reshuffled
  // (the Rothschild marker goes under the last RAIL_MARKER_CARDS_PER_PLAYER cards per player: see railMarkerReached).
  state.links = {}
  for (const [slot, tile] of Object.entries(state.tiles)) if (tile.level === 1) delete state.tiles[slot]
  let rng = state.rng
  ;[state.distant.deck, rng] = shuffle([...state.distant.deck, ...state.distant.used], rng)
  state.distant = { deck: state.distant.deck, used: [], marker: 0, closed: false }
  const all = [...state.deck, ...state.discard, ...state.setAside, ...state.players.flatMap((p) => p.hand)]
  ;[state.deck, rng] = shuffle(all, rng)
  state.rng = rng
  state.discard = []
  state.setAside = []
  state.log.push({ kind: 'deal', era: 'rail', cards: HAND_SIZE })
  for (const id of state.order) state.players[id].hand = state.deck.splice(0, HAND_SIZE)
  state.era = 'rail'
  state.round = 1
  state.turn = 0
  state.log.push({ kind: 'round', era: 'rail', round: 1, order: [...state.order] })
  startTurn(state, ctx)
}

/** Winner first: most VP, then the higher income position, then more money. */
export function rankPlayers(state: GameState): number[] {
  return state.players
    .map((p, id) => ({ p, id }))
    .sort((a, b) => b.p.vp - a.p.vp || b.p.incomeSpace - a.p.incomeSpace || b.p.money - a.p.money || a.id - b.id)
    .map((x) => x.id)
}

/** A random number from the game's generator (for the AI's variety), advancing it. */
export function drawRandom(state: GameState): number {
  const [r, next] = nextRandom(state.rng)
  state.rng = next
  return r
}

export type { LogEntry }
