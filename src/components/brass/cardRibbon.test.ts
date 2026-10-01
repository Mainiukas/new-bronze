import { describe, expect, it } from 'vitest'
import { buildDeck, faceOf } from '../../rules/config/cards'
import { BRASS_MAP } from '../../rules/map'
import { CARD_TEXT, contrast, fitName, NAME_MAX_PX, NAME_MIN_PX, REGION_FACES, regionOf, RIBBON_COLORS, ribbonAt, type Region } from './cardRibbon'

describe('card names', () => {
  it('pass WCAG AA (4.5:1) against every point of every ribbon', () => {
    for (const region of Object.keys(RIBBON_COLORS) as Region[]) {
      for (let t = 0; t <= 1; t += 0.05) expect(contrast(CARD_TEXT, ribbonAt(region, t)), `${region} at ${t.toFixed(2)}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('know every location card’s region (and industries are industry)', () => {
    for (const card of buildDeck(BRASS_MAP, 4)) if (card.kind === 'location') expect(REGION_FACES, faceOf(card)).toContain(faceOf(card))
    expect(regionOf('loc_merthyr_tydfil#1')).toBe('wales')
    expect(regionOf('loc_southampton#2')).toBe('west')
    expect(regionOf('industry_coal_mine#3')).toBe('industry')
  })

  it('fit on one line: full size when there is room, smaller for long names, never below 10 px (narrowed instead)', () => {
    // A name 8 px wide at 1 px, in 140 px: capped at 14 px.
    expect(fitName(8, 140)).toEqual({ size: NAME_MAX_PX, scaleX: 1 })
    // 9 px wide at 1 px in 108 px: 12 px.
    expect(fitName(9, 108).size).toBeCloseTo(12)
    // Too long even at 10 px: 10 px, narrowed to fit exactly.
    const tight = fitName(10, 80)
    expect(tight.size).toBe(NAME_MIN_PX)
    expect(tight.size * 10 * tight.scaleX).toBeCloseTo(80)
  })
})
