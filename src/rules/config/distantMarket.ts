/**
 * The distant cotton market (RULES.md §1, §3): 12 tiles (the rulebook's
 * component list) and the market track.
 *
 * - `move`: how many rows the marker goes down when the tile is flipped
 *   (shown as 0 to −4).
 * - `players`: the player count printed on the tile, or null when it has
 *   none. At setup, tiles for more players than are playing are removed.
 * - `flagged`: the tile is marked "!" (removed at setup).
 * - `track`: the income printed on each row of the track, top row first,
 *   ending with 'X' (reaching it closes the market for the era).
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

export interface DistantMarketConfig {
  readonly tiles: readonly DistantTileConfig[]
  readonly track: Maybe<readonly (number | 'X')[]>
}

const tile = (n: number): DistantTileConfig => ({
  move: todo(`Distant market tile ${n}: value (rows down, 0–4)`),
  players: todo(`Distant market tile ${n}: player count printed on it (null if none)`),
  flagged: todo(`Distant market tile ${n}: marked "!"`),
})

export const DISTANT_MARKET: DistantMarketConfig = {
  tiles: [tile(1), tile(2), tile(3), tile(4), tile(5), tile(6), tile(7), tile(8), tile(9), tile(10), tile(11), tile(12)],
  track: todo('Distant market track: the income on each row, top row first, ending with X'),
}
