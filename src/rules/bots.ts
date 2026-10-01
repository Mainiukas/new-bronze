/**
 * Computer players, the same in local games and on the server (bot seats,
 * and stand-ins for players who are disconnected or have forfeited).
 * - Easy: a random legal move, preferring to build.
 * - Normal: the rules AI's scoring (income early, points late, sells when it
 *   can: src/rules/ai.ts).
 * Deterministic: the same game and move number always give the same choice,
 * so a game can be replayed from its action log.
 */

import { chooseAction } from './ai'
import type { RulesContext } from './engine'
import { legalActions } from './options'
import type { Action, GameState } from './state'

export type BotLevel = 'easy' | 'normal'

/** A number in [0, 1) from a seed and a move number (mulberry32). */
export function seededRandom(seed: number, n: number): number {
  let t = (seed ^ Math.imul(n + 1, 0x9e3779b1)) >>> 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export function botAction(state: GameState, ctx: RulesContext, seat: number, level: BotLevel, move: number): Action {
  if (level === 'normal') {
    // The AI reads the level from the player; stand-ins for humans play at Normal.
    const players = state.players.map((p, i) => (i === seat ? { ...p, aiLevel: 'normal' as const } : p))
    return chooseAction({ ...state, players }, ctx, seat)
  }
  const actions = legalActions(state, ctx, seat)
  if (actions.length === 0) throw new Error('No legal actions for this player now')
  const r = seededRandom(state.seed, move)
  if (state.selling) return actions.find((a) => a.type === 'sell-more') ?? { type: 'sell-stop' }
  // Prefer building (three times in four when a build is possible).
  const builds = actions.filter((a) => a.type === 'build')
  if (builds.length && r < 0.75) return builds[Math.floor((r / 0.75) * builds.length)]
  const others = actions.filter((a) => a.type !== 'pass')
  const pool = others.length ? others : actions
  return pool[Math.floor(seededRandom(state.seed, move + 7919) * pool.length)]
}

/** A timed-out turn: pass with a random card (stop selling first). */
export function timeoutAction(state: GameState, seat: number, move: number): Action {
  if (state.selling) return { type: 'sell-stop' }
  const hand = state.players[seat].hand
  return { type: 'pass', cards: [hand[Math.floor(seededRandom(state.seed, move) * hand.length)].id] }
}
