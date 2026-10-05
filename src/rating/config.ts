/**
 * The rating system's numbers (Glicko-2, like chess.com). The server uses the
 * same file (supabase/functions/_shared) when it rates a finished game.
 */

/** The levels a new player picks in the welcome slides, and the rating each starts at. */
export const START_LEVELS = ['new', 'beginner', 'intermediate', 'advanced'] as const
export type StartLevel = (typeof START_LEVELS)[number]
export const START_RATING: Readonly<Record<StartLevel, number>> = { new: 800, beginner: 1000, intermediate: 1200, advanced: 1400 }

/** Glicko-2 starting values: a high RD lets the rating move a lot in the first games. */
export const START_RD = 350
export const START_VOLATILITY = 0.06
/** Glicko-2's system constant (how much volatility may change). */
export const TAU = 0.5
/** A rating period is one day: RD grows again for each day without a game. */
export const RATING_PERIOD_DAYS = 1

/** Provisional ("1000?") while fewer games than this, or RD above PROVISIONAL_RD. */
export const PROVISIONAL_GAMES = 10
export const PROVISIONAL_RD = 110

/** How much a game moves the rating, by mode: Normal the most, Bullet the least. */
export const MODE_WEIGHT: Readonly<Record<'normal' | 'blitz' | 'bullet', number>> = { normal: 1, blitz: 0.7, bullet: 0.4 }

/** Quick play: look for opponents within this many points, widening by the step every interval. */
export const MATCHMAKING = { startRange: 150, widenBy: 50, widenEverySeconds: 10 } as const

/**
 * Separate ratings for 2-, 3- and 4-player games: each is stored under its
 * own key, "<map>@<n>p" (e.g. "wales-and-the-west@3p"). The plain map key
 * holds the starting level picked in the welcome slides (and ratings from
 * before the split): a player's first game at a player count starts from it.
 */
export const RATED_PLAYER_COUNTS = [2, 3, 4] as const
export type RatedPlayers = (typeof RATED_PLAYER_COUNTS)[number]
export const ratingKey = (mapId: string, players: number) => `${mapId}@${players}p`
/** The map and player count of a rating key; `players` is null for the plain map key (the starting level). */
export function parseRatingKey(key: string): { mapId: string; players: RatedPlayers | null } {
  const m = /^(.*)@([234])p$/.exec(key)
  return m ? { mapId: m[1], players: Number(m[2]) as RatedPlayers } : { mapId: key, players: null }
}
export const isRatedPlayers = (n: unknown): n is RatedPlayers => n === 2 || n === 3 || n === 4
