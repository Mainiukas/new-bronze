import { describe, expect, it } from 'vitest'
import { DEFAULT_GAME_MODE_ID, GAME_MODES, isPlayableModeId } from '../../data/gameModes'
import { DEFAULT_MAP_ID, isPlayableMapId, MAPS } from '../../data/maps'
import { TIME_CONTROL } from '../../rules/config/game'
import { clockLevel, clockNow, formatClock, ringShare } from './clock'

describe('chess clocks', () => {
  it('shows m:ss, and h:mm:ss from an hour, never below 0:00', () => {
    expect(formatClock(TIME_CONTROL.normal.baseMs)).toBe('20:00')
    expect(formatClock(30_000)).toBe('0:30')
    expect(formatClock(59_001)).toBe('1:00')
    expect(formatClock(3_725_000)).toBe('1:02:05')
    expect(formatClock(-5_000)).toBe('0:00')
  })

  it('Normal is 20 minutes plus 20 seconds a turn (from the config)', () => {
    expect(TIME_CONTROL.normal).toEqual({ baseMs: 20 * 60_000, incrementMs: 20_000 })
  })

  it('turns amber under 2:00 and red under 0:30', () => {
    expect(clockLevel(120_000)).toBe('normal')
    expect(clockLevel(119_999)).toBe('low')
    expect(clockLevel(30_000)).toBe('low')
    expect(clockLevel(29_999)).toBe('critical')
  })

  it('counts down only on the player’s own turn, and not before it starts (scoring pause); the ring never overfills', () => {
    expect(clockNow(600_000, true, 1_000, 61_000)).toBe(540_000)
    expect(clockNow(600_000, false, 1_000, 61_000)).toBe(600_000)
    expect(clockNow(600_000, true, 10_000, 5_000)).toBe(600_000)
    expect(ringShare({ ms: 1_210_000, total: 1_200_000, running: true, timeouts: 0 })).toBe(1)
    expect(ringShare({ ms: 300_000, total: 1_200_000, running: true, timeouts: 0 })).toBe(0.25)
  })
})

describe('what can be picked', () => {
  it('only Normal is playable; Blitz and Bullet are shown as coming soon', () => {
    expect(GAME_MODES.filter((m) => m.playable).map((m) => m.id)).toEqual(['normal'])
    expect(isPlayableModeId(DEFAULT_GAME_MODE_ID)).toBe(true)
    expect(isPlayableModeId('blitz')).toBe(false)
    expect(isPlayableModeId('bullet')).toBe(false)
  })

  it('only the painted map is playable', () => {
    expect(MAPS.filter((m) => isPlayableMapId(m.id)).map((m) => m.id)).toEqual([DEFAULT_MAP_ID])
  })
})
