/**
 * What the engine says to players (the match log, why an action is
 * unavailable, why a move was refused), as data rather than English, so the
 * screen can put it in the player's language (src/i18n/game/<code>.ts).
 * Names of players, towns and places are passed as they are and translated
 * (where they have a translation) when shown.
 */

import type { GoodsKind, IndustryKind, RouteKind } from './types'

/** Money, coal and iron paid for something. */
export interface Payment {
  money: number
  coal: number
  iron: number
}

/** Where goods were sold: a hub (by its name) or a port in a town. */
export interface MarketPlace {
  town: string
  port: boolean
}

export type GameMessage =
  // The match log
  | { key: 'matchStart'; rounds: number; railRound: number | null }
  | { key: 'built'; player: string; industry: IndustryKind; town: string; payment: Payment; prestige: number }
  | { key: 'linked'; player: string; kind: RouteKind; from: string; to: string; payment: Payment; prestige: number }
  | {
      key: 'shipped'
      player: string
      goods: GoodsKind
      amount: number
      /** The town it came from, or null when sold in the same town. */
      from: string | null
      market: MarketPlace
      revenue: number
      tolls: { owner: string; amount: number }[]
      fee: { owner: string; amount: number } | null
      prestige: number
    }
  | { key: 'raisedFunds'; player: string; amount: number }
  | { key: 'timedOut'; player: string; lost: number }
  | { key: 'endedTurn'; player: string; early: boolean }
  | { key: 'roundEnds'; round: number; income: number }
  | { key: 'won'; winners: string[] }
  | { key: 'roundBegins'; round: number; total: number }
  | { key: 'railEra'; removed: number }
  | { key: 'networkReset'; player: string }
  // Why an action is unavailable (on its disabled button)
  | { key: 'notOnMap' }
  | { key: 'plotsTaken' }
  | { key: 'opensInRail' }
  | { key: 'noPlotInNetwork' }
  | { key: 'needsMoney'; amount: number }
  | { key: 'noRoute' }
  | { key: 'buildSourceFirst' }
  | { key: 'nothingToShip' }
  | { key: 'notReachable' }
  | { key: 'cantAffordTolls' }
  // Why a move was refused
  | { key: 'cantPay'; amount: number; have: number }
  | { key: 'noPlots'; town: string }
  | { key: 'noSuchPlot'; town: string; plot: number }
  | { key: 'plotTaken'; town: string }
  | { key: 'wrongPlot'; industry: IndustryKind }
  | { key: 'townOpensInRail'; town: string }
  | { key: 'notInNetwork'; town: string }
  | { key: 'linkBuilt'; from: string; to: string }
  | { key: 'linkNotInEra'; from: string; to: string; era: RouteKind | null }
  | { key: 'linkOffNetwork'; from: string; to: string }
  | { key: 'matchOver' }
  | { key: 'pickSource' }
  | { key: 'noCottonYet'; industry: IndustryKind }
  | { key: 'storeEmpty'; goods: GoodsKind }
  | { key: 'portsOnlyBuy'; goods: GoodsKind }
  | { key: 'doesntBuy'; town: string | null; goods: GoodsKind }
  | { key: 'unreachable'; market: MarketPlace }
  | { key: 'cantAffordFees'; amount: number }
  | { key: 'unknownAction' }
  /** Something only a bug or a hand-edited save can cause: shown as it is. */
  | { key: 'internal'; text: string }

export type GameMessageKey = GameMessage['key']

/** One renderer per message, in one language. */
export type GameMessageRenderers = {
  [K in GameMessageKey]: (message: Extract<GameMessage, { key: K }>) => string
}
