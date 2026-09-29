/**
 * Computer players. They only ever choose from legalActions (so every move is
 * legal): each candidate is applied to a copy of the game and the resulting
 * position is scored. Easy players pick loosely among the good moves, normal
 * ones add a little noise, hard ones take the best. Deterministic: the
 * "noise" comes from the game's seed and the move number, never Math.random.
 */

import { applyAction, distancesFrom, eraScores, incomeOf, levelFor, lowestLevelIndex, levelRow, roundsInEra, saleOptions, type RulesContext } from './engine'
import { legalActions } from './options'
import { nextRandom } from './random'
import type { Action, AILevel, GameState } from './state'
import { INDUSTRY_ORDER } from './tileTable'

/** Rounds left in the game after this one (both eras). */
function roundsLeft(state: GameState): number {
  return roundsInEra(state) - state.round + (state.era === 'canal' ? roundsInEra(state, 'rail') : 0)
}

/** How good a position is for a player, in rough VP. */
export function positionValue(state: GameState, ctx: RulesContext, playerId: number): number {
  const p = state.players[playerId]
  if (state.finished) return p.vp
  const rounds = roundsLeft(state)
  const pending = eraScores(state, ctx)[playerId]
  let unflipped = 0
  for (const t of Object.values(state.tiles)) {
    if (t.owner !== playerId || t.flipped) continue
    const level = levelFor(ctx, t)
    // Worth part of its VP and income until it flips; mines and works flip as their cubes are used.
    unflipped += (level.vp + (level.income * Math.min(rounds, 6)) / 4) * (t.industry === 'cotton' ? 0.45 : 0.6)
  }
  // Tiles the player can't build any more in this era hold them back.
  let blocked = 0
  for (const id of INDUSTRY_ORDER) {
    const i = lowestLevelIndex(p, id)
    if (i < 0) continue
    const tile = levelRow(ctx, id, i)
    if (tile.locked || (state.era === 'rail' && tile.noRail) || (state.era === 'canal' && tile.noCanal)) blocked += id === 'shipyard' ? 1.5 : 1
  }
  // Links: the link icons they'll score once the tiles at their ends flip (the flipped ones are in `pending`).
  let linkPotential = 0
  for (const [id, link] of Object.entries(state.links)) {
    if (link.owner !== playerId) continue
    const l = ctx.map.links[id]
    for (const end of [l.from, l.to]) {
      const place = ctx.map.places[end]
      if (place.kind !== 'town') continue
      for (const slot of place.slots) {
        const t = state.tiles[slot.key]
        if (t && !t.flipped) linkPotential += levelFor(ctx, t).link * 0.5
      }
    }
  }
  // Mills that can sell: connected to an unused port or an open trade hub.
  let salePotential = 0
  for (const [slot, t] of Object.entries(state.tiles)) {
    if (t.owner !== playerId || t.industry !== 'cotton' || t.flipped) continue
    const reach = distancesFrom(state, ctx, [ctx.map.slots[slot].town])
    const port = Object.entries(state.tiles).some(([s2, o]) => o.industry === 'port' && !o.flipped && reach.has(ctx.map.slots[s2].town))
    const hub = !state.distant.closed && ctx.map.hubs.some((h) => reach.has(h.id))
    if (port || hub) salePotential += levelFor(ctx, t).vp * 0.5 + 1
  }
  const incomeWeight = Math.min(rounds, 10) * 0.35
  const moneyWeight = rounds > 2 ? 0.15 : 0.1
  return p.vp + pending.links + pending.tiles + incomeOf(ctx, p) * incomeWeight + p.money * moneyWeight + unflipped + linkPotential + salePotential - blocked
}

/** A deterministic number in [0, 1) for this game, player and move. */
function noise(state: GameState, playerId: number, i: number): number {
  return nextRandom((state.seed ^ (state.log.length * 7919) ^ (playerId * 104729) ^ (i * 15485863)) | 0)[0]
}

const SPREAD: Record<AILevel, number> = { easy: 3, normal: 0.8, hard: 0 }

/** The computer player's choice. Always a legal action (pass if nothing else scores). */
export function chooseAction(state: GameState, ctx: RulesContext, playerId: number): Action {
  const actions = legalActions(state, ctx, playerId)
  if (actions.length === 0) throw new Error('No legal actions for this player now')
  if (state.selling) {
    // Keep selling while it helps.
    const sale = actions.find((a) => a.type === 'sell-more')
    return sale && saleOptions(state, ctx, playerId).length ? sale : { type: 'sell-stop' }
  }
  const level = state.players[playerId].aiLevel
  const base = positionValue(state, ctx, playerId)
  let best: Action = actions[actions.length - 1]
  let bestScore = -Infinity
  actions.forEach((action, i) => {
    let after: GameState
    try {
      after = applyAction(state, ctx, playerId, action)
    } catch {
      return
    }
    // A sale continues within the same action: count the rest of it greedily.
    let guard = 0
    while (after.selling?.player === playerId && guard++ < 6) {
      const more = saleOptions(after, ctx, playerId)[0]
      after = applyAction(after, ctx, playerId, more ? { type: 'sell-more', sale: more } : { type: 'sell-stop' })
    }
    let score = positionValue(after, ctx, playerId) - base
    if (action.type === 'pass') score -= 0.3
    if (action.type === 'build' && action.cards.length === 2) score -= 1.2 // two cards for one build
    score += (noise(state, playerId, i) - 0.5) * SPREAD[level]
    if (score > bestScore) {
      bestScore = score
      best = action
    }
  })
  return best
}
