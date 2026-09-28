/**
 * What an industry row on the player panel shows, worked out from the rules
 * (never from the mockup's placeholder numbers): the level on show, how many
 * tiles of it are left, its cost with where coal and iron would come from,
 * what it produces, and whether it can be built in this era.
 */

import { distancesFrom, lowestLevelIndex, marketBuyPrice, networkOf, type RulesContext } from '../../rules/engine'
import type { IndustryLevel } from '../../rules/data'
import type { GameState } from '../../rules/state'
import type { IndustryId } from '../../rules/tileTable'

export interface RowInfo {
  readonly industry: IndustryId
  /** The level on show, or null when no tiles are left. */
  readonly tile: IndustryLevel | null
  /** Tiles left at that level. */
  readonly left: number
  /** The next tile is the locked shipyard (develop it away first). */
  readonly locked: boolean
  /** The level on show can't be built in this era: when it can ('canal' | 'rail'). */
  readonly otherEra: 'canal' | 'rail' | null
  /**
   * Rail era with a tile that can no longer be built on top: the row shows
   * the next buildable level, and the only option is to upgrade (develop).
   */
  readonly upgradeOnly: boolean
  /** One entry per cube of the cost: the market price when it would have to be bought, else null. */
  readonly coal: readonly (number | null)[]
  readonly iron: readonly (number | null)[]
}

const cannotBuildNow = (tile: IndustryLevel, era: 'canal' | 'rail') => tile.locked || (era === 'canal' ? tile.noCanal : tile.noRail)

export function rowInfo(state: GameState, ctx: RulesContext, playerId: number, industry: IndustryId): RowInfo {
  const player = state.players[playerId]
  const levels = ctx.data.industries[industry].levels
  const index = lowestLevelIndex(player, industry)
  if (index < 0) return { industry, tile: null, left: 0, locked: false, otherEra: null, upgradeOnly: false, coal: [], iron: [] }
  let shown = index
  let upgradeOnly = false
  const current = levels[index]
  if (!current.locked && state.era === 'rail' && current.noRail) {
    const next = levels.findIndex((l, i) => i > index && player.mat[industry][i] > 0 && !cannotBuildNow(l, 'rail'))
    if (next >= 0) shown = next
    upgradeOnly = true
  }
  const tile = levels[shown]
  const otherEra = tile.locked ? null : state.era === 'canal' && tile.noCanal ? 'rail' : state.era === 'rail' && tile.noRail ? 'canal' : null

  // Coal: free if a coal mine with coal is connected to the player's network; iron: free if any works has iron.
  const network = [...networkOf(state, ctx, playerId)]
  const reach = network.length ? distancesFrom(state, ctx, network) : new Map<string, number>()
  const coalOnBoard = Object.entries(state.tiles).some(([slot, t]) => t.industry === 'coal' && t.cubes > 0 && reach.has(ctx.map.slots[slot].town))
  const ironOnBoard = Object.values(state.tiles).some((t) => t.industry === 'iron' && t.cubes > 0)
  const prices = (kind: 'coal' | 'iron', n: number, free: boolean) =>
    Array.from({ length: n }, (_, i) => (free ? null : marketBuyPrice(ctx, kind, state.market[kind] - i)))
  return {
    industry,
    tile,
    left: player.mat[industry][shown],
    locked: current.locked,
    otherEra,
    upgradeOnly,
    coal: prices('coal', tile.cost.coal, coalOnBoard),
    iron: prices('iron', tile.cost.iron, ironOnBoard),
  }
}
