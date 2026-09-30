/**
 * The rules' numbers, resolved from src/rules/config: what the game, the
 * computer players and the tests all play with. Values not yet checked
 * against the physical game are used as they are (listed in docs/TILES.md).
 */

import { DISTANT_MARKET } from './config/distantMarket'
import { MARKETS } from './config/markets'
import { TILE_TABLE } from './config/tiles'
import { resolveRulesData, type RulesData, type RulesTables } from './data'

/** The config tables, as data.ts reads them. */
export function configTables(): RulesTables {
  return { tiles: TILE_TABLE, markets: MARKETS, distant: DISTANT_MARKET }
}

export const RULES_DATA: RulesData = resolveRulesData(configTables())
