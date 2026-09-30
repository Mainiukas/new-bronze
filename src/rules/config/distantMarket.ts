/**
 * The distant cotton market (RULES.md §1, §3): 12 tiles (the rulebook's
 * component list) and the market track.
 *
 * - `move`: how many spaces the marker goes along the track when the tile
 *   is flipped (shown as 0 to −4).
 * - `players`: the player count printed on the tile, or null when it has
 *   none. At setup, tiles for more players than are playing are removed.
 * - `flagged`: the tile is marked "!" (removed at setup).
 * - `track`: the track's spaces in the order the marker walks them (the
 *   engraved zig-zag line). The board has four income rows, £3 at the top
 *   down to £0, two spaces each ('a' on the left, 'b' on the right), then
 *   X alone at the bottom. A space's income is its row; landing on X, or
 *   going past it, closes the market for the era.
 *
 * `todo(...)` marks a value not copied from the real tiles yet: replace the
 * whole `todo(...)` with the value. No value imports: Node reads this file
 * directly (scripts/tiles.mjs).
 */

import { todo, type Maybe } from '../tileTable.ts'

export interface DistantTileConfig {
  readonly move: Maybe<number>
  readonly players: Maybe<number | null>
  readonly flagged: Maybe<boolean>
}

/** A track space: its row's income (3 to 0) and side ('a' left, 'b' right), or X. */
export type DistantSpaceId = '3a' | '3b' | '2a' | '2b' | '1a' | '1b' | '0a' | '0b' | 'X'

export interface DistantMarketConfig {
  readonly tiles: readonly DistantTileConfig[]
  readonly track: readonly DistantSpaceId[]
}

const tile = (n: number): DistantTileConfig => ({
  move: todo(`Distant market tile ${n}: value (spaces along the track, 0–4)`),
  players: todo(`Distant market tile ${n}: player count printed on it (null if none)`),
  flagged: todo(`Distant market tile ${n}: marked "!"`),
})

export const DISTANT_MARKET: DistantMarketConfig = {
  tiles: [tile(1), tile(2), tile(3), tile(4), tile(5), tile(6), tile(7), tile(8), tile(9), tile(10), tile(11), tile(12)],
  track: ['3a', '3b', '2b', '2a', '1a', '1b', '0b', '0a', 'X'],
}
