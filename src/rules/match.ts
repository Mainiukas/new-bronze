/**
 * A Brass match as the app keeps it: the rules state plus the lobby's mode
 * and map, saved after every move so Continue resumes exactly there.
 */

import type { MatchSummary } from '../data/achievements'
import { getGameMode, isGameModeId, type GameModeConfig } from '../data/gameModes'
import { createGame, type RulesContext, type SeatSetup } from './engine'
import { RULES_VERSION, type GameState } from './state'

export interface BrassMatch {
  readonly kind: 'brass'
  readonly modeId: string
  readonly mapId: string
  readonly state: GameState
}

export interface NewMatch {
  readonly modeId: string
  readonly mapId: string
  readonly seats: readonly SeatSetup[]
  readonly seed: number
}

/** The map rings a mode plays on: the whole map, without the outer ring, or only the core. */
const MAP_RING: Record<GameModeConfig['mapSize'], 1 | 2 | 3> = { full: 3, reduced: 2, compact: 1 }

export function mapRingFor(modeId: string): 1 | 2 | 3 {
  return isGameModeId(modeId) ? MAP_RING[getGameMode(modeId).mapSize] : 3
}

export function startBrassMatch(ctx: RulesContext, setup: NewMatch): BrassMatch {
  return { kind: 'brass', modeId: setup.modeId, mapId: setup.mapId, state: createGame(ctx, setup.seats, setup.seed, { mapRing: mapRingFor(setup.modeId) }) }
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

/** A saved match this version can resume, or undefined. */
export function parseSavedMatch(raw: unknown): BrassMatch | undefined {
  if (!isObject(raw) || raw.kind !== 'brass' || typeof raw.modeId !== 'string' || typeof raw.mapId !== 'string') return undefined
  const state = raw.state
  if (!isObject(state) || state.version !== RULES_VERSION || !Array.isArray(state.players) || !Array.isArray(state.order)) return undefined
  return raw as unknown as BrassMatch
}

/** Whether storage holds nothing, a match to resume, or a match from an older version. */
export function savedMatchStatus(raw: unknown): 'none' | 'ok' | 'outdated' {
  if (raw === null || raw === undefined) return 'none'
  return parseSavedMatch(raw) ? 'ok' : 'outdated'
}

/** A finished match as the local player (seat 0) saw it, for stats and achievements. */
export function summarizeMatch(match: BrassMatch): MatchSummary | null {
  const s = match.state
  const you = s.players[0]
  if (!s.finished || !s.ranking || !you || you.isAI) return null
  const place = s.ranking.indexOf(0) + 1
  const tiles = Object.values(s.tiles).filter((t) => t.owner === 0)
  return {
    won: place === 1,
    score: you.vp,
    modeId: match.modeId,
    players: s.players.length,
    goodsShipped: s.log.filter((e) => e.kind === 'sell' && e.player === 0).length,
    links: Object.values(s.links).filter((l) => l.owner === 0).length,
    shipyards: tiles.filter((t) => t.industry === 'shipyard').length,
    placement: place,
    industries: tiles.length,
  }
}
