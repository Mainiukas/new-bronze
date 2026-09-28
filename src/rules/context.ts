/**
 * The rules the app plays with: the tile table from docs/TILES.md when it's
 * complete. While it isn't, only a development or preview build can exist
 * (a production build stops), and it plays on the placeholder numbers with a
 * warning on screen.
 */

import { IncompleteRulesError, resolveRulesData } from './data'
import type { RulesContext } from './engine'
import { BRASS_MAP } from './map'
import { PLACEHOLDER_DATA } from './placeholder'
import { TILE_TABLE } from './tiles'

export interface LoadedRules {
  readonly ctx: RulesContext
  /** Playing on placeholder numbers (docs/TILES.md incomplete). */
  readonly placeholder: boolean
  /** How many values docs/TILES.md still lacks. */
  readonly missing: number
}

function load(): LoadedRules {
  try {
    return { ctx: { data: resolveRulesData(TILE_TABLE), map: BRASS_MAP }, placeholder: false, missing: 0 }
  } catch (error) {
    if (!(error instanceof IncompleteRulesError)) throw error
    return { ctx: { data: PLACEHOLDER_DATA, map: BRASS_MAP }, placeholder: true, missing: error.missing.length }
  }
}

export const RULES: LoadedRules = load()
