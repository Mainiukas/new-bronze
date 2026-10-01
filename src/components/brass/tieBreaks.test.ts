import { describe, expect, it } from 'vitest'
import type { GameState } from '../../rules/state'
import { tieBreaks } from './tieBreaks'

const game = (players: { vp: number; incomeSpace: number; money: number }[], ranking: number[]) => ({ players, ranking }) as unknown as GameState

describe('tie-break explanations', () => {
  it('says nothing when nobody shares a VP total', () => {
    expect(tieBreaks(game([{ vp: 50, incomeSpace: 30, money: 5 }, { vp: 40, incomeSpace: 40, money: 9 }], [0, 1]))).toEqual([])
  })

  it('explains a tie on VP by income, then money, then turn order', () => {
    const players = [
      { vp: 50, incomeSpace: 30, money: 5 },
      { vp: 50, incomeSpace: 25, money: 9 },
      { vp: 50, incomeSpace: 25, money: 4 },
      { vp: 50, incomeSpace: 25, money: 4 },
    ]
    expect(tieBreaks(game(players, [0, 1, 2, 3]))).toEqual([
      { winner: 0, loser: 1, by: 'income' },
      { winner: 1, loser: 2, by: 'money' },
      { winner: 2, loser: 3, by: 'order' },
    ])
  })
})
