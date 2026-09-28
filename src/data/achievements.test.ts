import { describe, expect, it } from 'vitest'
import { EMPTY_STATS, hasProgress, latestStats, mergeStats, type PlayerStats } from './achievements'

const guest: PlayerStats = {
  matches: 3,
  wins: 1,
  bestScore: 40,
  goodsShipped: 12,
  mapsPlayed: ['wales-and-the-west'],
  unlocked: { 'first-shift': '2026-09-01T10:00:00.000Z', foreman: '2026-09-02T10:00:00.000Z' },
}
const account: PlayerStats = {
  matches: 5,
  wins: 2,
  bestScore: 38,
  goodsShipped: 20,
  mapsPlayed: ['wales-and-the-west', 'mersey-valley'],
  unlocked: { 'first-shift': '2026-08-20T10:00:00.000Z', 'quick-draw': '2026-08-21T10:00:00.000Z' },
}

describe('moving stats into an account', () => {
  it('adds up two separate records and keeps every achievement at its earliest date', () => {
    expect(mergeStats(account, guest)).toEqual({
      matches: 8,
      wins: 3,
      bestScore: 40,
      goodsShipped: 32,
      mapsPlayed: ['wales-and-the-west', 'mersey-valley'],
      unlocked: {
        'first-shift': '2026-08-20T10:00:00.000Z',
        'quick-draw': '2026-08-21T10:00:00.000Z',
        foreman: '2026-09-02T10:00:00.000Z',
      },
    })
  })

  it('takes the newer of two copies of one record without double counting', () => {
    const unsaved = { ...account, matches: 6, wins: 3, unlocked: { ...account.unlocked, foreman: '2026-09-03T10:00:00.000Z' } }
    expect(latestStats(account, unsaved)).toMatchObject({ matches: 6, wins: 3, goodsShipped: 20 })
    expect(latestStats(account, account)).toEqual(account)
  })

  it('only counts finished matches or achievements as progress', () => {
    expect(hasProgress(EMPTY_STATS)).toBe(false)
    expect(hasProgress(guest)).toBe(true)
    expect(hasProgress({ ...EMPTY_STATS, unlocked: { 'first-shift': 'x' } })).toBe(true)
  })
})
