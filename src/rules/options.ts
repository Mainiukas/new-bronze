/**
 * What a player can do right now: the legal slots for a build, links for the
 * network action, tiles to develop, sales, loans. The UI uses these to light
 * up the board and to explain disabled controls; the computer players choose
 * from them. Everything is worked out with the engine's own plan* checks, so
 * a listed option is always legal.
 */

import { LOANS } from './constants'
import { lowestLevelIndex, levelRow, planBuild, planDevelop, planNetwork, loanProblem, saleOptions, type BuildPlan, type DevelopPlan, type NetworkPlan, type RulesContext } from './engine'
import { linkInEra } from './map'
import { RuleError, type Action, type Card, type GameState, type RuleErrorCode, type Sale } from './state'
import type { IndustryId } from './tileTable'

function attempt<T>(fn: () => T): T | RuleError {
  try {
    return fn()
  } catch (error) {
    if (error instanceof RuleError) return error
    throw error
  }
}

/** The card a single-card action discards by default: the last card in hand (the player can pick another). */
export function defaultDiscard(state: GameState, playerId: number): string | null {
  return state.players[playerId].hand.at(-1)?.id ?? null
}

/**
 * Card choices that could pay for building `industry` in a town, best first:
 * a location card for the town, an industry card, then any two cards (as a
 * location card, using both actions).
 */
export function buildCardChoices(state: GameState, playerId: number, town: string, industry: IndustryId): string[][] {
  const hand = state.players[playerId].hand
  const choices: string[][] = []
  const location = hand.find((c) => c.kind === 'location' && c.town === town)
  if (location) choices.push([location.id])
  const industryCard = hand.find((c) => c.kind === 'industry' && c.industry === industry)
  if (industryCard) choices.push([industryCard.id])
  if (state.actionsLeft >= 2 && hand.length >= 2) {
    // The two least useful cards: industry cards for other industries and location cards for other towns, from the end of the hand.
    const spare = [...hand].reverse().filter((c: Card) => !(c.kind === 'location' && c.town === town) && !(c.kind === 'industry' && c.industry === industry))
    const two = (spare.length >= 2 ? spare : [...hand].reverse()).slice(0, 2).map((c) => c.id)
    choices.push(two)
  }
  return choices
}

export interface BuildOption {
  readonly slot: string
  readonly plan: BuildPlan
}

/** Every slot where `industry` can be built now, each with the plan (cards chosen as in buildCardChoices). */
export function buildOptions(state: GameState, ctx: RulesContext, playerId: number, industry: IndustryId, sellCubes = true): BuildOption[] {
  const out: BuildOption[] = []
  for (const slot of Object.values(ctx.map.slots)) {
    if (!slot.industries.includes(industry)) continue
    for (const cards of buildCardChoices(state, playerId, slot.town, industry)) {
      const plan = attempt(() => planBuild(state, ctx, playerId, { type: 'build', cards, slot: slot.key, industry, sellCubes }))
      if (!(plan instanceof RuleError)) {
        out.push({ slot: slot.key, plan })
        break
      }
    }
  }
  return out
}

/**
 * Why `industry` can't be built anywhere (for the disabled row's tooltip), or
 * null when it can. Checks the mat first, then tries every slot and reports
 * the most telling reason.
 */
export function buildBlocker(state: GameState, ctx: RulesContext, playerId: number, industry: IndustryId): RuleErrorCode | null {
  const player = state.players[playerId]
  const index = lowestLevelIndex(player, industry)
  if (index < 0) return 'no-tiles'
  const tile = levelRow(ctx, industry, index)
  if (tile.locked) return 'locked'
  if ((state.era === 'canal' && tile.noCanal) || (state.era === 'rail' && tile.noRail)) return 'era'
  if (state.actionsLeft < 1 || state.selling) return 'no-actions'
  if (buildOptions(state, ctx, playerId, industry).length) return null
  const reasons = new Map<RuleErrorCode, number>()
  for (const slot of Object.values(ctx.map.slots)) {
    if (!slot.industries.includes(industry)) continue
    for (const cards of buildCardChoices(state, playerId, slot.town, industry)) {
      const r = attempt(() => planBuild(state, ctx, playerId, { type: 'build', cards, slot: slot.key, industry }))
      if (r instanceof RuleError) reasons.set(r.code, (reasons.get(r.code) ?? 0) + 1)
    }
  }
  for (const code of ['money', 'coal', 'iron', 'network', 'card'] as const) if (reasons.has(code)) return code
  return [...reasons.keys()][0] ?? 'card'
}

/** Links that can be picked next for a network action of `count` links, given the ones already picked. */
export function linkOptions(state: GameState, ctx: RulesContext, playerId: number, count: 1 | 2, picked: readonly string[] = []): { link: string; plan: NetworkPlan | null }[] {
  const card = defaultDiscard(state, playerId)
  if (!card || state.actionsLeft < 1 || state.selling) return []
  const candidates = Object.values(ctx.map.links).filter((l) => linkInEra(ctx.map, l, state.era) && !state.links[l.id] && !picked.includes(l.id))
  const out: { link: string; plan: NetworkPlan | null }[] = []
  for (const l of candidates) {
    const links = [...picked, l.id]
    if (links.length === count) {
      const plan = attempt(() => planNetwork(state, ctx, playerId, { type: 'network', cards: [card], links }))
      if (!(plan instanceof RuleError)) out.push({ link: l.id, plan })
    } else {
      // First of two: fine if some second link completes a legal pair.
      const ok = candidates.some((m) => m.id !== l.id && !(attempt(() => planNetwork(state, ctx, playerId, { type: 'network', cards: [card], links: [...links, m.id] })) instanceof RuleError))
      if (ok) out.push({ link: l.id, plan: null })
    }
  }
  return out
}

