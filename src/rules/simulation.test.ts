import { describe, expect, it } from 'vitest'
import { chooseAction } from './ai'
import { applyAction, currentPlayerId, levelFor, linkValueAt, type RulesContext } from './engine'
import { BRASS_MAP } from './map'
import { PLACEHOLDER_DATA } from './placeholder'
import type { AILevel, GameState } from './state'

/*
 * Whole games between computer players (on the placeholder numbers), checked
 * after every move: no errors, money never negative, cubes and markets in
 * range, and a final score that matches an independent count.
 */
const ctx: RulesContext = { data: PLACEHOLDER_DATA, map: BRASS_MAP }
const LEVELS: AILevel[] = ['hard', 'normal', 'easy', 'normal']

function checkInvariants(s: GameState) {
  for (const p of s.players) {
    expect(p.money).toBeGreaterThanOrEqual(0)
    expect(p.hand.length).toBeLessThanOrEqual(8)
    expect(p.incomeSpace).toBeGreaterThanOrEqual(0)
    expect(p.incomeSpace).toBeLessThanOrEqual(100)
    for (const counts of Object.values(p.mat)) counts.forEach((n) => expect(n).toBeGreaterThanOrEqual(0))
  }
  for (const [slot, t] of Object.entries(s.tiles)) {
    expect(t.cubes).toBeGreaterThanOrEqual(0)
    expect(BRASS_MAP.slots[slot].industries).toContain(t.industry)
    if (t.cubes > 0) expect(t.flipped).toBe(false)
  }
  expect(s.market.coal).toBeGreaterThanOrEqual(0)
  expect(s.market.coal).toBeLessThanOrEqual(8)
  expect(s.market.iron).toBeGreaterThanOrEqual(0)
  expect(s.market.iron).toBeLessThanOrEqual(8)
}

/** Rail-era scoring counted independently of the engine's eraScores. */
function railScores(s: GameState): number[] {
  const out = s.players.map(() => 0)
  for (const [id, link] of Object.entries(s.links)) {
    const l = BRASS_MAP.links[id]
    out[link.owner] += linkValueAt(s, ctx, l.from) + linkValueAt(s, ctx, l.to)
  }
  for (const t of Object.values(s.tiles)) if (t.flipped) out[t.owner] += levelFor(ctx, t).vp
  return out
}

function play(players: number, seed: number): { state: GameState; moves: number } {
  let s = (() => {
    const seats = Array.from({ length: players }, (_, i) => ({ name: `AI ${i + 1}`, isAI: true, aiLevel: LEVELS[i] }))
    return createGameFor(seats, seed)
  })()
  let moves = 0
  while (!s.finished) {
    const id = currentPlayerId(s)
    const action = chooseAction(s, ctx, id)
    s = applyAction(s, ctx, id, action)
    checkInvariants(s)
    if (++moves > 2000) throw new Error('The game never ended')
  }
  return { state: s, moves }
}

import { createGame } from './engine'
function createGameFor(seats: { name: string; isAI: boolean; aiLevel: AILevel }[], seed: number) {
  return createGame(ctx, seats, seed)
}

describe('simulated games between computer players', () => {
  for (const players of [4, 3, 2]) {
    it(`${players} players: plays to the end with legal moves only, and scores correctly`, () => {
      for (const seed of [1, 2]) {
        const { state } = play(players, seed * 1000 + players)
        expect(state.finished).toBe(true)
        expect(state.era).toBe('rail')
        expect(state.ranking).toHaveLength(players)

        const eraEnds = state.log.flatMap((e) => (e.kind === 'era-end' ? [e] : []))
        expect(eraEnds.map((e) => e.era)).toEqual(['canal', 'rail'])
        // The rail era's scores match an independent count of the final board.
        expect(eraEnds[1].scores.map((x) => x.links + x.tiles)).toEqual(railScores(state))
        // Every VP is accounted for: both eras, +1 per £10, minus VP lost to unpaid income.
        const lost = state.players.map((_, id) => state.log.reduce((n, e) => (e.kind === 'shortfall' && e.player === id ? n + e.vpLost : n), 0))
        state.players.forEach((p, id) => {
          const expected = eraEnds.reduce((n, e) => n + e.scores[id].links + e.scores[id].tiles, 0) + Math.floor(p.money / 10) - lost[id]
          expect(p.vp).toBe(Math.max(0, expected))
        })
        // The winner has the most VP.
        const top = Math.max(...state.players.map((p) => p.vp))
        expect(state.players[state.ranking![0]].vp).toBe(top)
        // They actually played: things were built and sold.
        expect(state.log.some((e) => e.kind === 'build')).toBe(true)
        expect(state.log.some((e) => e.kind === 'network')).toBe(true)
      }
    }, 120_000)
  }
})
