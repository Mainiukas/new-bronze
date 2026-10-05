/**
 * The game's fixed numbers, as the rulebook states them (docs/RULES.md): setup,
 * actions, link and loan costs, end scoring. The tile, track, market and card
 * numbers are in the other config files (tiles.ts from docs/TILES.md,
 * markets.ts, distantMarket.ts, cards.ts). All of these are checked.
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

/*
 * Online play (the game server): the chess clock per player, timeouts and
 * disconnections. Only Normal is playable; Blitz and Bullet are ready for when
 * they are.
 */

/**
 * The chess clock (Normal): each player has 20 minutes for the whole game, and
 * 20 seconds are added once their turn (all its actions) is confirmed. It runs
 * only during their own turn; the game server keeps it.
 */
export const CLOCK = { clockSeconds: 1200, incrementSeconds: 20 } as const

/** Each player's clock for the whole game, and the time added after each of their turns. */
export const TIME_CONTROL: Readonly<Record<'normal' | 'blitz' | 'bullet', { readonly baseMs: number; readonly incrementMs: number }>> = {
  normal: { baseMs: CLOCK.clockSeconds * 1000, incrementMs: CLOCK.incrementSeconds * 1000 },
  blitz: { baseMs: 10 * 60_000, incrementMs: 15_000 },
  bullet: { baseMs: 5 * 60_000, incrementMs: 10_000 },
}

/** The clock is frozen this long while the era's scoring is shown. */
export const SCORING_PAUSE_MS = 10_000

/** Under this, a clock shows amber… */
export const CLOCK_LOW_MS = 2 * 60_000
/** …and under this, red (pulsing). */
export const CLOCK_CRITICAL_MS = 30_000

/** A player who hasn't been heard from for this long is disconnected… */
export const CONNECTION_LOST_MS = 30_000
/** …and after this grace time a bot plays their seat until they come back. */
export const DISCONNECT_GRACE_MS = 120_000

/**
 * How long a bot "thinks" before a move (ms), so it plays like a person rather than all at once: a
 * longer look at the start of its turn, a shorter one for its second action, and now and then a longer
 * pause. `random` is a number in [0, 1) each time.
 */
export const BOT_THINK = {
  firstOfTurn: [1600, 3400],
  later: [900, 1900],
  /** Sometimes it hesitates: this share of moves gets the extra pause. */
  pauseChance: 0.12,
  pause: [1200, 2800],
} as const

export function botThinkTime(firstOfTurn: boolean, random: () => number = Math.random): number {
  const [lo, hi] = firstOfTurn ? BOT_THINK.firstOfTurn : BOT_THINK.later
  let ms = lo + (hi - lo) * random()
  if (random() < BOT_THINK.pauseChance) ms += BOT_THINK.pause[0] + (BOT_THINK.pause[1] - BOT_THINK.pause[0]) * random()
  return Math.round(ms)
}
