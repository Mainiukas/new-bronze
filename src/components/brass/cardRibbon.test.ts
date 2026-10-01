import { describe, expect, it } from 'vitest'
import { buildDeck, faceOf } from '../../rules/config/cards'
import { BRASS_MAP } from '../../rules/map'
import { CARD_TEXT, contrast, fitName, NAME_MAX_PX, NAME_MIN_PX, nameLines, REGION_FACES, regionOf, RIBBON_BOTTOM, RIBBON_COLORS, RIBBON_MIN_H, ribbonAt, ribbonTop, type Region } from './cardRibbon'

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

  it('break names of several words (or with hyphens) onto two lines; single words stay on one', () => {
    expect(nameLines('Merthyr Tydfil')).toEqual(['Merthyr', 'Tydfil'])
    expect(nameLines('Stoke-on-Trent')).toEqual(['Stoke-on-', 'Trent'])
    expect(nameLines('Cotton Mill')).toEqual(['Cotton', 'Mill'])
    expect(nameLines('Iron Works')).toEqual(['Iron', 'Works'])
    expect(nameLines('Coal Mine')).toEqual(['Coal', 'Mine'])
    for (const word of ['Wolverhampton', 'Southampton', 'Birmingham', 'Gloucester', 'Nottingham', 'Carmarthen', 'Caernarfon', 'Barnstaple', 'Port']) expect(nameLines(word)).toEqual([word])
  })

  it('fit: full size when there is room, smaller for long names, never wider than the space', () => {
    // A name 8 px wide at 1 px, in 140 px: capped at 14 px.
    expect(fitName(8, 140)).toEqual({ size: NAME_MAX_PX, belowMin: false })
    // 9 px wide at 1 px in 108 px: 12 px.
    expect(fitName(9, 108).size).toBeCloseTo(12)
    // Wolverhampton (9.53 at 1 px) on a hand-size card (88 px of ribbon): 9.2 px, not below 9.
    expect(fitName(9.53, 88).size).toBeGreaterThanOrEqual(NAME_MIN_PX)
    // Too long even at 9 px: smaller still, but it fits (never narrowed, never overflowing).
    const tight = fitName(10, 80)
    expect(tight.belowMin).toBe(true)
    expect(tight.size * 10).toBeCloseTo(80)
  })

  it('grow the ribbon upwards for a second line', () => {
    const one = ribbonTop(1, 14, 130)
    const two = ribbonTop(2, 14, 130)
    expect(RIBBON_BOTTOM - one).toBe(RIBBON_MIN_H)
    // Two 14 px lines (line height 1) on a 130 px card: 64.6 card units of text, plus padding.
    expect(RIBBON_BOTTOM - two).toBeGreaterThan((2 * 14 * 300) / 130)
    expect(two).toBeLessThan(one)
  })
})
