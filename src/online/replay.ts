/**
 * Rebuilding a finished online game from its seed and action log, with the
 * same rules engine the server played it with.
 */

import { applyAction, createGame, type RulesContext } from '../rules/engine'
import { BRASS_MAP } from '../rules/map'
import { RULES_DATA } from '../rules/rulesData'
import type { GameState } from '../rules/state'
import type { ActionRow, ModeId } from '../server/types'

const CTX: RulesContext = { data: RULES_DATA, map: BRASS_MAP }

export interface ReplayData {
  id: string
  seed: number
  mode: ModeId
  mapId: string
  seats: { name: string; isAI: boolean; aiLevel: 'easy' | 'normal' }[]
  actions: ActionRow[]
}

/** Every position of the game: the start, then one after each move. */
export function replayStates(data: ReplayData): GameState[] {
  const states = [createGame(CTX, data.seats, data.seed)]
  for (const row of data.actions) {
    try {
      states.push(applyAction(states[states.length - 1], CTX, row.seat, row.action))
    } catch {
      break // a log that doesn't replay: show what does
    }
  }
  return states
}
