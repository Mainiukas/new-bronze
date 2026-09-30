/**
 * What a player can do right now: the legal slots for a build, links for the
 * network action, tiles to develop, sales, loans. The UI uses these to light
 * up the board and to explain disabled controls; the computer players choose
 * from them. Everything is worked out with the engine's own plan* checks, so
 * a listed option is always legal.
 *
 * Every action discards a card. The functions take the card(s) the player
 * chose; without one they use discardChoice: the card least useful for
 * building.
 */

import { LOANS } from './constants'
import { linkOpen, lowestLevelIndex, levelRow, planBuild, planDevelop, planNetwork, loanProblem, saleOptions, type BuildPlan, type DevelopPlan, type NetworkPlan, type RulesContext } from './engine'
import { RuleError, type Action, type Card, type GameState, type RuleErrorCode, type Sale } from './state'
import { INDUSTRY_ORDER, type IndustryId } from './tileTable'

function attempt<T>(fn: () => T): T | RuleError {
  try {
    return fn()
  } catch (error) {
    if (error instanceof RuleError) return error
    throw error
  }
}

/** The first of these codes that occurs (the most telling reason), else any. */
function mostTelling(codes: Iterable<RuleErrorCode>, priority: readonly RuleErrorCode[], fallback: RuleErrorCode): RuleErrorCode {
  const found = new Set(codes)
  for (const code of priority) if (found.has(code)) return code
  return [...found][0] ?? fallback
}

const BUILD_REASONS: readonly RuleErrorCode[] = ['money', 'coal', 'iron', 'one-per-town', 'overbuild', 'network', 'slot-preference', 'era', 'locked', 'no-tiles', 'closed', 'two-cards', 'card']

/* ---- Building with chosen cards --------------------------------------------------- */

export interface CardBuildTarget {
  readonly slot: string
  readonly industry: IndustryId
  readonly plan: BuildPlan
}

/**
 * Every (slot, industry) the chosen cards can build now: a location card its
 * town's slots, an industry card that industry's slots in the player's
 * network, two cards (the joker, both actions) any slot. `industry` narrows
 * it to one industry. Slot priority, the canal-era limit, coal and iron are
 * the engine's checks, so a slot is listed only when the build is legal.
 */
export function cardBuildTargets(state: GameState, ctx: RulesContext, playerId: number, cards: readonly string[], industry?: IndustryId): CardBuildTarget[] {
  return scanCardBuilds(state, ctx, playerId, cards, industry).targets
}

/** Why the chosen cards can't build anything (or not this industry), or null when they can. */
export function cardBuildBlocker(state: GameState, ctx: RulesContext, playerId: number, cards: readonly string[], industry?: IndustryId): RuleErrorCode | null {
  if (state.selling) return 'selling'
  if (state.actionsLeft < cards.length) return cards.length === 2 ? 'two-cards' : 'no-actions'
  const scan = scanCardBuilds(state, ctx, playerId, cards, industry)
  return scan.targets.length ? null : mostTelling(scan.reasons, BUILD_REASONS, 'card')
}

/**
 * Slots the chosen cards could build in but for coal (nothing connected, and
 * no connection to a trade location for the market): the board says
 * "No coal connection" there.
 */
export function cardCoalBlocked(state: GameState, ctx: RulesContext, playerId: number, cards: readonly string[], industry?: IndustryId): string[] {
  const scan = scanCardBuilds(state, ctx, playerId, cards, industry)
  const ok = new Set(scan.targets.map((t) => t.slot))
  return [...scan.coal].filter((slot) => !ok.has(slot))
}

function scanCardBuilds(state: GameState, ctx: RulesContext, playerId: number, cards: readonly string[], only?: IndustryId): { targets: CardBuildTarget[]; reasons: RuleErrorCode[]; coal: Set<string> } {
  const hand = state.players[playerId].hand
  const chosen = cards.map((id) => hand.find((c) => c.id === id)).filter((c): c is Card => !!c)
  const targets: CardBuildTarget[] = []
  const reasons: RuleErrorCode[] = []
  const coal = new Set<string>()
  if (chosen.length !== cards.length || chosen.length < 1 || chosen.length > 2) return { targets, reasons: ['card'], coal }
  const card = chosen.length === 1 ? chosen[0] : null
  for (const slot of Object.values(ctx.map.slots)) {
    if (card?.kind === 'location' && slot.town !== card.town) continue
    for (const industry of slot.industries) {
      if (card?.kind === 'industry' && industry !== card.industry) continue
      if (only && industry !== only) continue
      const plan = attempt(() => planBuild(state, ctx, playerId, { type: 'build', cards: [...cards], slot: slot.key, industry }))
      if (plan instanceof RuleError) {
        reasons.push(plan.code)
        if (plan.code === 'coal') coal.add(slot.key)
      } else targets.push({ slot: slot.key, industry, plan })
    }
  }
  if (!targets.length && !reasons.length) reasons.push(card?.kind === 'industry' ? 'slot' : 'card')
  return { targets, reasons, coal }
}

