import { describe, expect, it } from 'vitest'
import { MODE_WEIGHT, START_RATING, START_RD, START_VOLATILITY } from './config'
import { glicko2, isProvisional, rateGame, rdAfterIdle, type Finisher, type Rating } from './glicko2'

const NOW = Date.UTC(2026, 8, 30)
const DAY = 86_400_000
const fresh = (rating = 1200): Rating => ({ rating, rd: START_RD, volatility: START_VOLATILITY, gamesPlayed: 0, updatedAt: NOW })
const seasoned = (rating = 1200): Rating => ({ rating, rd: 60, volatility: START_VOLATILITY, gamesPlayed: 100, updatedAt: NOW })
const byId = (changes: ReturnType<typeof rateGame>) => Object.fromEntries(changes.map((c) => [c.id, c]))

describe('Glicko-2', () => {
  it('matches Glickman’s worked example (1500/200 vs 1400/30 win, 1550/100 loss, 1700/300 loss)', () => {
    const next = glicko2({ rating: 1500, rd: 200, volatility: 0.06 }, [
      { rating: 1400, rd: 30, score: 1 },
      { rating: 1550, rd: 100, score: 0 },
      { rating: 1700, rd: 300, score: 0 },
    ])
    expect(next.rating).toBeCloseTo(1464.06, 1)
    expect(next.rd).toBeCloseTo(151.52, 1)
    expect(next.volatility).toBeCloseTo(0.05999, 4)
  })

  it('starts new players at their picked level with RD 350 and volatility 0.06', () => {
    expect(START_RATING).toEqual({ new: 800, beginner: 1000, intermediate: 1200, advanced: 1400 })
    expect([START_RD, START_VOLATILITY]).toEqual([350, 0.06])
  })

  it('moves a new player’s rating much more than one with 100 games', () => {
    const newcomer = byId(rateGame([{ id: 'a', place: 1, rating: fresh() }, { id: 'b', place: 2, rating: seasoned() }], 'normal', NOW))
    const veteran = byId(rateGame([{ id: 'a', place: 1, rating: seasoned() }, { id: 'b', place: 2, rating: seasoned() }], 'normal', NOW))
    expect(newcomer.a.delta).toBeGreaterThan(100)
    expect(veteran.a.delta).toBeGreaterThan(0)
    expect(veteran.a.delta).toBeLessThan(20)
    expect(newcomer.a.delta).toBeGreaterThan(veteran.a.delta * 5)
    // And the RD shrinks as games are played: later changes are small.
    expect(newcomer.a.rd).toBeLessThan(START_RD)
  })

  it('scales the change by the mode: Normal 1, Blitz 0.7, Bullet 0.4', () => {
    expect(MODE_WEIGHT).toEqual({ normal: 1, blitz: 0.7, bullet: 0.4 })
    const game = (mode: 'normal' | 'blitz' | 'bullet') => byId(rateGame([{ id: 'a', place: 1, rating: fresh() }, { id: 'b', place: 2, rating: fresh() }], mode, NOW)).a.delta
    const normal = game('normal')
    expect(game('blitz')).toBeCloseTo(normal * 0.7, 6)
    expect(game('bullet')).toBeCloseTo(normal * 0.4, 6)
  })

  it('rates 2-, 3- and 4-player games by place: the winner gains, the last loses, the middle roughly holds', () => {
    for (const n of [2, 3, 4]) {
      const players: Finisher[] = Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, place: i + 1, rating: fresh() }))
      const changes = rateGame(players, 'normal', NOW)
      const deltas = changes.map((c) => c.delta)
      expect(deltas[0]).toBeGreaterThan(0)
      expect(deltas[n - 1]).toBeLessThan(0)
      // Better places gain more.
      for (let i = 1; i < n; i++) expect(deltas[i]).toBeLessThan(deltas[i - 1])
      // Equal ratings: the changes balance out.
      expect(deltas.reduce((a, b) => a + b, 0)).toBeCloseTo(0, 6)
      if (n === 3) expect(Math.abs(deltas[1])).toBeLessThan(1)
    }
  })

  it('counts the same place as a draw: equal players who tie don’t move', () => {
    const changes = rateGame([{ id: 'a', place: 1, rating: fresh() }, { id: 'b', place: 1, rating: fresh() }], 'normal', NOW)
    for (const c of changes) expect(Math.abs(c.delta)).toBeLessThan(0.01)
    // A draw against a stronger player is a gain.
    const upset = byId(rateGame([{ id: 'weak', place: 1, rating: fresh(1000) }, { id: 'strong', place: 1, rating: fresh(1400) }], 'normal', NOW))
    expect(upset.weak.delta).toBeGreaterThan(0)
    expect(upset.strong.delta).toBeLessThan(0)
  })

  it('treats a forfeit as last place: the forfeiter loses to everyone', () => {
    // The game server gives forfeits the last place (tied if several forfeit).
    const changes = byId(
      rateGame(
        [
          { id: 'winner', place: 1, rating: fresh() },
          { id: 'second', place: 2, rating: fresh() },
          { id: 'quit', place: 3, rating: fresh() },
        ],
        'normal',
        NOW,
      ),
    )
    expect(changes.quit.delta).toBeLessThan(changes.second.delta)
    expect(changes.quit.delta).toBeLessThan(-50)
  })

  it('grows the RD again after days without games (one rating period a day), never past 350', () => {
    const idle = { ...seasoned(), updatedAt: NOW - 30 * DAY }
    expect(rdAfterIdle(idle, NOW)).toBeGreaterThan(60)
    expect(rdAfterIdle({ ...idle, updatedAt: NOW - 12 * 3_600_000 }, NOW)).toBe(60) // same day: no change
    expect(rdAfterIdle({ ...fresh(), updatedAt: NOW - 400 * DAY }, NOW)).toBe(350)
    // So a returning player's result moves them more than it would have.
    const back = byId(rateGame([{ id: 'a', place: 1, rating: idle }, { id: 'b', place: 2, rating: seasoned() }], 'normal', NOW)).a.delta
    const active = byId(rateGame([{ id: 'a', place: 1, rating: seasoned() }, { id: 'b', place: 2, rating: seasoned() }], 'normal', NOW)).a.delta
    expect(back).toBeGreaterThan(active)
  })

  it('shows a rating as provisional under 10 games or with RD over 110', () => {
    expect(isProvisional({ gamesPlayed: 3, rd: 90 })).toBe(true)
    expect(isProvisional({ gamesPlayed: 30, rd: 150 })).toBe(true)
    expect(isProvisional({ gamesPlayed: 30, rd: 80 })).toBe(false)
  })
})