/** Why a network action of `count` links is impossible now, or null. */
export function networkBlocker(state: GameState, ctx: RulesContext, playerId: number, count: 1 | 2): RuleErrorCode | null {
  if (state.era === 'canal' && count === 2) return 'era'
  if (state.actionsLeft < 1 || state.selling) return 'no-actions'
  if (linkOptions(state, ctx, playerId, count).length) return null
  const card = defaultDiscard(state, playerId)
  if (!card) return 'card'
  const reasons = new Set<RuleErrorCode>()
  for (const l of Object.values(ctx.map.links)) {
    if (!linkInEra(ctx.map, l, state.era) || state.links[l.id]) continue
    const r = attempt(() => planNetwork(state, ctx, playerId, { type: 'network', cards: [card], links: count === 1 ? [l.id] : [l.id, l.id] }))
    if (r instanceof RuleError && r.code !== 'link') reasons.add(r.code)
  }
  for (const code of ['money', 'coal', 'network'] as const) if (reasons.has(code)) return code
  return 'link'
}

/** Plan for developing these industries' lowest tiles (the default discard card), or the reason it's impossible. */
export function developPlan(state: GameState, ctx: RulesContext, playerId: number, industries: readonly IndustryId[]): DevelopPlan | RuleError {
  const card = defaultDiscard(state, playerId)
  if (!card) return new RuleError('card', 'No cards')
  if (state.selling) return new RuleError('selling', 'Finish selling first')
  return attempt(() => planDevelop(state, ctx, playerId, { type: 'develop', cards: [card], industries: [...industries] }))
}

/** Why developing one tile of this industry is impossible, or null. */
export function developBlocker(state: GameState, ctx: RulesContext, playerId: number, industry: IndustryId): RuleErrorCode | null {
  const r = developPlan(state, ctx, playerId, [industry])
  return r instanceof RuleError ? r.code : null
}

export function loanOptions(state: GameState, ctx: RulesContext, playerId: number): { amount: 10 | 20 | 30; levels: number; problem: RuleError | null }[] {
  return ([10, 20, 30] as const).map((amount) => ({ amount, levels: LOANS[amount], problem: state.selling || state.actionsLeft < 1 ? new RuleError('no-actions', 'No actions left') : loanProblem(state, ctx, playerId, amount) }))
}

export { saleOptions }
export type { Sale }

/** Every legal action for a player (for the computer players and tests). Builds use the default card choice. */
export function legalActions(state: GameState, ctx: RulesContext, playerId: number): Action[] {
  if (state.finished) return []
  if (state.selling) {
    if (state.selling.player !== playerId) return []
    return [...saleOptions(state, ctx, playerId).map((sale) => ({ type: 'sell-more', sale }) as Action), { type: 'sell-stop' }]
  }
  if (state.order[state.turn] !== playerId || state.actionsLeft < 1) return []
  const card = defaultDiscard(state, playerId)
  if (!card) return []
  const actions: Action[] = []
  for (const industry of ['cotton', 'coal', 'iron', 'port', 'shipyard'] as const) {
    for (const option of buildOptions(state, ctx, playerId, industry)) {
      actions.push({ type: 'build', cards: [...option.plan.cards], slot: option.slot, industry, sellCubes: true })
    }
  }
  for (const { link } of linkOptions(state, ctx, playerId, 1)) actions.push({ type: 'network', cards: [card], links: [link] })
  if (state.era === 'rail') {
    for (const first of linkOptions(state, ctx, playerId, 2)) {
      for (const second of linkOptions(state, ctx, playerId, 2, [first.link])) {
        if (first.link < second.link) actions.push({ type: 'network', cards: [card], links: [first.link, second.link] })
      }
    }
  }
  const industries = ['cotton', 'coal', 'iron', 'port', 'shipyard'] as const
  for (let i = 0; i < industries.length; i++) {
    if (!(developPlan(state, ctx, playerId, [industries[i]]) instanceof RuleError)) actions.push({ type: 'develop', cards: [card], industries: [industries[i]] })
    for (let j = i; j < industries.length; j++) {
      if (!(developPlan(state, ctx, playerId, [industries[i], industries[j]]) instanceof RuleError)) actions.push({ type: 'develop', cards: [card], industries: [industries[i], industries[j]] })
    }
  }
  for (const sale of saleOptions(state, ctx, playerId)) actions.push({ type: 'sell', cards: [card], sale })
  for (const loan of loanOptions(state, ctx, playerId)) if (!loan.problem) actions.push({ type: 'loan', cards: [card], amount: loan.amount })
  actions.push({ type: 'pass', cards: [card] })
  return actions
}
