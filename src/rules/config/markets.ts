/**
 * The coal and iron markets (RULES.md §1, §4).
 *
 * Each market is a row of price steps from cheap to expensive; each step has
 * some cube spaces. Buying takes the cheapest cube there is; a new mine or
 * iron works sells into the most expensive empty space first. When a market
 * is empty, cubes can still be bought at `emptyPrice`.
 *
 * `todo(...)` marks a number not copied from the board yet: the engine won't
 * use it and `npm run build` stops until it's filled in (replace the whole
 * `todo(...)` with the number). A value in `todo(label, x)` is a proposal.
 *
 * No value imports: Node reads this file directly (scripts/tiles.mjs).
 */

import { todo, type Maybe } from '../tileTable.ts'

export interface MarketStep {
  /** £ for a cube bought from (or sold into) this step. */
  readonly price: Maybe<number>
  /** Cube spaces at this price. */
  readonly spaces: Maybe<number>
}

export interface MarketConfig {
  readonly steps: readonly MarketStep[]
  /** Price per cube when the market has none left (always available). */
  readonly emptyPrice: Maybe<number>
  /** Cubes at the start: 'full' = one on every space. */
  readonly startingCubes: Maybe<number | 'full'>
}

/** The prices £1–£4 are proposals from the market strip in the gameplay spec; the spaces per price aren't known yet. */
const steps = (name: string): MarketStep[] =>
  [1, 2, 3, 4].map((proposed, i) => ({
    price: todo(`${name} market: price of step ${i + 1}`, proposed),
    spaces: todo(`${name} market: spaces at step ${i + 1}`),
  }))

export const MARKETS: Readonly<Record<'coal' | 'iron', MarketConfig>> = {
  coal: {
    steps: steps('Coal'),
    // RULES.md §4: "Market empty: £5 per cube."
    emptyPrice: 5,
    // RULES.md §1: "Coal market: 1 black cube per space."
    startingCubes: 'full',
  },
  iron: {
    steps: steps('Iron'),
    // RULES.md §4: "If none: iron market price; market empty: £5 per cube."
    emptyPrice: 5,
    // RULES.md §1: "Iron market: 1 orange cube per space."
    startingCubes: 'full',
  },
}
