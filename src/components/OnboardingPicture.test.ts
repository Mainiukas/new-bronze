import { describe, expect, it } from 'vitest'
import { isUpscaled } from '../lib/imageSizeCheck'
import { PICTURE_WIDTH, pictureFallback, pictureSrcSet, type OnboardingPictureName } from '../lib/onboardingPictures'

describe('onboarding pictures', () => {
  it('have WebP at 600, 1200 and full width, and the JPEG fallback (npm run images)', () => {
    for (const name of Object.keys(PICTURE_WIDTH) as OnboardingPictureName[]) {
      const set = pictureSrcSet(name)
      expect(set, name).not.toContain('undefined')
      expect(set).toMatch(/ 600w, .* 1200w, .* 1[56]\d\dw$/)
      expect(pictureFallback(name), name).toBeTruthy()
    }
  })

  it('the dev warning flags a picture shown larger than its pixels', () => {
    expect(isUpscaled(600, 320, 2)).toBe(true)
    expect(isUpscaled(1200, 320, 2)).toBe(false)
    expect(isUpscaled(640, 320, 2)).toBe(false)
    expect(isUpscaled(0, 320, 2)).toBe(false)
  })
})
