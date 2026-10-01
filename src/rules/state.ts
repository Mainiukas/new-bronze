/** The game state and actions of the Brass rules (see docs/RULES.md). Plain data: saved as JSON. */

import type { IndustryId } from './tileTable'

/** Bump when the saved shape changes: older saved matches aren't resumed. */
export const RULES_VERSION = 2

export type Era = 'canal' | 'rail'
export const COLORS = ['purple', 'red', 'yellow', 'blue', 'white'] as const
export type PlayerColor = (typeof COLORS)[number]
export type AILevel = 'easy' | 'normal' | 'hard'

/** A card in play. `id` is its face plus a copy number, e.g. "loc_birmingham#2" (see cards.ts). */
export type Card = { readonly id: string; readonly kind: 'location'; readonly town: string } | { readonly id: string; readonly kind: 'industry'; readonly industry: IndustryId }

/** A tile on the board. */
export interface Tile {
  readonly owner: number
  readonly industry: IndustryId
  readonly level: number
  /** Coal or iron still on it. */
  cubes: number
  flipped: boolean
}

export interface PlayerState {
  readonly name: string
  readonly color: PlayerColor
  readonly isAI: boolean
  readonly aiLevel: AILevel
  money: number
  /** Position on the progress track (0–100). Income comes from it. */
  incomeSpace: number
  vp: number
  hand: Card[]
  /** Tiles left on the mat: per industry, the count at each level row (same order as the tile table). */
  mat: Record<IndustryId, number[]>
  /** Money spent this round (decides the next turn order). */
  spent: number
}

export interface LinkState {
  readonly owner: number
}

export interface DistantMarketState {
  /** Indexes into the distant-market tiles still face down, top first. */
  deck: number[]
  /** Tiles flipped this era. */
  used: number[]
  /** Row of the marker on the track (0 = top). */
  marker: number
  /** Closed for the rest of the era (a sale reached X). */
  closed: boolean
}

/** Something that happened, for the log and the move highlights. */
export type LogEntry =
  | { kind: 'build'; player: number; industry: IndustryId; level: number; slot: string; overbuilt?: number; coal: number; iron: number; money: number }
  | { kind: 'network'; player: number; links: string[]; money: number }
  | { kind: 'develop'; player: number; industries: IndustryId[]; money: number }
  | { kind: 'sell'; player: number; mill: string; port?: string; distant?: { move: number; income: number } }
  | { kind: 'sell-failed'; player: number; mill: string; move: number }
  | { kind: 'loan'; player: number; amount: number }
  | { kind: 'pass'; player: number }
  | { kind: 'out-of-time'; player: number }
  | { kind: 'flip'; player: number; slot: string; income: number }
  /** A new mine or iron works sold cubes to its market (the owner got `money`). */
  | { kind: 'market-sale'; player: number; slot: string; industry: 'coal' | 'iron'; cubes: number; money: number }
  | { kind: 'income'; player: number; amount: number }
  | { kind: 'shortfall'; player: number; tilesSold: string[]; vpLost: number }
  | { kind: 'round'; era: Era; round: number; order: number[] }
  | { kind: 'deal'; era: Era; cards: number }
  | { kind: 'draw'; player: number; count: number }
  | { kind: 'discard'; player: number; cards: string[] }
  | { kind: 'era-end'; era: Era; scores: { player: number; links: number; tiles: number }[]; removed?: { tiles: Record<string, Tile>; links: Record<string, LinkState> } }
  | { kind: 'game-end'; ranking: number[] }

export interface GameState {
  readonly version: typeof RULES_VERSION
  readonly seed: number
  /** The random generator's state (cards, distant market). */
  rng: number
  players: PlayerState[]
  era: Era
  /** 1-based round within the era. */
  round: number
  /** Towns beyond this ring of the map are out of play (the lobby mode's map size: 3 = the whole map). */
  readonly mapRing: 1 | 2 | 3
  /** Player ids in turn order for this round. */
  order: number[]
  /** Index into `order` of the player whose turn it is. */
  turn: number
  /** Actions the current player still has this turn. */
  actionsLeft: number
  /** The draw deck, top first. */
  deck: Card[]
  discard: Card[]
  /** Canal era: cards set aside face down under the deck, not drawn this era. */
  setAside: Card[]
  /** Built tiles by slot key. */
  tiles: Record<string, Tile>
  /** Built links (this era's) by link id. */
  links: Record<string, LinkState>
  /** Cubes in the coal and iron markets. */
  market: { coal: number; iron: number }
  distant: DistantMarketState
  /** After a sale: the player may sell more (no card) or stop. */
  selling: { player: number } | null
  finished: boolean
  /** Final order (player ids, winner first) once finished. */
  ranking: number[] | null
  log: LogEntry[]
}

/** Where a cube comes from: a tile (slot key) or the market. */
export type Source = string | 'market'

export type Sale = { readonly mill: string; readonly port: string } | { readonly mill: string; readonly distant: true }

export type Action =
  | { type: 'build'; cards: string[]; slot: string; industry: IndustryId; coal?: Source[]; iron?: Source[] }
  | { type: 'network'; cards: string[]; links: string[]; coal?: Source[] }
  | { type: 'develop'; cards: string[]; industries: IndustryId[]; iron?: Source[] }
  | { type: 'sell'; cards: string[]; sale: Sale }
  | { type: 'sell-more'; sale: Sale }
  | { type: 'sell-stop' }
  | { type: 'loan'; cards: string[]; amount: 10 | 20 | 30 }
  | { type: 'pass'; cards: string[] }
  /** The player's clock ran out (online; only the game server sends it): logged, and a bot takes the seat. */
  | { type: 'out-of-time' }

/** Why an action is illegal: a code for the UI (translated) and a message for developers and tests. */
export class RuleError extends Error {
  readonly code: RuleErrorCode
  constructor(code: RuleErrorCode, message: string) {
    super(message)
    this.code = code
  }
}

export type RuleErrorCode =
  | 'game-over'
  | 'not-your-turn'
  | 'no-actions'
  | 'selling'
  | 'not-selling'
  | 'card'
  | 'two-cards'
  | 'network'
  | 'slot'
  | 'slot-preference'
  | 'era'
  | 'one-per-town'
  | 'closed'
  | 'no-tiles'
  | 'locked'
  | 'overbuild'
  | 'coal'
  | 'iron'
  | 'money'
  | 'link'
  | 'develop'
  | 'sale'
  | 'loan'
  | 'no-more-loans'
  | 'distant-closed'
  | 'input'
