import { describe, expect, it } from 'vitest'
import { AI_NAMES } from '../game/rules'
import { DEFAULT_SETUP, opponentsOf, parseSavedSetup, toSeatSetups, withColor, withController, withOpponents } from './matchSetup'

const seats = DEFAULT_SETUP.seats

describe('match setup', () => {
  it('reads the default seats as you against the computer', () => {
    expect(opponentsOf(seats, 3)).toBe('computer')
  })

  it('switches every seat in play to human for pass & play, and back', () => {
    const pass = withOpponents(seats, 3, 'pass')
    expect(opponentsOf(pass, 3)).toBe('pass')
    expect(pass.slice(0, 3).map((s) => s.name)).toEqual(['You', 'Player 2', 'Player 3'])
    // The fourth seat is not in play and keeps its computer.
    expect(pass[3]).toEqual(seats[3])

    const back = withOpponents(pass, 3, 'computer')
    expect(opponentsOf(back, 3)).toBe('computer')
    expect(back.slice(0, 3).map((s) => s.name)).toEqual(['You', AI_NAMES[0], AI_NAMES[1]])
  })

  it('keeps a typed name when a seat changes hands', () => {
    const named = { ...seats[1], name: 'Brunel' }
    expect(withController(named, 1, false)).toMatchObject({ isAI: false, name: 'Brunel' })
  })

  it('reports a mix of humans and computers as mixed', () => {
    const mixed = seats.map((s, i) => (i === 2 ? withController(s, i, false) : s))
    expect(opponentsOf(mixed, 3)).toBe('mixed')
  })

  it('swaps colours instead of repeating one', () => {
    const next = withColor(seats, 0, seats[1].color)
    expect(next[0].color).toBe(seats[1].color)
    expect(next[1].color).toBe(seats[0].color)
    expect(new Set(next.map((s) => s.color)).size).toBe(next.length)
  })

  it('fills empty names and drops the AI level for humans', () => {
    const blank = seats.map((s) => ({ ...s, name: ' ' }))
    expect(toSeatSetups(blank, 2)).toEqual([
      { name: 'Player 1', isAI: false, color: seats[0].color },
      { name: AI_NAMES[0], isAI: true, aiLevel: 'normal', color: seats[1].color },
    ])
  })

  it('rejects saved seats with a repeated colour', () => {
    expect(parseSavedSetup({ count: 3, seats: seats.map((s) => ({ ...s, color: 'red' })) })).toBeUndefined()
    expect(parseSavedSetup({ count: 9, seats })).toEqual({ count: 4, seats })
  })
})
