/**
 * The coal and iron markets (RULES.md §1, §4).
 *
 * Each market is a row of price steps from cheap to expensive; each step has
 * some cube spaces. Buying takes the cheapest cube there is; a new mine or
 * iron works sells into the most expensive empty space first. When a market
 * is empty, cubes can still be bought at `emptyPrice`.
 *
 * `unverified(label, value)` marks a number the game uses that hasn't been
 * checked against the physical game (`verified: false`); it's listed in
 * docs/TILES.md under "To check against the physical game". Once checked,
 * replace the whole `unverified(...)` with the plain number.
 *
 * No value imports: Node reads this file directly (scripts/tiles.mjs).
 */

import { unverified, type Maybe } from '../tileTable.ts'

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
  /**
   * All the cubes of this kind in the game: the market's, those on mines or
   * iron works, and the rest in the general supply. A new mine or works gets
   * only as many as are left.
   */
  readonly supply: Maybe<number>
}

/** Four price steps, £1 to £4, two spaces each (the market strip in the gameplay spec). */
const steps = (name: string): MarketStep[] =>
  [1, 2, 3, 4].map((price, i) => ({
    price: unverified(`${name} market: price of step ${i + 1}`, price),
    spaces: unverified(`${name} market: spaces at step ${i + 1}`, 2),
  }))

export const MARKETS: Readonly<Record<'coal' | 'iron', MarketConfig>> = {
  coal: {
    steps: steps('Coal'),
    // RULES.md §4: "Market empty: £5 per cube."
    emptyPrice: 5,
    // RULES.md §1: "Coal market: 1 black cube per space."
    startingCubes: 'full',
    supply: unverified('Coal cubes in the game (the supply)', 24),
  },
  iron: {
    steps: steps('Iron'),
    // RULES.md §4: "If none: iron market price; market empty: £5 per cube."
    emptyPrice: 5,
    // RULES.md §1: "Iron market: 1 orange cube per space."
    startingCubes: 'full',
    supply: unverified('Iron cubes in the game (the supply)', 16),
  },
}
