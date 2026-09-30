/**
 * Glicko-2 (Glickman, "Example of the Glicko-2 system", 2013), as chess.com
 * uses it, adapted to 2–4 player games: after a game, every pair of players
 * counts as one head-to-head result by finishing place (the higher place
 * wins, the same place is a draw), and each player gets one update from all
 * their pairs. The rating change is then scaled by the mode's weight.
 *
 * Pure: the game server (supabase/functions) runs it when a rated game ends.
 */

import { MODE_WEIGHT, PROVISIONAL_GAMES, PROVISIONAL_RD, RATING_PERIOD_DAYS, START_RD, TAU } from './config'

/** Glicko-2's scale factor between the rating scale and its internal one. */
const SCALE = 173.7178
const CONVERGENCE = 0.000001

export interface Rating {
  rating: number
  rd: number
  volatility: number
  gamesPlayed: number
  /** When the rating last changed (ms since 1970); the RD grows again from there. */
  updatedAt: number
}

/** A finished game's player: their rating now and where they finished (1 = first; equal places are draws). */
export interface Finisher {
  id: string
  place: number
  rating: Rating
}

/**
 * The RD after `now - updatedAt` without games: it grows by the volatility
 * once per rating period (a day), never past the starting 350.
 */
export function rdAfterIdle(rating: Rating, now: number): number {
  const periods = Math.floor(Math.max(0, now - rating.updatedAt) / (RATING_PERIOD_DAYS * 86_400_000))
  if (periods === 0) return rating.rd
  const phi = rating.rd / SCALE
  return Math.min(START_RD, Math.sqrt(phi * phi + periods * rating.volatility * rating.volatility) * SCALE)
}

const g = (phi: number) => 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI))
const expected = (mu: number, muJ: number, phiJ: number) => 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)))

/** One Glicko-2 update of `player` from results against `opponents` (score 1 win, 0.5 draw, 0 loss). */
export function glicko2(player: { rating: number; rd: number; volatility: number }, results: { rating: number; rd: number; score: number }[]) {
  const mu = (player.rating - 1500) / SCALE
  const phi = player.rd / SCALE
  const sigma = player.volatility
  if (results.length === 0) return { rating: player.rating, rd: Math.min(START_RD, Math.sqrt(phi * phi + sigma * sigma) * SCALE), volatility: sigma }

  let vInverse = 0
  let sum = 0
  for (const r of results) {
    const muJ = (r.rating - 1500) / SCALE
    const phiJ = r.rd / SCALE
    const e = expected(mu, muJ, phiJ)
    vInverse += g(phiJ) ** 2 * e * (1 - e)
    sum += g(phiJ) * (r.score - e)
  }
  const v = 1 / vInverse
  const delta = v * sum

  // The new volatility: the root of f (Illinois algorithm).
  const a = Math.log(sigma * sigma)
  const f = (x: number) => (Math.exp(x) * (delta * delta - phi * phi - v - Math.exp(x))) / (2 * (phi * phi + v + Math.exp(x)) ** 2) - (x - a) / (TAU * TAU)
  let A = a
  let B: number
  if (delta * delta > phi * phi + v) B = Math.log(delta * delta - phi * phi - v)
  else {
    let k = 1
    while (f(a - k * TAU) < 0) k++
    B = a - k * TAU
  }
  let fA = f(A)
  let fB = f(B)
  for (let i = 0; i < 100 && Math.abs(B - A) > CONVERGENCE; i++) {
    const C = A + ((A - B) * fA) / (fB - fA)
    const fC = f(C)
    if (fC * fB <= 0) {
      A = B
      fA = fB
    } else fA /= 2
    B = C
    fB = fC
  }
  const sigmaNew = Math.exp(A / 2)

  const phiStar = Math.sqrt(phi * phi + sigmaNew * sigmaNew)
  const phiNew = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v)
  const muNew = mu + phiNew * phiNew * sum
  return { rating: muNew * SCALE + 1500, rd: Math.min(START_RD, phiNew * SCALE), volatility: sigmaNew }
}

export interface RatingChange {
  id: string
  before: number
  after: number
  delta: number
  rd: number
  volatility: number
}

/**
 * New ratings after one game: every pair of players is a head-to-head result
 * by place, each player gets one Glicko-2 update from all their pairs (their
 * RD first grown for the days they didn't play), and the change is scaled by
 * the mode's weight (Normal 1, Blitz 0.7, Bullet 0.4).
 */
export function rateGame(players: readonly Finisher[], mode: keyof typeof MODE_WEIGHT, now: number): RatingChange[] {
  const weight = MODE_WEIGHT[mode]
  const current = players.map((p) => ({ ...p, rd: rdAfterIdle(p.rating, now) }))
  return current.map((p) => {
    const results = current
      .filter((o) => o.id !== p.id)
      .map((o) => ({ rating: o.rating.rating, rd: o.rd, score: p.place < o.place ? 1 : p.place > o.place ? 0 : 0.5 }))
    const next = glicko2({ rating: p.rating.rating, rd: p.rd, volatility: p.rating.volatility }, results)
    const delta = (next.rating - p.rating.rating) * weight
    return { id: p.id, before: p.rating.rating, after: p.rating.rating + delta, delta, rd: next.rd, volatility: next.volatility }
  })
}

/** "1000?": still provisional (few games, or a wide RD). */
export function isProvisional(rating: { gamesPlayed: number; rd: number }): boolean {
  return rating.gamesPlayed < PROVISIONAL_GAMES || rating.rd > PROVISIONAL_RD
}
