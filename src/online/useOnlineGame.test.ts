import { describe, expect, it } from 'vitest'
import { createGame } from '../rules/engine'
import { RULES_CONTEXT } from '../server/edge'
import { sameState } from './useOnlineGame'

describe('online game views', () => {
  it('treat a fresh copy of an unchanged game state as the same (a turn being played isn’t lost on a heartbeat)', () => {
    const state = createGame(RULES_CONTEXT, [{ name: 'Ada', isAI: false }, { name: 'Bob', isAI: false }], 7)
    const copy = structuredClone(state)
    expect(copy).not.toBe(state)
    expect(sameState(state, copy)).toBe(true)
    expect(sameState(state, { ...copy, round: 2 })).toBe(false)
    expect(sameState(null, null)).toBe(true)
    expect(sameState(state, null)).toBe(false)
  })
})