/* ---- Which card to give up ---------------------------------------------------------- */

/** For each card in hand: how many builds it alone could pay for now (0 = only good for discarding). */
export function cardUsefulness(state: GameState, ctx: RulesContext, playerId: number): Map<string, number> {
  const out = new Map<string, number>()
  for (const card of state.players[playerId].hand) out.set(card.id, scanCardBuilds(state, ctx, playerId, [card.id]).targets.length)
  return out
}

/** The card to discard for an action that doesn't need a particular one: the least useful for building, the newest of those. */
export function discardChoice(state: GameState, ctx: RulesContext, playerId: number): string | null {
  const hand = state.players[playerId].hand
  if (!hand.length) return null
  const useful = cardUsefulness(state, ctx, playerId)
  let best = hand[hand.length - 1]
  for (let i = hand.length - 1; i >= 0; i--) if (useful.get(hand[i].id)! < useful.get(best.id)!) best = hand[i]
  return best.id
}

/**
 * Card choices that could pay for building `industry` in a town, best first:
 * a location card for the town, an industry card, then any two cards (as a
 * location card, using both actions): the two least useful ones.
 */
export function buildCardChoices(state: GameState, ctx: RulesContext, playerId: number, town: string, industry: IndustryId, joker = jokerPair(state, ctx, playerId)): string[][] {
  const hand = state.players[playerId].hand
  const choices: string[][] = []
  const location = hand.find((c) => c.kind === 'location' && c.town === town)
  if (location) choices.push([location.id])
  const industryCard = hand.find((c) => c.kind === 'industry' && c.industry === industry)
  if (industryCard) choices.push([industryCard.id])
  if (joker) choices.push([...joker])
  return choices
}

/** The two cards to use as a joker (any location, both actions): the two least useful, or null when it isn't possible. */
export function jokerPair(state: GameState, ctx: RulesContext, playerId: number): readonly [string, string] | null {
  const hand = state.players[playerId].hand
  if (state.actionsLeft < 2 || hand.length < 2) return null
  const useful = cardUsefulness(state, ctx, playerId)
  const [a, b] = [...hand].reverse().sort((x, y) => useful.get(x.id)! - useful.get(y.id)!)
  return [a.id, b.id]
}

export interface BuildOption {
  readonly slot: string
  readonly plan: BuildPlan
}

