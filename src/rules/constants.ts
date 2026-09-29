/**
 * The fixed numbers stated in docs/RULES.md (the tile, market, track and card
 * numbers are in docs/TILES.md instead, read through tiles.ts).
 */

/** §1 Setup. */
export const START_MONEY = 30
export const START_INCOME_SPACE = 10
export const HAND_SIZE = 8
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 4

/*
 * §2 Rounds per era (8 / 9 / 10 with 4 / 3 / 2 players) aren't a number here:
 * an era lasts until the hands are played out, so they follow from the deck
 * sizes in cards.ts (see roundsInEra in engine.ts).
 */
/** §2 Canal era round 1: 1 action each; every other turn 2. */
export const FIRST_ROUND_ACTIONS = 1
export const ACTIONS_PER_TURN = 2

/** §3 Network. */
export const CANAL_COST = 3
export const RAIL_COST = 5
export const DOUBLE_RAIL_COST = 15
export const COAL_PER_RAIL = 1

/** §3 Develop: iron per tile removed. */
export const IRON_PER_DEVELOP = 1

/** §3 Loan: amount → income levels lost. Not below this income. */
export const LOANS = { 10: 1, 20: 2, 30: 3 } as const
export const MIN_INCOME = -10

/** §2 Selling tiles to cover negative income: this share of the tile's £ cost, rounded down. */
export const SHORTFALL_TILE_SHARE = 0.5

/** §6 End of game: +1 VP per this many £. */
export const MONEY_PER_VP = 10
