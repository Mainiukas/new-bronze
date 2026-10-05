/**
 * What the game Edge Function (supabase/functions/game) runs, bundled into
 * supabase/functions/_shared/game-server.js by `npm run build:server`: the
 * same rules engine and game server as the browser and the tests, not a copy.
 */

import { BRASS_MAP } from '../rules/map'
import { RULES_DATA } from '../rules/rulesData'
import type { RulesContext } from '../rules/engine'

export { createGameServer, ServerError } from './server'
export type { Caller, GameServer, Reply, ServerDeps } from './server'
export { redactState } from './redact'
export type { ActionRow, GameRecord, GameStore, GameSummary, GameView, QueueEntry, RatingRow, Seat } from './types'

/** Bots' thinking time between moves (the Edge Function passes it to the server). */
export { botThinkTime } from '../rules/config/game'

/** The rules on our map, as the server plays them. */
export const RULES_CONTEXT: RulesContext = { data: RULES_DATA, map: BRASS_MAP }
