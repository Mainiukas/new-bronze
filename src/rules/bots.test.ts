import { describe, expect, it } from 'vitest'
import { botAction } from './bots'
import { RULES } from './context'
import { applyAction, createGame, currentPlayerId } from './engine'

const ctx = RULES.ctx

describe('computer players: Easy and Normal', () => {
  it('play a whole game against each other with legal moves only', () => {
    let s = createGame(ctx, [
      { name: 'Easy', isAI: true, aiLevel: 'easy' },
      { name: 'Normal', isAI: true, aiLevel: 'normal' },
    ], 4242)
    let moves = 0
    while (!s.finished) {
      const id = currentPlayerId(s)
      s = applyAction(s, ctx, id, botAction(s, ctx, id, id === 0 ? 'easy' : 'normal', moves))
      if (++moves > 2000) throw new Error('The game never ended')
    }
    expect(s.ranking).toHaveLength(2)
  }, 60_000)

  it('Easy prefers building: from the opening position it builds when it can', () => {
    const s = createGame(ctx, [
      { name: 'Easy', isAI: true, aiLevel: 'easy' },
      { name: 'B', isAI: true, aiLevel: 'easy' },
    ], 7)
    const id = currentPlayerId(s)
    const picks = Array.from({ length: 40 }, (_, move) => botAction(s, ctx, id, 'easy', move).type)
    expect(picks.filter((t) => t === 'build').length).toBeGreaterThan(20)
  })

  it('is repeatable: the same game and move give the same choice', () => {
    const s = createGame(ctx, [
      { name: 'A', isAI: true, aiLevel: 'easy' },
      { name: 'B', isAI: true, aiLevel: 'easy' },
    ], 99)
    const id = currentPlayerId(s)
    expect(botAction(s, ctx, id, 'easy', 3)).toEqual(botAction(s, ctx, id, 'easy', 3))
  })
})