/** Every slot where `industry` can be built now, each with the plan (cards chosen as in buildCardChoices). */
export function buildOptions(state: GameState, ctx: RulesContext, playerId: number, industry: IndustryId, joker = jokerPair(state, ctx, playerId)): BuildOption[] {
  const out: BuildOption[] = []
  for (const slot of Object.values(ctx.map.slots)) {
    if (!slot.industries.includes(industry)) continue
    for (const cards of buildCardChoices(state, ctx, playerId, slot.town, industry, joker)) {
      const plan = attempt(() => planBuild(state, ctx, playerId, { type: 'build', cards, slot: slot.key, industry }))
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
  const joker = jokerPair(state, ctx, playerId)
  if (buildOptions(state, ctx, playerId, industry, joker).length) return null
  const reasons: RuleErrorCode[] = []
  for (const slot of Object.values(ctx.map.slots)) {
    if (!slot.industries.includes(industry)) continue
    for (const cards of buildCardChoices(state, ctx, playerId, slot.town, industry, joker)) {
      const r = attempt(() => planBuild(state, ctx, playerId, { type: 'build', cards, slot: slot.key, industry }))
      if (r instanceof RuleError) reasons.push(r.code)
    }
  }
  return mostTelling(reasons, ['money', 'coal', 'iron', 'network', 'card'], 'card')
}

/* ---- Network, develop, sell, loan ------------------------------------------------------ */

/** Links that can be picked next for a network action of `count` links, given the ones already picked. */
export function linkOptions(state: GameState, ctx: RulesContext, playerId: number, count: 1 | 2, picked: readonly string[] = [], card = discardChoice(state, ctx, playerId)): { link: string; plan: NetworkPlan | null }[] {
  if (!card || state.actionsLeft < 1 || state.selling) return []
  const candidates = Object.values(ctx.map.links).filter((l) => linkOpen(state, ctx, l) && !state.links[l.id] && !picked.includes(l.id))
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

/** Link spaces that could be built but for coal (rail era): the board says "No coal connection" there. */
export function linkCoalBlocked(state: GameState, ctx: RulesContext, playerId: number, picked: readonly string[] = [], card = discardChoice(state, ctx, playerId)): string[] {
  if (!card || state.era !== 'rail' || state.actionsLeft < 1 || state.selling) return []
  const out: string[] = []
  for (const l of Object.values(ctx.map.links)) {
    if (!linkOpen(state, ctx, l) || state.links[l.id] || picked.includes(l.id)) continue
    const r = attempt(() => planNetwork(state, ctx, playerId, { type: 'network', cards: [card], links: [...picked, l.id] }))
    if (r instanceof RuleError && r.code === 'coal') out.push(l.id)
  }
  return out
}

/** Slots of an industry that could be built but for coal (building without a picked card). */
export function coalBlockedSlots(state: GameState, ctx: RulesContext, playerId: number, industry: IndustryId): string[] {
  const joker = jokerPair(state, ctx, playerId)
  const out: string[] = []
  for (const slot of Object.values(ctx.map.slots)) {
    if (!slot.industries.includes(industry)) continue
    const tries = buildCardChoices(state, ctx, playerId, slot.town, industry, joker).map((cards) => attempt(() => planBuild(state, ctx, playerId, { type: 'build', cards, slot: slot.key, industry })))
    if (tries.length && tries.every((r) => r instanceof RuleError) && tries.some((r) => r instanceof RuleError && r.code === 'coal')) out.push(slot.key)
  }
  return out
}

/** Why a network action of `count` links is impossible now, or null. */
export function networkBlocker(state: GameState, ctx: RulesContext, playerId: number, count: 1 | 2, card = discardChoice(state, ctx, playerId)): RuleErrorCode | null {
  if (state.era === 'canal' && count === 2) return 'era'
  if (state.actionsLeft < 1 || state.selling) return state.selling ? 'selling' : 'no-actions'
  if (!card) return 'card'
  if (linkOptions(state, ctx, playerId, count, [], card).length) return null
  const reasons: RuleErrorCode[] = []
  for (const l of Object.values(ctx.map.links)) {
    if (!linkOpen(state, ctx, l) || state.links[l.id]) continue
    const r = attempt(() => planNetwork(state, ctx, playerId, { type: 'network', cards: [card], links: count === 1 ? [l.id] : [l.id, l.id] }))
    if (r instanceof RuleError && r.code !== 'link') reasons.push(r.code)
  }
  return mostTelling(reasons, ['money', 'coal', 'network'], 'link')
}

/** Plan for developing these industries' lowest tiles, or the reason it's impossible. */
export function developPlan(state: GameState, ctx: RulesContext, playerId: number, industries: readonly IndustryId[], card = discardChoice(state, ctx, playerId)): DevelopPlan | RuleError {
  if (!card) return new RuleError('card', 'No cards')
  if (state.selling) return new RuleError('selling', 'Finish selling first')
  return attempt(() => planDevelop(state, ctx, playerId, { type: 'develop', cards: [card], industries: [...industries] }))
}

/** Why developing one tile of this industry is impossible, or null. */
export function developBlocker(state: GameState, ctx: RulesContext, playerId: number, industry: IndustryId, card = discardChoice(state, ctx, playerId)): RuleErrorCode | null {
  const r = developPlan(state, ctx, playerId, [industry], card)
  return r instanceof RuleError ? r.code : null
}

export function loanOptions(state: GameState, ctx: RulesContext, playerId: number): { amount: 10 | 20 | 30; levels: number; problem: RuleError | null }[] {
  return ([10, 20, 30] as const).map((amount) => ({ amount, levels: LOANS[amount], problem: state.selling || state.actionsLeft < 1 ? new RuleError('no-actions', 'No actions left') : loanProblem(state, ctx, playerId, amount) }))
}

export { saleOptions }
export type { Sale }

/* ---- One card, every action ------------------------------------------------------------ */

export type CardAction = 'build' | 'network' | 'develop' | 'sell' | 'loan' | 'pass'
export const CARD_ACTIONS: readonly CardAction[] = ['build', 'network', 'develop', 'sell', 'loan', 'pass']

/**
 * What the chosen card allows now: each action, or the reason it's disabled.
 * Only Build depends on which card it is; any card pays for the others.
 */
export function cardActions(state: GameState, ctx: RulesContext, playerId: number, card: string): Record<CardAction, RuleErrorCode | null> {
  const common: RuleErrorCode | null = state.finished
    ? 'game-over'
    : state.selling
      ? 'selling'
      : state.order[state.turn] !== playerId
        ? 'not-your-turn'
        : state.actionsLeft < 1
          ? 'no-actions'
          : !state.players[playerId].hand.some((c) => c.id === card)
            ? 'card'
            : null
  if (common) return { build: common, network: common, develop: common, sell: common, loan: common, pass: common }
  const oneLink = networkBlocker(state, ctx, playerId, 1, card)
  const twoLinks = state.era === 'rail' ? networkBlocker(state, ctx, playerId, 2, card) : 'era'
  const developCodes = INDUSTRY_ORDER.map((industry) => developBlocker(state, ctx, playerId, industry, card))
  const loans = loanOptions(state, ctx, playerId)
  return {
    build: cardBuildBlocker(state, ctx, playerId, [card]),
    network: oneLink === null || twoLinks === null ? null : oneLink,
    develop: developCodes.includes(null) ? null : mostTelling(developCodes.filter((c): c is RuleErrorCode => c !== null), ['iron', 'money', 'develop', 'locked', 'no-tiles'], 'develop'),
    sell: saleOptions(state, ctx, playerId).length ? null : 'sale',
    loan: loans.some((l) => !l.problem) ? null : loans[0].problem!.code,
    pass: null,
  }
}

/* ---- Every legal action (the computer players) ----------------------------------------- */

/** Every legal action for a player. Builds use buildCardChoices; the other actions give up discardChoice's card. */
export function legalActions(state: GameState, ctx: RulesContext, playerId: number): Action[] {
  if (state.finished) return []
  if (state.selling) {
    if (state.selling.player !== playerId) return []
    return [...saleOptions(state, ctx, playerId).map((sale) => ({ type: 'sell-more', sale }) as Action), { type: 'sell-stop' }]
  }
  if (state.order[state.turn] !== playerId || state.actionsLeft < 1) return []
  const card = discardChoice(state, ctx, playerId)
  if (!card) return []
  const actions: Action[] = []
  const joker = jokerPair(state, ctx, playerId)
  for (const industry of INDUSTRY_ORDER) {
    for (const option of buildOptions(state, ctx, playerId, industry, joker)) {
      actions.push({ type: 'build', cards: [...option.plan.cards], slot: option.slot, industry })
    }
  }
  for (const { link } of linkOptions(state, ctx, playerId, 1, [], card)) actions.push({ type: 'network', cards: [card], links: [link] })
  if (state.era === 'rail') {
    for (const first of linkOptions(state, ctx, playerId, 2, [], card)) {
      for (const second of linkOptions(state, ctx, playerId, 2, [first.link], card)) {
        if (first.link < second.link) actions.push({ type: 'network', cards: [card], links: [first.link, second.link] })
      }
    }
  }
  for (let i = 0; i < INDUSTRY_ORDER.length; i++) {
    if (!(developPlan(state, ctx, playerId, [INDUSTRY_ORDER[i]], card) instanceof RuleError)) actions.push({ type: 'develop', cards: [card], industries: [INDUSTRY_ORDER[i]] })
    for (let j = i; j < INDUSTRY_ORDER.length; j++) {
      if (!(developPlan(state, ctx, playerId, [INDUSTRY_ORDER[i], INDUSTRY_ORDER[j]], card) instanceof RuleError)) actions.push({ type: 'develop', cards: [card], industries: [INDUSTRY_ORDER[i], INDUSTRY_ORDER[j]] })
    }
  }
  for (const sale of saleOptions(state, ctx, playerId)) actions.push({ type: 'sell', cards: [card], sale })
  for (const loan of loanOptions(state, ctx, playerId)) if (!loan.problem) actions.push({ type: 'loan', cards: [card], amount: loan.amount })
  actions.push({ type: 'pass', cards: [card] })
  return actions
}
