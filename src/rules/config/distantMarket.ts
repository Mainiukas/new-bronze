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
 * `unverified(label, value)`: used by the game, not checked against the real
 * tiles yet (listed in docs/TILES.md); replace it with the plain value once checked. No value imports: Node reads this file
 * directly (scripts/tiles.mjs).
 */

import { unverified, type Maybe } from '../tileTable.ts'

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

/** Tile n: its value, the player count printed on it (null if none) and its "!" mark. None checked against the physical tiles yet. */
const tile = (n: number, move: number, players: number | null, flagged: boolean): DistantTileConfig => ({
  move: unverified(`Distant market tile ${n}: value (spaces along the track)`, move),
  players: unverified(`Distant market tile ${n}: player count printed on it`, players),
  flagged: unverified(`Distant market tile ${n}: marked "!"`, flagged),
})

export const DISTANT_MARKET: DistantMarketConfig = {
  tiles: [
    tile(1, 1, null, false),
    tile(2, 1, null, false),
    tile(3, 2, null, false),
    tile(4, 2, null, false),
    tile(5, 3, null, false),
    tile(6, 1, 3, false),
    tile(7, 2, 4, false),
    tile(8, 4, null, true),
    tile(9, 0, null, false),
    tile(10, 1, null, false),
    tile(11, 2, 3, false),
    tile(12, 3, 4, false),
  ],
  track: ['3a', '3b', '2b', '2a', '1a', '1b', '0b', '0a', 'X'],
}
