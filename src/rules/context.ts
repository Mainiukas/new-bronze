/** The rules the app plays with: the numbers in src/rules/config, on our map. */

import type { RulesContext } from './engine'
import { BRASS_MAP } from './map'
import { RULES_DATA } from './rulesData'

export interface LoadedRules {
  readonly ctx: RulesContext
}

export const RULES: LoadedRules = { ctx: { data: RULES_DATA, map: BRASS_MAP } }
